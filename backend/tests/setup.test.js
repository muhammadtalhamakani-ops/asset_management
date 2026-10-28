import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import { SetupMaster } from '../models/SetupMaster.js';
import { SetupItem } from '../models/SetupItem.js';
import { SetupCounter } from '../models/SetupCounter.js';
import { defaultSetupMasters, nextSetupCode, seedSetupMasters } from '../setup.js';
import setupRoutes from '../routes/setupRoutes.js';
import { createSessionToken } from '../middleware/auth.js';

test('setup schemas use MongoDB IDs and contain no ownership fields', async () => {
  const master = new SetupMaster({ name: ' Test ' });
  const item = new SetupItem({ code: '000001', name: ' Drill ', parentId: master._id, ownerEmail: 'ignored@example.com' });
  await item.validate();
  assert.equal(item.name, 'Drill');
  assert.equal(item.normalizedName, 'drill');
  assert.equal(item.isActive, true);
  assert.equal(item.toObject().ownerEmail, undefined);
  assert.equal(item.id, undefined);
  assert.equal(master.id, undefined);
  assert.equal(SetupItem.schema.path('code').options.immutable, true);
  assert.equal(SetupItem.schema.path('parentId').options.immutable, true);
  assert.ok(SetupItem.schema.indexes().some(([keys, options]) => keys.normalizedName && options.unique && options.partialFilterExpression.isActive));
  await assert.rejects(new SetupItem({ code: '1', name: ' ', parentId: 'invalid' }).validate());
});

const uri = process.env.SETUP_TEST_MONGODB_URI;
test('counter uses a guarded atomic increment and formats six digits', async (t) => {
  let value = 0;
  t.mock.method(SetupCounter, 'findOneAndUpdate', async (filter, update, options) => {
    assert.deepEqual(filter, { _id: 'setup-items', value: { $lt: 999999 } });
    assert.deepEqual(update, { $inc: { value: 1 } });
    assert.equal(options.new, true);
    value += 1;
    return { value };
  });
  assert.equal(await nextSetupCode(), '000001');
  assert.equal(await nextSetupCode(), '000002');
  value = 9;
  assert.equal(await nextSetupCode(), '000010');
});

test('counter exhaustion produces a conflict without an upsert', async (t) => {
  t.mock.method(SetupCounter, 'findOneAndUpdate', async (_filter, _update, options) => {
    assert.equal(options.upsert, undefined);
    return null;
  });
  await assert.rejects(nextSetupCode(), { status: 409 });
});

