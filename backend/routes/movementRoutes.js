import express from 'express';
import crypto from 'node:crypto';
import { assetData, setAssetStatus, hasAssetStatus, invalid } from '../assetCatalog.js';
import { Movement } from '../models/Movement.js';
import { Asset } from '../models/Asset.js';
import { requireAuth } from '../middleware/auth.js';
import { receivingFields, movementsData } from '../receiving.js';

const router = express.Router();
router.use(requireAuth);

// GET all movements with filters
router.get('/movements', async (req, res) => {
  try {
    const { type, status, project, dateFrom, dateTo, assetCode } = req.query;
    let query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    if (project) query.project = project;
    if (assetCode) query.assetCode = assetCode;
    if (dateFrom || dateTo) {
      query.timestamp = {};
      if (dateFrom) query.timestamp.$gte = new Date(dateFrom);
      if (dateTo) query.timestamp.$lte = new Date(dateTo);
    }

    const movements = await Movement.find(query)
      .sort({ timestamp: -1 })
      .limit(500)
      .populate('assetId');

    res.json({ success: true, data: await movementsData(movements), count: movements.length });
  } catch (error) {
    res.status(error.status || (error.name === 'ValidationError' ? 400 : error.name === 'VersionError' ? 409 : 500)).json({ success: false, message: error.status ? error.message : error.name === 'VersionError' ? 'Asset changed. Reload and try again.' : error.name === 'ValidationError' ? 'Invalid workflow data.' : 'Unable to complete the request.' });
  }
});

// GET single movement
router.get('/movements/:id', async (req, res) => {
  try {
    const movement = await Movement.findOne({ _id: req.params.id }).populate('assetId');
    if (!movement) {
      return res.status(404).json({ success: false, message: 'Movement not found' });
    }
    res.json({ success: true, data: (await movementsData([movement]))[0] });
  } catch (error) {
    res.status(error.status || (error.name === 'ValidationError' ? 400 : error.name === 'VersionError' ? 409 : 500)).json({ success: false, message: error.status ? error.message : error.name === 'VersionError' ? 'Asset changed. Reload and try again.' : error.name === 'ValidationError' ? 'Invalid workflow data.' : 'Unable to complete the request.' });
  }
});

// CREATE receive movement
router.post('/movements/receive', async (req, res) => {
  try {
    const { asset, data } = await receivingFields(req.body);
    const quantity = data.quantity;
    const movement = new Movement({ ...data, id: `GRN-${crypto.randomUUID()}`, type: 'receive', status: 'Received' });

    await movement.save();

    // Update asset quantity
    asset.quantity += quantity;
    asset.value = `AED ${(asset.quantity * asset.unitCost).toLocaleString()}`;
    if (asset.quantity >= asset.minimum && await hasAssetStatus(asset, 'lowStock')) {
      await setAssetStatus(asset, 'available');
    }
    await asset.save({ validateModifiedOnly: true });

    res.status(201).json({ success: true, data: (await movementsData([movement]))[0], asset: await assetData(asset), message: 'Receiving recorded successfully' });
  } catch (error) {
    res.status(error.status || (error.name === 'ValidationError' ? 400 : error.name === 'VersionError' ? 409 : 500)).json({ success: false, message: error.status ? error.message : error.name === 'VersionError' ? 'Asset changed. Reload and try again.' : error.name === 'ValidationError' ? 'Invalid workflow data.' : 'Unable to complete the request.' });
  }
});

// CREATE issue movement
router.post('/movements/issue', async (req, res) => {
  try {
    const { assetCode, quantity, recipientName, billNo, project, remarks, recordedBy } = req.body;

    const asset = await Asset.findOne({ code: assetCode, isActive: true });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    if (asset.quantity < quantity) {
      return res.status(400).json({ success: false, message: 'Insufficient stock' });
    }

    if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) throw invalid('Quantity must be greater than zero.');
    const movementId = `ISS-${crypto.randomUUID()}`;
    const movement = new Movement({
      id: movementId,
      type: 'issue',
      assetId: asset._id,
      assetCode: asset.code,
      assetName: asset.name,
      quantity,
      unit: asset.unit,
      fromLocation: asset.location,
      recipientName,
      billNo,
      status: 'Issued',
      remarks,
      recordedBy,
      project: project || asset.project,
    });

    await movement.save();

    // Update asset quantity and status
    asset.quantity -= quantity;
    asset.value = `AED ${(asset.quantity * asset.unitCost).toLocaleString()}`;
    await setAssetStatus(asset, 'inUse');
    if (asset.quantity < asset.minimum) {
      await setAssetStatus(asset, 'lowStock');
    }
    await asset.save({ validateModifiedOnly: true });

    res.status(201).json({ success: true, data: movement, asset: await assetData(asset), message: 'Issue recorded successfully' });
  } catch (error) {
    res.status(error.status || (error.name === 'ValidationError' ? 400 : error.name === 'VersionError' ? 409 : 500)).json({ success: false, message: error.status ? error.message : error.name === 'VersionError' ? 'Asset changed. Reload and try again.' : error.name === 'ValidationError' ? 'Invalid workflow data.' : 'Unable to complete the request.' });
  }
});

