import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import express from 'express';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Asset } from '../models/Asset.js';
import { assetData } from '../assetCatalog.js';
import { SetupMaster } from '../models/SetupMaster.js';
import { SetupItem } from '../models/SetupItem.js';
import { Supplier } from '../models/Supplier.js';
import { Movement } from '../models/Movement.js';
import { Inspection } from '../models/Inspection.js';
import { Return } from '../models/Return.js';
import { previewAssetMigration, migrateAssets } from '../assetMigration.js';
import { createSessionToken } from '../middleware/auth.js';

const uploadDirectory = await mkdtemp(path.join(tmpdir(), 'fieldstock-assets-'));
process.env.ASSET_UPLOAD_DIR = uploadDirectory;
const { default: assetRoutes } = await import('../routes/assetRoutes.js');
const { default: movementRoutes } = await import('../routes/movementRoutes.js');
const { default: inspectionRoutes } = await import('../routes/inspectionRoutes.js');
const { default: returnRoutes } = await import('../routes/returnRoutes.js');
const { default: setupRoutes } = await import('../routes/setupRoutes.js');
after(async () => { await rm(uploadDirectory, { recursive: true, force: true }); });

test('asset defaults and schema reject invalid stock', async () => {
  const asset = new Asset({ code: ' a-1 ', name: 'Asset', category: 'Category', department: 'Department', location: 'Site', purchaseDate: '2026-10-25', receiveDate: '2026-10-25' });
  await asset.validate();
  assert.equal(asset.code, 'A-1');
  assert.equal(asset.quantity, 1);
  assert.equal(asset.unit, 'unit');
  assert.equal(asset.isActive, true);
  assert.equal(Asset.schema.path('ownerEmail'), undefined);
  asset.quantity = -1;
  await assert.rejects(asset.validate());
});

test('supplier contact resolves from linked phone with a missing-value fallback', async () => {
  const supplierId = new mongoose.Types.ObjectId();
  const asset = { supplierId, supplier: 'Legacy vendor', deliveryNote: 'DN-001', attachments: [] };
  const lookups = { suppliers: new Map([[String(supplierId), { companyName: 'Current vendor', phone: ' +92 300 1234567 ' }]]) };
  assert.equal((await assetData(asset, lookups)).supplierContact, '+92 300 1234567');
  assert.equal((await assetData(asset, lookups)).supplier, 'Current vendor');
  lookups.suppliers.set(String(supplierId), { companyName: 'Current vendor', phone: '' });
  assert.equal((await assetData(asset, lookups)).supplierContact, '');
  lookups.suppliers.clear();
  assert.equal((await assetData(asset, lookups)).supplierContact, '');
  assert.equal((await assetData({ attachments: [] })).supplierContact, '');
});

