import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import express from 'express';
import { Asset } from '../models/Asset.js';
import { Supplier } from '../models/Supplier.js';
import { Project } from '../models/Project.js';
import { Movement } from '../models/Movement.js';
import { initializeAssetCatalog, setAssetStatus } from '../assetCatalog.js';
import { planReceivingBackfill, migrateReceiving } from '../receivingMigration.js';
import { createSessionToken } from '../middleware/auth.js';
import movementRoutes from '../routes/movementRoutes.js';

test('receiving references are optional for legacy records and point to real models', () => {
  assert.equal(Movement.schema.path('assetId').options.ref, 'Asset');
  assert.equal(Movement.schema.path('supplierId').options.ref, 'Supplier');
  assert.equal(Movement.schema.path('project_id').options.ref, 'Project');
  assert.equal(Movement.schema.path('supplierId').isRequired, undefined);
});

test('backfill plans unique historical matches without mutation or fabricated catalogs', () => {
  const suppliers = [{ _id: 's1', companyName: ' Vendor ', isActive: false }, { _id: 's2', companyName: 'Duplicate' }, { _id: 's3', companyName: 'duplicate' }];
  const projects = [{ _id: 'p1', name: 'Old site', isActive: false }];
  const movements = [
    { _id: 'm1', type: 'receive', supplier: 'vendor', project: ' OLD SITE ' },
    { _id: 'm2', type: 'receive', supplier: 'Duplicate', project: 'Unknown' },
    { _id: 'm3', type: 'receive', supplierId: 's1', project_id: 'p1', supplier: 'Different label', project: 'Different site' },
    { _id: 'm4', type: 'receive', supplier: '-', project: 'Missing site' },
    { _id: 'm5', type: 'issue', supplier: 'vendor', project: 'Old site' },
    { _id: 'm6', type: 'receive', supplierId: 'deleted', project_id: 'p1' },
  ];
  const original = structuredClone({ movements, suppliers, projects });
  const report = planReceivingBackfill(movements, suppliers, projects);
  assert.equal(report.total, 5);
  assert.equal(report.supplierMappings, 1);
  assert.equal(report.projectMappings, 1);
  assert.deepEqual(report.changes, [{ _id: 'm1', fields: { supplierId: 's1', project_id: 'p1' } }]);
  assert.ok(report.unresolved.some((row) => row.reason === 'Ambiguous name.'));
  assert.ok(report.unresolved.some((row) => row.reason.includes('preserved')));
  assert.deepEqual({ movements, suppliers, projects }, original);
  const linked = movements.map((row) => row._id === 'm1' ? { ...row, ...report.changes[0].fields } : row);
  assert.equal(planReceivingBackfill(linked, suppliers, projects).changes.length, 0);
});