// CREATE transfer movement
router.post('/movements/transfer', async (req, res) => {
  try {
    const { assetCode, quantity, fromLocation, toLocation, project, remarks, recordedBy } = req.body;

    const asset = await Asset.findOne({ code: assetCode, isActive: true });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    if (asset.quantity < quantity) {
      return res.status(400).json({ success: false, message: 'Insufficient stock' });
    }

    if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) throw invalid('Quantity must be greater than zero.');
    const movementId = `TRF-${crypto.randomUUID()}`;
    const movement = new Movement({
      id: movementId,
      type: 'transfer',
      assetId: asset._id,
      assetCode: asset.code,
      assetName: asset.name,
      quantity,
      unit: asset.unit,
      fromLocation,
      toLocation,
      status: 'Transferred',
      remarks,
      recordedBy,
      project: project || asset.project,
    });

    await movement.save();

    // Update asset location
    asset.location = toLocation;
    await setAssetStatus(asset, 'inTransit');
    await asset.save({ validateModifiedOnly: true });

    res.status(201).json({ success: true, data: movement, asset: await assetData(asset), message: 'Transfer recorded successfully' });
  } catch (error) {
    res.status(error.status || (error.name === 'ValidationError' ? 400 : error.name === 'VersionError' ? 409 : 500)).json({ success: false, message: error.status ? error.message : error.name === 'VersionError' ? 'Asset changed. Reload and try again.' : error.name === 'ValidationError' ? 'Invalid workflow data.' : 'Unable to complete the request.' });
  }
});

// UPDATE movement
router.put('/movements/:id', async (req, res) => {
  try {
    const existing = await Movement.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Movement not found' });
    if (existing.type === 'receive' && ['assetId', 'assetCode', 'assetName', 'supplierId', 'supplier', 'project_id', 'project'].some((field) => req.body[field] !== undefined)) throw invalid('Receiving relations cannot be changed.');
    const updates = {};
    for (const field of ['remarks', 'fromLocation', 'toLocation', 'project', 'status']) {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] !== 'string') throw invalid(`${field} must be text.`);
        updates[field] = req.body[field];
      }
    }
    const movement = await Movement.findOneAndUpdate({ _id: req.params.id }, updates, { new: true, runValidators: true });
    if (!movement) {
      return res.status(404).json({ success: false, message: 'Movement not found' });
    }
    res.json({ success: true, data: (await movementsData([movement]))[0], message: 'Movement updated successfully' });
  } catch (error) {
    res.status(error.status || (error.name === 'ValidationError' ? 400 : error.name === 'VersionError' ? 409 : 500)).json({ success: false, message: error.status ? error.message : error.name === 'VersionError' ? 'Asset changed. Reload and try again.' : error.name === 'ValidationError' ? 'Invalid workflow data.' : 'Unable to complete the request.' });
  }
});

// DELETE movement
router.delete('/movements/:id', async (req, res) => {
  try {
    const movement = await Movement.findOneAndDelete({ _id: req.params.id });
    if (!movement) {
      return res.status(404).json({ success: false, message: 'Movement not found' });
    }
    res.json({ success: true, message: 'Movement deleted successfully' });
  } catch (error) {
    res.status(error.status || (error.name === 'ValidationError' ? 400 : error.name === 'VersionError' ? 409 : 500)).json({ success: false, message: error.status ? error.message : error.name === 'VersionError' ? 'Asset changed. Reload and try again.' : error.name === 'ValidationError' ? 'Invalid workflow data.' : 'Unable to complete the request.' });
  }
});

export default router;
