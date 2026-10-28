import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import { Supplier } from '../models/Supplier.js';
import { SupplierCounter } from '../models/SupplierCounter.js';
import { initializeSuppliers, nextSupplierCode } from '../suppliers.js';
import supplierRoutes from '../routes/supplierRoutes.js';
import { createSessionToken } from '../middleware/auth.js';

test('supplier requires name/email/code, defaults active, and stores no user reference', async () => {
  const supplier = new Supplier({ code: '000001', companyName: ' Vendor ', email: ' VENDOR@example.com ', ownerEmail: 'ignored', createdBy: 'ignored', status: 'Inactive' });
  await supplier.validate();
  assert.equal(supplier.companyName, 'Vendor');
  assert.equal(supplier.email, 'vendor@example.com');
  assert.equal(supplier.isActive, true);
  assert.equal(supplier.phone, '');
  assert.equal(supplier.ownerEmail, undefined);
  assert.equal(supplier.createdBy, undefined);
  assert.equal(supplier.status, undefined);
  for (const payload of [{}, { companyName: 'X', code: '000001' }, { companyName: 'X', email: 'bad', code: '000001' }]) {
    await assert.rejects(new Supplier(payload).validate());
  }
});

test('supplier sequence is separate, guarded, and padded; exhaustion rejects', async (t) => {
  t.mock.method(SupplierCounter, 'findOneAndUpdate', async (filter, update, options) => {
    assert.deepEqual(filter, { _id: 'suppliers', value: { $lt: 999999 } });
    assert.deepEqual(update, { $inc: { value: 1 } });
    assert.equal(options.new, true);
    return { value: 1 };
  });
  assert.equal(await nextSupplierCode(), '000001');
  SupplierCounter.findOneAndUpdate.mock.mockImplementation(async () => null);
  await assert.rejects(nextSupplierCode(), { status: 409 });
});

