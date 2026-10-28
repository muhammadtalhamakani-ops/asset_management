import express from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { SetupMaster } from '../models/SetupMaster.js';
import { SetupItem } from '../models/SetupItem.js';
import { nextSetupCode } from '../setup.js';

const router = express.Router();
router.use(requireAuth);

function failure(res, error) {
  const status = error.code === 11000 ? 409 : error.status || (error.name === 'ValidationError' ? 400 : 500);
  const message = error.code === 11000 ? 'An active item with this name already exists in this section.'
    : status === 500 ? 'Unable to complete the setup request.' : error.message;
  return res.status(status).json({ success: false, message });
}

function invalid(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

async function activeMaster(parentId) {
  if (!mongoose.isObjectIdOrHexString(parentId)) throw invalid('Invalid master ID.');
  const master = await SetupMaster.findOne({ _id: parentId, isActive: true });
  if (!master) throw invalid('Active setup master not found.', 404);
}

function itemName(body) {
  if (typeof body?.name !== 'string' || !body.name.trim()) throw invalid('Item name is required.');
  return body.name.trim();
}

const itemFields = '_id code name parentId isActive systemKey';
router.get('/setup-masters', async (_req, res) => {
  try {
    const data = await SetupMaster.find({ isActive: true }).sort({ _id: 1 });
    res.json({ success: true, data, count: data.length });
  } catch (error) { failure(res, error); }
});

router.get('/setup-items/:parentId', async (req, res) => {
  try {
    await activeMaster(req.params.parentId);
    const data = await SetupItem.find({ parentId: req.params.parentId, isActive: true }).select(itemFields).sort({ code: 1 });
    res.json({ success: true, data, count: data.length });
  } catch (error) { failure(res, error); }
});

router.post('/setup-items', async (req, res) => {
  try {
    const name = itemName(req.body);
    await activeMaster(req.body.parentId);
    const code = await nextSetupCode();
    const item = await SetupItem.create({ name, parentId: req.body.parentId, code, isActive: true });
    const data = { _id: item._id, code: item.code, name: item.name, parentId: item.parentId, isActive: item.isActive };
    res.status(201).json({ success: true, data, message: `Setup item ${code} created.` });
  } catch (error) { failure(res, error); }
});

async function activeItem(params) {
  await activeMaster(params.parentId);
  if (!mongoose.isObjectIdOrHexString(params.id)) throw invalid('Invalid item ID.');
  const item = await SetupItem.findOne({ _id: params.id, parentId: params.parentId, isActive: true });
  if (!item) throw invalid('Active setup item not found.', 404);
  return item;
}

router.put('/setup-items/:parentId/:id', async (req, res) => {
  try {
    const name = itemName(req.body);
    await activeItem(req.params);
    const data = await SetupItem.findOneAndUpdate(
      { _id: req.params.id, parentId: req.params.parentId, isActive: true },
      { $set: { name, normalizedName: name.toLowerCase() } },
      { new: true, runValidators: true },
    ).select(itemFields);
    if (!data) throw invalid('Active setup item not found.', 404);
    res.json({ success: true, data, message: 'Setup item updated.' });
  } catch (error) { failure(res, error); }
});

router.delete('/setup-items/:parentId/:id', async (req, res) => {
  try {
    const item = await activeItem(req.params);
    if (item.systemKey) throw invalid('Required workflow statuses cannot be deactivated.', 409);
    const data = await SetupItem.findOneAndUpdate(
      { _id: req.params.id, parentId: req.params.parentId, isActive: true },
      { $set: { isActive: false } }, { new: true, runValidators: true },
    ).select(itemFields);
    if (!data) throw invalid('Active setup item not found.', 404);
    res.json({ success: true, data, message: 'Setup item deactivated.' });
  } catch (error) { failure(res, error); }
});

export default router;