const uri = process.env.RECEIVING_TEST_MONGODB_URI;
test('receiving relations, fixed project, shared access and safe backfill', { skip: !uri && 'Set explicit RECEIVING_TEST_MONGODB_URI for an isolated disposable database.' }, async (t) => {
  let server;
  try {
    await mongoose.connect(uri, { dbName: `fs_receiving_${Date.now()}_${process.pid}`, serverSelectionTimeoutMS: 10000 });
    await initializeAssetCatalog();
    const project = await Project.create({ name: 'Receiving site' });
    const otherProject = await Project.create({ name: 'Other site' });
    const supplier = await Supplier.create({ code: '000001', companyName: 'Vendor', email: 'vendor@example.test' });
    const alternative = await Supplier.create({ code: '000002', companyName: 'Alternative', email: 'other@example.test' });
    const asset = await Asset.create({ code: 'RECEIVE-1', name: 'Asset', category: 'Category', department: 'Department', project_id: project._id, project: project.name, supplierId: supplier._id, supplier: supplier.companyName, location: 'Store', quantity: 1, minimum: 2, unitCost: 5, unit: 'unit', purchaseDate: '2026-10-25', receiveDate: '2026-10-26', statusKey: 'lowStock' });
    await setAssetStatus(asset, 'lowStock');
    await asset.save();
    const app = express(); app.use(express.json()); app.use('/api', movementRoutes);
    server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const tokens = ['a@example.test', 'b@example.test'].map((email) => createSessionToken({ email }));
    async function request(url, method = 'GET', body, token = tokens[0]) {
      const response = await fetch(`${base}${url}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, ...await response.json() };
    }
    const payload = { assetId: String(asset._id), supplierId: String(alternative._id), quantity: 2, grn: ' GRN-1 ', billNo: ' BILL-1 ', recordedBy: 'Tester', remarks: ' Note ' };
    let movement;
    await t.test('required data and invalid/inactive relations do not change stock', async () => {
      assert.equal((await request('/movements/receive', 'POST', payload, '')).status, 401);
      for (const change of [{ assetId: 'bad' }, { assetCode: 'WRONG' }, { supplierId: 'bad' }, { supplierId: String(new mongoose.Types.ObjectId()) }, { project_id: String(otherProject._id) }, { project: otherProject.name }, { quantity: 0 }, { quantity: -1 }, { quantity: '2' }, { grn: '' }, { billNo: ' ' }, { recordedBy: '' }]) {
        assert.equal((await request('/movements/receive', 'POST', { ...payload, ...change })).status, 400, JSON.stringify(change));
      }
      await Project.updateOne({ _id: project._id }, { $set: { isActive: false } });
      assert.equal((await request('/movements/receive', 'POST', payload)).status, 400);
      await Project.updateOne({ _id: project._id }, { $set: { isActive: true } });
      await Asset.updateOne({ _id: asset._id }, { $unset: { project_id: '' } });
      assert.equal((await request('/movements/receive', 'POST', payload)).status, 400);
      await Asset.updateOne({ _id: asset._id }, { $set: { project_id: new mongoose.Types.ObjectId() } });
      assert.equal((await request('/movements/receive', 'POST', payload)).status, 400);
      await Asset.updateOne({ _id: asset._id }, { $set: { project_id: project._id } });
      await Supplier.updateOne({ _id: alternative._id }, { $set: { isActive: false } });
      assert.equal((await request('/movements/receive', 'POST', payload)).status, 400);
      await Supplier.updateOne({ _id: alternative._id }, { $set: { isActive: true } });
      await Asset.updateOne({ _id: asset._id }, { $set: { isActive: false } });
      assert.equal((await request('/movements/receive', 'POST', payload)).status, 404);
      await Asset.updateOne({ _id: asset._id }, { $set: { isActive: true } });
      assert.equal(await Movement.countDocuments(), 0);
      assert.equal((await Asset.findById(asset._id)).quantity, 1);
    });
    await t.test('shared receiving saves IDs and server-derived fields with stock/status effects', async () => {
      const result = await request('/movements/receive', 'POST', { ...payload, unit: 'kg', toLocation: 'Spoofed', assetName: 'Spoofed', ownerEmail: 'spoofed' }, tokens[1]);
      assert.equal(result.status, 201);
      movement = result.data;
      assert.equal(movement.assetId, String(asset._id));
      assert.equal(movement.supplierId, String(alternative._id));
      assert.equal(movement.project_id, String(project._id));
      assert.equal(movement.supplier, alternative.companyName);
      assert.equal(movement.project, project.name);
      assert.equal(movement.unit, 'unit');
      assert.equal(movement.toLocation, 'Store');
      assert.equal(movement.grn, 'GRN-1');
      assert.equal(movement.billNo, 'BILL-1');
      assert.equal(movement.remarks, 'Note');
      assert.equal(movement.ownerEmail, undefined);
      assert.equal(result.asset.quantity, 3);
      assert.equal(result.asset.value, 'AED 15');
      assert.equal(result.asset.statusKey, 'available');
      assert.equal(result.asset.supplierId, String(supplier._id));
      assert.equal((await request('/movements')).data[0]._id, movement._id);
      assert.equal((await request(`/movements/${movement._id}`, 'PUT', { remarks: 'Shared edit' })).status, 200);
      for (const change of [{ project: otherProject.name }, { project_id: String(otherProject._id) }, { supplierId: String(supplier._id) }, { assetId: String(asset._id) }]) assert.equal((await request(`/movements/${movement._id}`, 'PUT', change)).status, 400);
    });
    await t.test('legacy code/name compatibility, fallback supplier and duplicate supplier ambiguity', async () => {
      assert.equal((await request('/movements/receive', 'POST', { ...payload, assetId: undefined, assetCode: ' receive-1 ', supplierId: undefined, supplier: 'vendor' })).status, 201);
      assert.equal((await request('/movements/receive', 'POST', { ...payload, supplierId: undefined })).data.supplierId, String(supplier._id));
      await Supplier.create({ code: '000003', companyName: 'Vendor', email: 'duplicate@example.test' });
      assert.equal((await request('/movements/receive', 'POST', { ...payload, supplierId: undefined, supplier: 'Vendor' })).status, 400);
      assert.equal((await request('/movements/receive', 'POST', { ...payload, supplierId: undefined, supplier: 'Missing' })).status, 400);
    });
    await t.test('resolved labels refresh while missing/inactive historical refs retain snapshots', async () => {
      await Supplier.updateOne({ _id: alternative._id }, { $set: { companyName: 'Renamed supplier' } });
      await Project.updateOne({ _id: project._id }, { $set: { name: 'Renamed site' } });
      const refreshed = (await request(`/movements/${movement._id}`)).data;
      assert.equal(refreshed.supplier, 'Renamed supplier');
      assert.equal(refreshed.project, 'Renamed site');
      await Supplier.updateOne({ _id: alternative._id }, { $set: { isActive: false } });
      await Project.deleteOne({ _id: project._id });
      const historical = (await request(`/movements/${movement._id}`)).data;
      assert.equal(historical.supplier, 'Alternative');
      assert.equal(historical.project, 'Receiving site');
    });
    await t.test('preview is read-only and apply is repeatable with inactive/ambiguous records', async () => {
      const oldProject = await Project.create({ name: 'Old project', isActive: false });
      const oldId = new mongoose.Types.ObjectId();
      await Movement.collection.insertOne({ _id: oldId, type: 'receive', supplier: 'Alternative', project: 'Old project' });
      const ambiguousId = new mongoose.Types.ObjectId();
      await Movement.collection.insertOne({ _id: ambiguousId, type: 'receive', supplier: 'Vendor', project: 'unknown' });
      // Supplier's historical name matches even while inactive.
      await Supplier.updateOne({ _id: alternative._id }, { $set: { companyName: 'Alternative' } });
      const before = await Movement.collection.findOne({ _id: oldId });
      const preview = await migrateReceiving();
      assert.equal(preview.mode, 'preview');
      assert.deepEqual(await Movement.collection.findOne({ _id: oldId }), before);
      assert.ok(preview.unresolved.some((row) => String(row.movementId) === String(ambiguousId) && row.reason === 'Ambiguous name.'));
      const applied = await migrateReceiving({ apply: true });
      assert.ok(applied.appliedFields >= 2);
      const linked = await Movement.collection.findOne({ _id: oldId });
      assert.equal(String(linked.supplierId), String(alternative._id));
      assert.equal(String(linked.project_id), String(oldProject._id));
      assert.equal(linked.supplier, 'Alternative');
      assert.equal((await migrateReceiving({ apply: true })).appliedFields, 0);
      assert.equal((await Movement.collection.findOne({ _id: ambiguousId })).supplierId, undefined);
    });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    try { if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase(); }
    finally { await mongoose.disconnect(); }
  }
});