test('supplier HTTP rejects unauthenticated and invalid create/delete requests', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api', supplierRoutes);
  const server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  try {
    const base = `http://127.0.0.1:${server.address().port}/api/suppliers`;
    assert.equal((await fetch(base)).status, 401);
    const headers = { Authorization: `Bearer ${createSessionToken({ email: 'a@example.test' })}`, 'Content-Type': 'application/json' };
    for (const body of [{}, { companyName: '  ', email: 'a@b.com' }, { companyName: 'X' }, { companyName: 'X', email: 'bad' }, { companyName: 'X', email: 'a@b.com', phone: {} }]) {
      const response = await fetch(base, { method: 'POST', headers, body: JSON.stringify(body) });
      assert.equal(response.status, 400);
      assert.equal((await response.json()).success, false);
    }
    assert.equal((await fetch(`${base}/invalid`, { method: 'DELETE', headers })).status, 400);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

const uri = process.env.SUPPLIER_TEST_MONGODB_URI;
test('supplier database migration and shared HTTP workflows', { skip: !uri && 'Set explicit SUPPLIER_TEST_MONGODB_URI for a disposable database.' }, async (t) => {
  let server;
  try {
    await mongoose.connect(uri, { dbName: `fs_sup_test_${Date.now()}_${process.pid}`, serverSelectionTimeoutMS: 10000 });
    const collection = Supplier.collection;
    await collection.createIndex({ ownerEmail: 1, companyName: 1 }, { unique: true });
    const originalIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
    await collection.insertMany(originalIds.map((_id, i) => ({ _id, companyName: 'Legacy vendor', email: `vendor${i}@example.test`, ownerEmail: `user${i}@example.test`, status: i === 2 ? 'Inactive' : 'Active' })));
    await initializeSuppliers();
    const app = express();
    app.use(express.json());
    app.use('/api', supplierRoutes);
    server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
    const tokens = ['a@example.test', 'b@example.test'].map((email) => createSessionToken({ email }));
    const base = `http://127.0.0.1:${server.address().port}/api/suppliers`;
    async function request(path = '', method = 'GET', body, token = tokens[0]) {
      const response = await fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, ...await response.json() };
    }
    await t.test('migration preserves IDs, assigns all codes, removes ownership/indexes, preserves inactive status', async () => {
      const legacy = await collection.find().sort({ _id: 1 }).toArray();
      assert.deepEqual(legacy.map((row) => String(row._id)), originalIds.map(String));
      assert.deepEqual(legacy.map((row) => row.code), ['000001', '000002', '000003']);
      assert.ok(legacy.every((row) => !Object.hasOwn(row, 'ownerEmail') && !Object.hasOwn(row, 'status')));
      assert.equal(legacy[2].isActive, false);
      assert.ok(!(await collection.indexes()).some((index) => Object.hasOwn(index.key, 'ownerEmail')));
      assert.equal((await initializeSuppliers()).assigned, 0);
      assert.equal((await SupplierCounter.findById('suppliers')).value, 3);
    });
    let created;
    await t.test('minimal create ignores client code/activity/user fields and is shared', async () => {
      created = await request('', 'POST', { companyName: 'Shared vendor', email: ' SHARED@example.test ', code: '999999', isActive: false, ownerEmail: 'spoofed' });
      assert.equal(created.status, 201);
      assert.equal(created.data.code, '000004');
      assert.equal(created.data.isActive, true);
      assert.equal(created.data.email, 'shared@example.test');
      assert.equal(created.data.ownerEmail, undefined);
      const listed = await request('', 'GET', undefined, tokens[1]);
      assert.equal(listed.count, 3);
      assert.ok(listed.data.some((row) => row._id === created.data._id));
    });
    await t.test('concurrent creates get unique codes', async () => {
      const results = await Promise.all(Array.from({ length: 12 }, (_, i) => request('', 'POST', { companyName: `Concurrent ${i}`, email: `vendor${i}@example.test` })));
      assert.ok(results.every((result) => result.status === 201));
      assert.equal(new Set(results.map((result) => result.data.code)).size, 12);
    });
    await t.test('shared edit validates fields and preserves code, activity and ownership', async () => {
      const counter = (await SupplierCounter.findById('suppliers')).value;
      const updated = await request(`/${created.data._id}`, 'PUT', {
        companyName: ' Updated vendor ', email: ' UPDATED@example.test ', contactPerson: ' Contact ',
        phone: '123', address: 'Address', taxId: 'Tax', notes: 'Notes',
        code: '999999', isActive: false, ownerEmail: 'spoofed', createdBy: 'spoofed',
      }, tokens[1]);
      assert.equal(updated.status, 200);
      assert.equal(updated.data.companyName, 'Updated vendor');
      assert.equal(updated.data.email, 'updated@example.test');
      assert.equal(updated.data.contactPerson, 'Contact');
      assert.equal(updated.data.code, created.data.code);
      assert.equal(updated.data.isActive, true);
      assert.equal(updated.data.ownerEmail, undefined);
      assert.equal(updated.data.createdBy, undefined);
      assert.equal((await SupplierCounter.findById('suppliers')).value, counter);
      assert.equal((await request('/invalid', 'PUT', { companyName: 'X', email: 'x@example.test' })).status, 400);
      assert.equal((await request(`/${new mongoose.Types.ObjectId()}`, 'PUT', { companyName: 'X', email: 'x@example.test' })).status, 404);
      for (const body of [{ companyName: '', email: 'x@example.test' }, { companyName: 'X', email: 'bad' }, { companyName: 'X', email: 'x@example.test', phone: {} }]) {
        assert.equal((await request(`/${created.data._id}`, 'PUT', body)).status, 400);
      }
    });
    await t.test('another user soft deletes; lists exclude inactive and codes stay reserved', async () => {
      assert.equal((await request(`/${created.data._id}`, 'DELETE', undefined, tokens[1])).status, 200);
      assert.equal((await collection.findOne({ _id: new mongoose.Types.ObjectId(created.data._id) })).isActive, false);
      assert.equal((await request(`/${created.data._id}`, 'DELETE')).status, 404);
      assert.equal((await request(`/${created.data._id}`, 'PUT', { companyName: 'X', email: 'x@example.test' })).status, 404);
      assert.ok(!(await request()).data.some((row) => row._id === created.data._id));
      const next = await request('', 'POST', { companyName: 'New', email: 'new@example.test' });
      assert.equal(next.status, 201);
      assert.notEqual(next.data.code, created.data.code);
      assert.equal((await initializeSuppliers()).assigned, 0);
    });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    try {
      if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    } finally { await mongoose.disconnect(); }
  }
});
