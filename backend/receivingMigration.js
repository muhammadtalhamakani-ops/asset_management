import mongoose from 'mongoose';

const normalize = (value) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const placeholders = new Set(['', '-', 'unknown', 'not recorded', 'n/a', 'none', 'null', 'undefined', 'unassigned']);

export function planReceivingBackfill(movements, suppliers, projects) {
  const catalogs = [
    { field: 'supplierId', label: 'supplier', name: 'companyName', rows: suppliers },
    { field: 'project_id', label: 'project', name: 'name', rows: projects },
  ].map((catalog) => {
    const byName = new Map();
    for (const row of catalog.rows) {
      const key = normalize(row[catalog.name]);
      if (!placeholders.has(key)) byName.set(key, [...(byName.get(key) || []), row]);
    }
    return { ...catalog, byName, ids: new Set(catalog.rows.map((row) => String(row._id))) };
  });
  const report = { total: 0, supplierMappings: 0, projectMappings: 0, changes: [], unresolved: [] };
  for (const movement of movements) {
    if (movement.type !== 'receive') continue;
    report.total++;
    const fields = {};
    for (const catalog of catalogs) {
      if (movement[catalog.field]) {
        if (!catalog.ids.has(String(movement[catalog.field]))) report.unresolved.push({ movementId: movement._id, field: catalog.field, reason: 'Existing reference is missing from catalog; preserved.' });
        continue;
      }
      const name = normalize(movement[catalog.label]);
      const matches = placeholders.has(name) ? [] : catalog.byName.get(name) || [];
      if (matches.length === 1) {
        fields[catalog.field] = matches[0]._id;
        report[catalog.field === 'supplierId' ? 'supplierMappings' : 'projectMappings']++;
      } else report.unresolved.push({ movementId: movement._id, field: catalog.field, label: movement[catalog.label] || '', reason: matches.length > 1 ? 'Ambiguous name.' : 'No real unique catalog match.' });
    }
    if (Object.keys(fields).length) report.changes.push({ _id: movement._id, fields });
  }
  return report;
}

export async function migrateReceiving({ apply = false } = {}) {
  // Do not import models here: schema-level autoCreate can override connection
  // settings and create collections even during a supposedly read-only preview.
  const db = mongoose.connection.db;
  if (!db) throw new Error('A database connection is required.');
  const movementCollection = db.collection('movements');
  const [movements, suppliers, projects] = await Promise.all([
    movementCollection.find({ type: 'receive' }, { projection: { type: 1, supplier: 1, project: 1, supplierId: 1, project_id: 1 } }).toArray(),
    db.collection('suppliers').find({}, { projection: { companyName: 1 } }).toArray(),
    db.collection('projects').find({}, { projection: { name: 1 } }).toArray(),
  ]);
  const report = planReceivingBackfill(movements, suppliers, projects);
  const originals = new Map(movements.map((row) => [String(row._id), row]));
  let applied = 0;
  if (apply) {
    for (const change of report.changes) {
      for (const [field, value] of Object.entries(change.fields)) {
        const original = originals.get(String(change._id));
        const label = field === 'supplierId' ? 'supplier' : 'project';
        // Do not overwrite a reference or label changed since the preview read.
        const result = await movementCollection.updateOne({ _id: change._id, type: 'receive', [field]: null, [label]: original[label] ?? null }, { $set: { [field]: value } });
        applied += result.modifiedCount;
      }
    }
  }
  return { mode: apply ? 'apply' : 'preview', ...report, appliedFields: applied };
}
