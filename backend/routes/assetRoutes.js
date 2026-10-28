import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import mongoose from 'mongoose';
import { Asset } from '../models/Asset.js';
import { Project } from '../models/Project.js';
import { requireAuth } from '../middleware/auth.js';
import { assetData, assetsData, invalid, validateAssetRelations, setAssetStatus } from '../assetCatalog.js';
import { assetUploads, uploadedAttachments, removeAssetFiles, assetUploadDirectory } from '../middleware/assetUploads.js';
import { dashboardSummary } from '../dashboardSummary.js';

const router = express.Router();
router.use(requireAuth);
function fail(res, error) {
  const status = error.code === 11000 || error.name === 'VersionError' ? 409 : error.status || (['ValidationError', 'CastError', 'SyntaxError'].includes(error.name) ? 400 : 500);
  res.status(status).json({ success: false, message: error.code === 11000 ? 'Asset code already exists.' : status === 500 ? 'Unable to complete asset request.' : error.message });
}
const idValid = (id) => { if (!mongoose.isObjectIdOrHexString(id)) throw invalid('Invalid asset ID.'); };
router.get('/projects', async (_req, res) => {
  try { const data = await Project.find({ isActive: true }).sort({ name: 1 }); res.json({ success: true, data, count: data.length }); }
  catch (error) { fail(res, error); }
});
router.get('/assets', async (req, res) => {
  try {
    const query = { isActive: true };
    for (const key of ['status', 'category', 'location', 'project', 'project_id']) if (typeof req.query[key] === 'string') query[key] = req.query[key];
    if (typeof req.query.search === 'string') {
      const search = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = ['name', 'code', 'qrCode'].map((field) => ({ [field]: { $regex: search, $options: 'i' } }));
    }
    const data = await assetsData(await Asset.find(query).sort({ createdAt: -1 }));
    res.json({ success: true, data, count: data.length });
  } catch (error) { fail(res, error); }
});
router.get('/assets/:identifier', async (req, res) => {
  try {
    const identifier = req.params.identifier;
    const choices = [{ code: identifier.toUpperCase() }, { qrCode: identifier }];
    if (mongoose.isObjectIdOrHexString(identifier)) choices.unshift({ _id: identifier });
    const asset = await Asset.findOne({ isActive: true, $or: choices });
    if (!asset) throw invalid('Active asset not found.', 404);
    res.json({ success: true, data: await assetData(asset) });
  } catch (error) { fail(res, error); }
});
function payload(req) {
  const body = req.is('multipart/form-data') ? JSON.parse(req.body.data || '{}') : req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw invalid('Invalid asset data.');
  return body;
}
function text(body, key, required = false) {
  const value = body[key];
  if (value !== undefined && typeof value !== 'string') throw invalid(`${key} must be text.`);
  const trimmed = (value || '').trim();
  if (required && !trimmed) throw invalid(`${key} is required.`);
  return trimmed;
}
function number(body, key, fallback) {
  const raw = body[key] === undefined ? fallback : body[key];
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) throw invalid(`${key} must be a nonnegative number.`);
  return raw;
}
async function fields(body, current) {
  const result = await validateAssetRelations(body, current);
  result.name = text(body, 'name', true);
  result.deliveryNote = text(body, 'deliveryNote', true);
  result.location = text(body, 'location', true);
  result.unit = text(body, 'unit', true);
  result.quantity = number(body, 'quantity', current ? current.quantity : 1);
  if (!current && result.quantity <= 0) throw invalid('Quantity must be greater than zero.');
  result.minimum = number(body, 'minimum', 0);
  result.unitCost = number(body, 'unitCost', 0);
  for (const key of ['description', 'remarks']) result[key] = text(body, key);
  for (const key of ['purchaseDate', 'receiveDate']) {
    const raw = text(body, key, true);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(raw)) || new Date(raw).toISOString().slice(0, 10) !== raw) throw invalid(`${key} must be a valid date.`);
    result[key] = new Date(`${raw}T00:00:00.000Z`);
  }
  result.value = `AED ${(result.quantity * result.unitCost).toLocaleString()}`;
  return result;
}
router.post('/assets', assetUploads, async (req, res) => {
  let saved = false;
  try {
    const body = payload(req);
    const code = text(body, 'code', true).toUpperCase();
    if (await Asset.exists({ code }).collation({ locale: 'en', strength: 2 })) throw invalid('Asset code already exists.', 409);
    const data = await fields(body);
    const asset = await Asset.create({ ...data, code, isActive: true,
      assetTagId: `TAG-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`,
      qrCode: `QR-${code}-${crypto.randomUUID()}`, attachments: uploadedAttachments(req),
    });
    saved = true;
    res.status(201).json({ success: true, data: await assetData(asset), message: 'Asset created.' });
  } catch (error) {
    if (!saved) await removeAssetFiles((req.files || []).map((file) => file.filename));
    fail(res, error);
  }
});
router.put('/assets/:id', assetUploads, async (req, res) => {
  let saved = false;
  try {
    idValid(req.params.id);
    const asset = await Asset.findOne({ _id: req.params.id, isActive: true }).select('+attachments.storageKey');
    if (!asset) throw invalid('Active asset not found.', 404);
    const body = payload(req);
    const qrOnly = Object.keys(body).length === 1 && typeof body.qrCode === 'string';
    const data = qrOnly ? { qrCode: text(body, 'qrCode', true) } : await fields(body, asset);
    const removals = body.removeAttachmentIds || [];
    if (!Array.isArray(removals) || removals.some((id) => typeof id !== 'string' || !asset.attachments.some((file) => String(file._id) === id))) throw invalid('Invalid attachment removal.');
    const removed = asset.attachments.filter((file) => removals.includes(String(file._id)));
    const attachments = [...asset.attachments.filter((file) => !removals.includes(String(file._id))).map((file) => file.toObject()), ...uploadedAttachments(req)];
    if (attachments.length > 10) throw invalid('Maximum 10 attachments per asset.');
    const updated = await Asset.findOneAndUpdate({ _id: asset._id, isActive: true, __v: asset.__v },
      { $set: { ...data, attachments }, $inc: { __v: 1 } }, { new: true, runValidators: true });
    if (!updated) throw invalid('Asset changed. Reload and try again.', 409);
    saved = true;
    await removeAssetFiles(removed.map((file) => file.storageKey));
    res.json({ success: true, data: await assetData(updated), message: 'Asset updated.' });
  } catch (error) {
    if (!saved) await removeAssetFiles((req.files || []).map((file) => file.filename));
    fail(res, error);
  }
});
router.get('/assets/:id/attachments/:attachmentId', async (req, res) => {
  try {
    idValid(req.params.id);
    const asset = await Asset.findOne({ _id: req.params.id, isActive: true }).select('+attachments.storageKey');
    const file = asset?.attachments.id(req.params.attachmentId);
    if (!file?.storageKey || path.basename(file.storageKey) !== file.storageKey) throw invalid('Attachment not found.', 404);
    res.download(path.join(assetUploadDirectory, file.storageKey), file.originalName, (error) => {
      if (error && !res.headersSent) res.status(404).json({ success: false, message: 'Attachment file is unavailable.' });
    });
  } catch (error) { fail(res, error); }
});
router.delete('/assets/:id', async (req, res) => {
  try {
    idValid(req.params.id);
    const asset = await Asset.findOneAndUpdate({ _id: req.params.id, isActive: true }, { $set: { isActive: false }, $inc: { __v: 1 } }, { new: true });
    if (!asset) throw invalid('Active asset not found.', 404);
    res.json({ success: true, data: await assetData(asset), message: 'Asset deactivated; history retained.' });
  } catch (error) { fail(res, error); }
});
router.get('/assets-stats/summary', async (_req, res) => {
  try {
    res.json({ success: true, data: await dashboardSummary() });
  } catch (error) { fail(res, error); }
});
router.patch('/assets/:id/stock', async (req, res) => {
  try {
    idValid(req.params.id);
    const asset = await Asset.findOne({ _id: req.params.id, isActive: true });
    if (!asset) throw invalid('Active asset not found.', 404);
    const delta = req.body.quantityChange;
    if (typeof delta !== 'number' || !Number.isFinite(delta) || asset.quantity + delta < 0) throw invalid('Invalid stock change.');
    asset.quantity += delta;
    asset.value = `AED ${(asset.quantity * asset.unitCost).toLocaleString()}`;
    await setAssetStatus(asset, asset.quantity === 0 ? 'lowStock' : 'available');
    await asset.save({ validateModifiedOnly: true });
    res.json({ success: true, data: await assetData(asset), message: 'Stock updated.' });
  } catch (error) { fail(res, error); }
});
export default router;