const uri = process.env.ASSET_TEST_MONGODB_URI;
test('asset relations, shared workflows, migration and uploads', { skip: !uri && 'Set explicit ASSET_TEST_MONGODB_URI for isolated integration tests.' }, async (t) => {
  let server;
  try {
    await mongoose.connect(uri, { dbName: `fs_asset_${Date.now()}_${process.pid}`, serverSelectionTimeoutMS: 10000 });
    const legacyId = new mongoose.Types.ObjectId();
    await Asset.collection.insertOne({ _id: legacyId, code: 'legacy-1', name: 'Legacy', type: 'Material', serial: 'Old serial', category: 'Machinery', department: 'Site', manufacturer: 'CAT', model: '320', warranty: '24 months', status: 'Available', unit: 'units', quantity: 10, minimum: 2, unitCost: 5, value: 'AED 50', project: 'Old project', location: 'Store', purchaseDate: new Date('2026-10-25'), receiveDate: new Date('2026-10-25'), attachments: 'old.pdf', ownerEmail: 'old@example.test' });
    assert.equal((await previewAssetMigration()).total, 1);
    const firstMigration = await migrateAssets();
    assert.equal(firstMigration.total, 1);
    const first = await Asset.findById(legacyId);
    const refs = Object.fromEntries(['categoryId', 'departmentId', 'makeId', 'modelId', 'warrantyId', 'statusId', 'project_id'].map((key) => [key, String(first[key])]));
    const payload = { deliveryNote: ' DN-001 ', ...refs, code: 'NEW-1', name: 'New asset', quantity: 10, minimum: 2, unit: 'unit', unitCost: 5, location: 'Store', purchaseDate: '2026-10-25', receiveDate: '2026-10-26' };
    const app = express();
    app.use(express.json());
    for (const router of [assetRoutes, movementRoutes, inspectionRoutes, returnRoutes, setupRoutes]) app.use('/api', router);
    server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const tokens = ['a@example.test', 'b@example.test'].map((email) => createSessionToken({ email }));
    async function request(url, method = 'GET', body, token = tokens[0]) {
      const response = await fetch(`${base}${url}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) });
      return { status: response.status, ...await response.json() };
    }
    function multipart(data, count = 1, mime = 'application/pdf', extension = 'pdf', size = 20) {
      const form = new FormData(); form.set('data', JSON.stringify(data));
      for (let i = 0; i < count; i++) form.append('files', new Blob([new Uint8Array(size)], { type: mime }), `test${i}.${extension}`);
      return form;
    }
    let created;
    await t.test('migration is idempotent, preserves IDs/legacy files and maps relations', async () => {
      assert.equal(first.serial, 'Old serial');
      assert.equal(first.legacyAttachments, 'old.pdf');
      assert.equal(first.attachments.length, 0);
      assert.equal(first.isActive, true);
      assert.equal((await Asset.collection.findOne({ _id: legacyId })).ownerEmail, undefined);
      const count = await SetupItem.countDocuments();
      await migrateAssets();
      assert.equal(await SetupItem.countDocuments(), count);
      for (const [key, id] of Object.entries(refs)) assert.equal(String((await Asset.findById(legacyId))[key]), id);
    });
    await t.test('authentication, required fields, dates and wrong-master references', async () => {
      assert.equal((await request('/assets', 'GET', undefined, '')).status, 401);
      for (const change of [{ deliveryNote: undefined }, { deliveryNote: '' }, { deliveryNote: '   ' }, { deliveryNote: null }, { code: '' }, { name: '' }, { categoryId: refs.departmentId }, { makeId: 'bad' }, { project_id: 'bad' }, { purchaseDate: '2026-02-30' }, { quantity: -1 }, { quantity: 0 }, { unit: '' }, { unit: 'bad' }]) {
        assert.equal((await request('/assets', 'POST', { ...payload, ...change })).status, 400, JSON.stringify(change));
      }
      const master = await SetupMaster.findOne({ name: 'Make' });
      await SetupMaster.updateOne({ _id: master._id }, { $set: { isActive: false } });
      assert.equal((await request('/assets', 'POST', payload)).status, 400);
      await SetupMaster.updateOne({ _id: master._id }, { $set: { isActive: true } });
    });
    await t.test('create uses IDs, labels, active default and shared reads', async () => {
      const supplier = await Supplier.create({ code: '000001', companyName: 'Vendor', email: 'vendor@example.test' });
      created = await request('/assets', 'POST', { ...payload, supplierId: String(supplier._id), isActive: false, ownerEmail: 'spoofed' });
      assert.equal(created.status, 201);
      assert.equal(created.data.isActive, true);
      assert.equal(created.data.categoryId, refs.categoryId);
      assert.equal(created.data.supplier, 'Vendor');
      assert.equal(created.data.supplierContact, '');
      assert.equal(created.data.deliveryNote, 'DN-001');
      await Supplier.updateOne({ _id: supplier._id }, { $set: { phone: '+92 300 1234567' } });
      assert.equal((await request(`/assets/${created.data._id}`)).data.supplierContact, '+92 300 1234567');
      assert.equal(created.data.ownerEmail, undefined);
      assert.ok((await request('/assets', 'GET', undefined, tokens[1])).data.some((row) => row._id === created.data._id));
      const codes = await Promise.all([1, 2].map(() => request('/assets', 'POST', { ...payload, code: 'DUPLICATE' })));
      assert.deepEqual(codes.map((row) => row.status).sort(), [201, 409]);
      assert.equal((await request('/assets', 'POST', { ...payload, code: 'duplicate' })).status, 409);
    });
    await t.test('edit preserves code and validates new inactive selections', async () => {
      const updated = await request(`/assets/${created.data._id}`, 'PUT', { ...payload, code: 'REPLACED', name: 'Edited', isActive: false }, tokens[1]);
      assert.equal(updated.status, 200);
      assert.equal(updated.data.deliveryNote, 'DN-001');
      assert.equal(updated.data.code, 'NEW-1');
      assert.equal(updated.data.name, 'Edited');
      assert.equal(updated.data.isActive, true);
      await SetupItem.updateOne({ _id: refs.warrantyId }, { $set: { isActive: false } });
      assert.equal((await request('/assets', 'POST', { ...payload, code: 'INACTIVE-REF' })).status, 400);
      assert.equal((await request(`/assets/${created.data._id}`, 'PUT', payload)).status, 200);
      await SetupItem.updateOne({ _id: refs.warrantyId }, { $set: { isActive: true } });
    });
    await t.test('multiple uploads, authenticated download, removal, limits and failed-save cleanup', async () => {
      const before = (await readdir(uploadDirectory)).length;
      const failed = await request('/assets', 'POST', multipart({ ...payload, code: 'FAILED-UPLOAD', name: '' }));
      assert.equal(failed.status, 400);
      assert.equal((await readdir(uploadDirectory)).length, before);
      assert.equal((await request('/assets', 'POST', multipart({ ...payload, code: 'BAD-FILE' }, 1, 'text/plain', 'txt'))).status, 400);
      assert.equal((await request('/assets', 'POST', multipart({ ...payload, code: 'BIG-FILE' }, 1, 'application/pdf', 'pdf', 10 * 1024 * 1024 + 1))).status, 413);
      assert.equal((await request('/assets', 'POST', multipart({ ...payload, code: 'MANY-FILES' }, 11))).status, 400);
      const uploaded = await request(`/assets/${created.data._id}`, 'PUT', multipart(payload, 2));
      assert.equal(uploaded.status, 200);
      assert.equal(uploaded.data.attachments.length, 2);
      assert.equal(uploaded.data.attachments[0].storageKey, undefined);
      const file = uploaded.data.attachments[0];
      const url = `${base}/assets/${created.data._id}/attachments/${file._id}`;
      assert.equal((await fetch(url)).status, 401);
      const download = await fetch(url, { headers: { Authorization: `Bearer ${tokens[1]}` } });
      assert.equal(download.status, 200);
      assert.equal((await download.arrayBuffer()).byteLength, 20);
      const removed = await request(`/assets/${created.data._id}`, 'PUT', { ...payload, removeAttachmentIds: [file._id] });
      assert.equal(removed.status, 200);
      assert.equal(removed.data.attachments.length, 1);
      assert.equal((await readdir(uploadDirectory)).length, before + 1);
    });
    await t.test('shared receive, issue and transfer update status relations', async () => {
      const code = created.data.code;
      let response = await request('/movements/receive', 'POST', { assetCode: code, quantity: 2, supplier: 'Vendor', grn: 'GRN1', billNo: 'B1', recordedBy: 'Tester' }, tokens[1]);
      assert.equal(response.status, 201);
      assert.equal(response.asset.quantity, 12);
      response = await request('/movements/issue', 'POST', { assetCode: code, quantity: 1, recipientName: 'Person', recordedBy: 'Tester' });
      assert.equal(response.status, 201);
      assert.equal(response.asset.statusKey, 'inUse');
      assert.ok(response.asset.statusId);
      response = await request('/movements/transfer', 'POST', { assetCode: code, quantity: 1, fromLocation: 'Store', toLocation: 'Site', recordedBy: 'Tester' });
      assert.equal(response.status, 201);
      assert.equal(response.asset.statusKey, 'inTransit');
      assert.equal(response.asset.location, 'Site');
      assert.ok((await request('/movements', 'GET', undefined, tokens[1])).count >= 3);
    });
    await t.test('inspection/return status relations and protected system statuses', async () => {
      const code = created.data.code;
      const inspection = await request('/inspections', 'POST', { assetCode: code, type: 'Safety check', checklist: [], condition: 'Poor', status: 'Fail', location: 'Site', inspector: { name: 'Tester' } });
      assert.equal(inspection.status, 201);
      assert.equal(inspection.asset.statusKey, 'damaged');
      const repaired = await request(`/inspections/${inspection.data._id}`, 'PUT', { status: 'Pass' }, tokens[1]);
      assert.equal(repaired.status, 200);
      assert.equal(repaired.asset.statusKey, 'available');
      const returned = await request('/returns', 'POST', { assetCode: code, type: 'Return', quantityIssued: 2, quantityReturned: 1, quantityDamaged: 1, quantityMissing: 0, condition: 'Damaged', responsibleParty: 'Person', location: 'Store', recordedBy: 'Tester' });
      assert.equal(returned.status, 201);
      assert.equal(returned.asset.statusKey, 'damaged');
      const item = await SetupItem.findById(refs.statusId);
      assert.equal((await request(`/setup-items/${item.parentId}/${item._id}`, 'DELETE')).status, 409);
    });
    await t.test('soft deletion preserves history and files and blocks new operations', async () => {
      const before = { moves: await Movement.countDocuments(), inspections: await Inspection.countDocuments(), returns: await Return.countDocuments(), files: (await readdir(uploadDirectory)).length };
      assert.equal((await request(`/assets/${created.data._id}`, 'DELETE', undefined, tokens[1])).status, 200);
      assert.equal((await Asset.findById(created.data._id)).isActive, false);
      assert.equal(await Movement.countDocuments(), before.moves);
      assert.equal(await Inspection.countDocuments(), before.inspections);
      assert.equal(await Return.countDocuments(), before.returns);
      assert.equal((await readdir(uploadDirectory)).length, before.files);
      assert.ok(!(await request('/assets')).data.some((row) => row._id === created.data._id));
      assert.equal((await request(`/assets/${created.data.code}`)).status, 404);
      assert.equal((await request(`/assets/${created.data._id}`, 'PUT', payload)).status, 404);
      assert.equal((await request('/movements/receive', 'POST', { assetCode: created.data.code, quantity: 1 })).status, 404);
      assert.equal((await request('/assets', 'POST', payload)).status, 409);
      assert.equal((await request('/assets-stats/summary')).status, 200);
    });
    await t.test('legacy missing required form fields do not block valid stock operations', async () => {
      await Asset.collection.updateOne({ _id: legacyId }, { $unset: { department: '', departmentId: '', purchaseDate: '', receiveDate: '' } });
      const received = await request('/movements/receive', 'POST', { assetCode: 'LEGACY-1', quantity: 1, supplier: 'Vendor', grn: 'GRN-LEGACY', billNo: 'B-LEGACY', recordedBy: 'Tester' });
      assert.equal(received.status, 201);
      assert.equal(received.asset.quantity, 11);
      assert.equal((await request(`/assets/${legacyId}`, 'PUT', { ...payload, departmentId: '' })).status, 400);
    });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    try { if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase(); }
    finally { await mongoose.disconnect(); }
  }
});