test('HTTP authentication and malformed requests are rejected without database access', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api', setupRoutes);
  const server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  try {
    const base = `http://127.0.0.1:${server.address().port}/api`;
    assert.equal((await fetch(`${base}/setup-masters`)).status, 401);
    const headers = { Authorization: `Bearer ${createSessionToken({ email: 'test@example.test' })}`, 'Content-Type': 'application/json' };
    const invalidId = await fetch(`${base}/setup-items/invalid`, { headers });
    assert.equal(invalidId.status, 400);
    assert.deepEqual(await invalidId.json(), { success: false, message: 'Invalid master ID.' });
    for (const name of ['', '  ', 123, {}, null]) {
      const response = await fetch(`${base}/setup-items`, { method: 'POST', headers, body: JSON.stringify({ name, parentId: 'invalid' }) });
      assert.equal(response.status, 400);
      assert.equal((await response.json()).message, 'Item name is required.');
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('General Setup database and HTTP integration', { skip: !uri && 'Set SETUP_TEST_MONGODB_URI to an explicit disposable MongoDB server URI.' }, async (t) => {
  // Always use a fresh database, regardless of the database in the provided URI.
  const dbName = `fs_setup_test_${Date.now()}_${process.pid}`;
  let server;
  try {
    await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 5000 });
    await seedSetupMasters();
    const app = express();
    app.use(express.json());
    app.use('/api', setupRoutes);
    server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const tokens = ['a@example.test', 'b@example.test'].map((email) => createSessionToken({ email }));
    async function request(path, method = 'GET', body, token = tokens[0]) {
      const response = await fetch(`${base}${path}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, ...await response.json() };
    }
    const masters = await SetupMaster.find();
    const parentId = String(masters[0]._id);
    const otherId = String(masters[1]._id);
    let first;
    await t.test('idempotent seed preserves inactive masters', async () => {
      await SetupMaster.updateOne({ _id: masters[4]._id }, { $set: { isActive: false } });
      await Promise.all([seedSetupMasters(), seedSetupMasters()]);
      assert.equal(await SetupMaster.countDocuments(), defaultSetupMasters.length);
      assert.equal((await SetupMaster.findById(masters[4]._id)).isActive, false);
      assert.equal((await request('/setup-masters')).data.length, 4);
    });
    await t.test('authentication, IDs, names and active parents', async () => {
      assert.equal((await request('/setup-masters', 'GET', undefined, '')).status, 401);
      assert.equal((await request('/setup-items/bad')).status, 400);
      assert.equal((await request(`/setup-items/${new mongoose.Types.ObjectId()}`)).status, 404);
      assert.equal((await request('/setup-items', 'POST', { name: ' ', parentId })).status, 400);
      assert.equal((await request('/setup-items', 'POST', { name: 'X', parentId: String(masters[4]._id) })).status, 404);
    });
    await t.test('first code is server-generated and records are shared', async () => {
      first = await request('/setup-items', 'POST', { name: ' Drill ', parentId, code: '888888', isActive: false, ownerEmail: 'spoofed' });
      assert.equal(first.status, 201);
      assert.equal(first.data.code, '000001');
      assert.equal(first.data.name, 'Drill');
      assert.equal(first.data.isActive, true);
      assert.equal(first.data.ownerEmail, undefined);
      assert.equal(first.data.id, undefined);
      assert.equal((await request(`/setup-items/${parentId}`, 'GET', undefined, tokens[1])).data[0]._id, first.data._id);
    });
    await t.test('concurrent allocations and duplicate name races', async () => {
      const items = await Promise.all(Array.from({ length: 20 }, (_, i) => request('/setup-items', 'POST', { name: `Concurrent ${i}`, parentId })));
      assert.ok(items.every((item) => item.status === 201));
      assert.equal(new Set(items.map((item) => item.data.code)).size, 20);
      assert.ok(items.every((item) => /^\d{6}$/.test(item.data.code)));
      const duplicates = await Promise.all([' Race ', 'race'].map((name) => request('/setup-items', 'POST', { name, parentId })));
      assert.deepEqual(duplicates.map((item) => item.status).sort(), [201, 409]);
      assert.equal((await request('/setup-items', 'POST', { name: 'Drill', parentId: otherId })).status, 201);
    });
    await t.test('shared update preserves code and parent and validates relationships', async () => {
      const path = `/setup-items/${parentId}/${first.data._id}`;
      const updated = await request(path, 'PUT', { name: 'Renamed', code: '999999', parentId: otherId, isActive: false }, tokens[1]);
      assert.equal(updated.status, 200);
      assert.equal(updated.data.code, first.data.code);
      assert.equal(updated.data.parentId, parentId);
      assert.equal(updated.data.isActive, true);
      assert.equal((await request(`/setup-items/${otherId}/${first.data._id}`, 'PUT', { name: 'X' })).status, 404);
      assert.equal((await request(`/setup-items/${parentId}/bad`, 'PUT', { name: 'X' })).status, 400);
      assert.equal((await request(path, 'PUT', { name: 'race' })).status, 409);
    });
    await t.test('soft deletion excludes items, rejects repeated writes, and never reuses codes', async () => {
      const path = `/setup-items/${parentId}/${first.data._id}`;
      assert.equal((await request(path, 'DELETE', undefined, tokens[1])).status, 200);
      assert.equal((await SetupItem.findById(first.data._id)).isActive, false);
      assert.ok(!(await request(`/setup-items/${parentId}`)).data.some((item) => item._id === first.data._id));
      assert.equal((await request(path, 'DELETE')).status, 404);
      assert.equal((await request(path, 'PUT', { name: 'X' })).status, 404);
      const recreated = await request('/setup-items', 'POST', { name: 'Renamed', parentId });
      assert.equal(recreated.status, 201);
      assert.notEqual(recreated.data.code, first.data.code);
      const counter = await SetupCounter.findById('setup-items');
      await seedSetupMasters();
      assert.equal((await SetupCounter.findById('setup-items')).value, counter.value);
    });
    await t.test('sequence stops at six digits', async () => {
      await SetupCounter.updateOne({ _id: 'setup-items' }, { $set: { value: 999998 } });
      assert.equal(await nextSetupCode(), '999999');
      await assert.rejects(nextSetupCode(), { status: 409 });
      assert.equal((await request('/setup-items', 'POST', { name: 'Overflow', parentId })).status, 409);
    });
  } finally {
    if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
