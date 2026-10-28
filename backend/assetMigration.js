import { Asset } from './models/Asset.js';
import { SetupMaster } from './models/SetupMaster.js';
import { SetupItem } from './models/SetupItem.js';
import { Project } from './models/Project.js';
import { Supplier } from './models/Supplier.js';
import { Movement } from './models/Movement.js';
import { Inspection } from './models/Inspection.js';
import { Return } from './models/Return.js';
import { assetRelations, initializeAssetCatalog } from './assetCatalog.js';
import { nextSetupCode } from './setup.js';

const real = (value) => typeof value === 'string' && value.trim() && !['not recorded', 'not specified', 'no files', 'unknown', 'n/a'].includes(value.trim().toLowerCase());

export async function previewAssetMigration() {
  const rows = await Asset.collection.find({}, { projection: { code: 1 } }).toArray();
  const codes = new Map();
  const conflicts = [];
  for (const row of rows) {
    const code = String(row.code || '').trim().toUpperCase();
    if (!code || codes.has(code)) conflicts.push({ _id: row._id, code, reason: !code ? 'Missing code' : 'Duplicate normalized code' });
    codes.set(code, row._id);
  }
  return { total: rows.length, conflicts, missingRelations: await Asset.collection.countDocuments({ $or: Object.keys(assetRelations).filter((field) => field !== 'warrantyId').concat('project_id').map((field) => ({ [field]: { $exists: false } })) }) };
}

export async function migrateAssets() {
  const preview = await previewAssetMigration();
  if (preview.conflicts.length) throw new Error('Asset code conflicts must be resolved before migration. Run the preview.');
  await initializeAssetCatalog();
  await Promise.all([SetupItem.createIndexes(), SetupMaster.createIndexes(), Project.createIndexes()]);
  const report = { total: preview.total, mapped: 0, unresolved: [] };
  for await (const row of Asset.collection.find().sort({ _id: 1 })) {
    const update = { code: String(row.code).trim().toUpperCase() };
    if (row.isActive === undefined) update.isActive = true;
    if (row.__v === undefined) update.__v = 0;
    if (typeof row.attachments === 'string') { update.legacyAttachments = real(row.attachments) ? row.attachments : ''; update.attachments = []; }
    for (const [field, [masterName, label]] of Object.entries(assetRelations)) {
      if (row[field]) continue;
      const value = row[label];
      if (!real(value)) {
        if (field !== 'warrantyId') report.unresolved.push({ _id: row._id, field, reason: 'No real legacy value' });
        continue;
      }
      const master = await SetupMaster.findOne({ name: masterName, isActive: true });
      if (!master) { report.unresolved.push({ _id: row._id, field, reason: 'Master inactive' }); continue; }
      let item = await SetupItem.findOne({ parentId: master._id, normalizedName: value.trim().toLowerCase(), isActive: true });
      if (!item) {
        try { item = await SetupItem.create({ name: value.trim(), parentId: master._id, code: await nextSetupCode() }); }
        catch (error) {
          if (error.code !== 11000) throw error;
          item = await SetupItem.findOne({ parentId: master._id, normalizedName: value.trim().toLowerCase(), isActive: true });
        }
      }
      update[field] = item._id;
      if (field === 'statusId') update.statusKey = item.systemKey?.replace('asset:', '') || '';
    }
    if (!row.project_id && real(row.project)) {
      let project = await Project.findOne({ name: row.project.trim() });
      if (!project) project = await Project.create({ name: row.project.trim() });
      update.project_id = project._id;
    } else if (!row.project_id) report.unresolved.push({ _id: row._id, field: 'project_id', reason: 'No real legacy value' });
    if (!row.supplierId && real(row.supplier)) {
      const suppliers = await Supplier.find({ companyName: row.supplier.trim(), isActive: true });
      if (suppliers.length === 1) update.supplierId = suppliers[0]._id;
      else report.unresolved.push({ _id: row._id, field: 'supplierId', reason: 'No unambiguous active supplier; email is not fabricated' });
    }
    await Asset.collection.updateOne({ _id: row._id }, { $set: update, $unset: { ownerEmail: '' } });
    report.mapped++;
  }
  for (const model of [Asset, Movement, Inspection, Return]) {
    const exists = await model.db.db.listCollections({ name: model.collection.name }).hasNext();
    if (!exists) continue;
    await model.collection.updateMany({}, { $unset: { ownerEmail: '' } });
    for (const index of await model.collection.indexes()) if (Object.hasOwn(index.key, 'ownerEmail')) await model.collection.dropIndex(index.name);
  }
  await Asset.collection.createIndex({ code: 1 }, { unique: true, name: 'asset_code_case_insensitive', collation: { locale: 'en', strength: 2 } });
  return report;
}
