import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import express from 'express';
import assetRoutes from '../routes/assetRoutes.js';
import { Asset } from '../models/Asset.js';
import { SetupMaster } from '../models/SetupMaster.js';
import { SetupItem } from '../models/SetupItem.js';
import { Project } from '../models/Project.js';
import { initializeAssetCatalog } from '../assetCatalog.js';
import { nextSetupCode } from '../setup.js';
import { dashboardSummary } from '../dashboardSummary.js';
import { createSessionToken } from '../middleware/auth.js';

test('dashboard summary requires authentication', async () => {
  const app = express(); app.use('/api', assetRoutes);
  const server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/assets-stats/summary`);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).success, false);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

const uri = process.env.DASHBOARD_TEST_MONGODB_URI;
test('global dashboard aggregation and API', { skip: !uri && 'Set explicit DASHBOARD_TEST_MONGODB_URI for disposable database tests.' }, async (t) => {
  let server;
  try {
    await mongoose.connect(uri, { dbName: `fs_dash_${Date.now()}_${process.pid}`, serverSelectionTimeoutMS: 10000 });
    await initializeAssetCatalog();
    const master = await SetupMaster.findOne({ name: 'Asset Category' });
    const categories = [];
    for (const name of ['Tools', 'Materials', 'Unused category']) categories.push(await SetupItem.create({ name, parentId: master._id, code: await nextSetupCode() }));
    const statuses = await SetupItem.find({ systemKey: { $regex: '^asset:' } });
    const available = statuses.find((row) => row.systemKey === 'asset:available');
    const damaged = statuses.find((row) => row.systemKey === 'asset:damaged');
    const projects = await Project.find().sort({ name: 1 });
    await Project.updateOne({ _id: projects[1]._id }, { $set: { isActive: false } });
    await SetupItem.updateOne({ _id: categories[1]._id }, { $set: { isActive: false } });
    await SetupItem.updateOne({ _id: damaged._id }, { $set: { isActive: false } });
    const orphan = new mongoose.Types.ObjectId();
    await Asset.collection.insertMany([
      { code: 'DASH-1', name: 'One record with large quantity', quantity: 1000, unitCost: 2, isActive: true, categoryId: categories[0]._id, statusId: available._id, project_id: projects[0]._id },
      { code: 'DASH-2', name: 'Zero stock record', quantity: 0, unitCost: 5, isActive: true, categoryId: categories[0]._id, statusId: available._id, project_id: projects[0]._id },
      { code: 'DASH-3', quantity: 3, unitCost: 10, isActive: true, categoryId: categories[1]._id, statusId: damaged._id, project_id: projects[1]._id },
      { code: 'DASH-4', quantity: 1, unitCost: 4, isActive: true },
      { code: 'DASH-5', quantity: 1, unitCost: 6, isActive: true, categoryId: orphan, statusId: orphan, project_id: orphan },
      { code: 'DASH-OFF', quantity: 9999, unitCost: 9999, isActive: false, categoryId: categories[0]._id, statusId: available._id, project_id: projects[0]._id },
    ]);
    let summary;
    await t.test('counts active records once, includes zero quantity, retains totalValue', async () => {
      summary = await dashboardSummary();
      assert.equal(summary.totalAssets, 5);
      assert.equal(summary.totalValue, 2040);
      for (const rows of [summary.byCategory, summary.byStatus, summary.byProject]) assert.equal(rows.reduce((sum, row) => sum + row.count, 0), 5);
      assert.equal(summary.byStatus.find((row) => row.systemKey === 'asset:available').count, 2);
    });
    await t.test('resolves names, zero groups, inactive references and unassigned', async () => {
      assert.equal(summary.byCategory.find((row) => row.name === 'Tools').count, 2);
      assert.equal(summary.byCategory.find((row) => row.name === 'Unused category').count, 0);
      assert.equal(summary.byCategory.find((row) => row.name === 'Materials').isActive, false);
      assert.equal(summary.byStatus.find((row) => row.systemKey === 'asset:damaged').count, 1);
      assert.equal(summary.byStatus.find((row) => row.systemKey === 'asset:damaged').isActive, false);
      assert.equal(summary.byStatus.find((row) => row.systemKey === 'asset:inTransit').count, 0);
      for (const rows of [summary.byCategory, summary.byStatus, summary.byProject]) assert.equal(rows.find((row) => row._id === null).count, 2);
      assert.equal(summary.byProject.find((row) => String(row._id) === String(projects[1]._id)).isActive, false);
      assert.ok(summary.byProject.some((row) => row.isActive && row.count === 0));
      assert.deepEqual(summary.byProject.map((row) => row.name), summary.byProject.map((row) => row.name).sort((a, b) => a.localeCompare(b)));
    });
    await t.test('stable status keys survive display-name changes', async () => {
      await SetupItem.updateOne({ _id: available._id }, { $set: { name: 'Ready for use', normalizedName: 'ready for use' } });
      const data = await dashboardSummary();
      const status = data.byStatus.find((row) => row.systemKey === 'asset:available');
      assert.equal(status.name, 'Ready for use'); assert.equal(status.count, 2);
    });
    await t.test('API preserves envelope and fields, ignores project filters and is shared', async () => {
      const app = express(); app.use('/api', assetRoutes);
      server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
      const url = `http://127.0.0.1:${server.address().port}/api/assets-stats/summary?project_id=${projects[0]._id}`;
      for (const email of ['a@example.test', 'b@example.test']) {
        const response = await fetch(url, { headers: { Authorization: `Bearer ${createSessionToken({ email })}` } });
        assert.equal(response.status, 200);
        const body = await response.json(); assert.equal(body.success, true); assert.equal(body.data.totalAssets, 5);
        assert.equal(body.data.totalValue, 2040);
        for (const field of ['byCategory', 'byStatus', 'byProject']) assert.ok(body.data[field].every((row) => Object.hasOwn(row, '_id') && typeof row.count === 'number' && typeof row.name === 'string'));
      }
    });
    await t.test('empty active assets return zero totals and catalog zero groups', async () => {
      await Asset.collection.updateMany({}, { $set: { isActive: false } });
      const data = await dashboardSummary(); assert.equal(data.totalAssets, 0); assert.equal(data.totalValue, 0);
      assert.ok(data.byStatus.length > 0); assert.ok(data.byProject.length > 0);
      for (const rows of [data.byCategory, data.byStatus, data.byProject]) assert.ok(rows.every((row) => row.count === 0 && row.isActive));
    });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    try { if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase(); }
    finally { await mongoose.disconnect(); }
  }
});
