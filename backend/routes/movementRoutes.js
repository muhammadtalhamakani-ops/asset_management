import express from 'express';
import { Movement } from '../models/Movement.js';
import { Asset } from '../models/Asset.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// GET all movements with filters
router.get('/movements', async (req, res) => {
  try {
    const { type, status, project, dateFrom, dateTo, assetCode } = req.query;
    let query = { ownerEmail: req.user.email };

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

    res.json({ success: true, data: movements, count: movements.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single movement
router.get('/movements/:id', async (req, res) => {
  try {
    const movement = await Movement.findOne({ _id: req.params.id, ownerEmail: req.user.email }).populate('assetId');
    if (!movement) {
      return res.status(404).json({ success: false, message: 'Movement not found' });
    }
    res.json({ success: true, data: movement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE receive movement
router.post('/movements/receive', async (req, res) => {
  try {
    const { assetCode, quantity, supplier, grn, billNo, project, remarks, recordedBy } = req.body;

    const asset = await Asset.findOne({ code: assetCode, ownerEmail: req.user.email });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    const movementId = `GRN-${Date.now().toString().slice(-4)}`;
    const movement = new Movement({
      id: movementId,
      type: 'receive',
      assetId: asset._id,
      assetCode: asset.code,
      assetName: asset.name,
      quantity,
      unit: asset.unit,
      toLocation: asset.location,
      supplier,
      grn,
      billNo,
      status: 'Received',
      remarks,
      recordedBy,
      ownerEmail: req.user.email,
      project: project || asset.project,
    });

    await movement.save();

    // Update asset quantity
    asset.quantity += quantity;
    asset.value = `AED ${(asset.quantity * asset.unitCost).toLocaleString()}`;
    if (asset.quantity >= asset.minimum && asset.status === 'Low stock') {
      asset.status = 'Available';
    }
    await asset.save();

    res.status(201).json({ success: true, data: movement, message: 'Receiving recorded successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE issue movement
router.post('/movements/issue', async (req, res) => {
  try {
    const { assetCode, quantity, recipientName, billNo, project, remarks, recordedBy } = req.body;

    const asset = await Asset.findOne({ code: assetCode, ownerEmail: req.user.email });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    if (asset.quantity < quantity) {
      return res.status(400).json({ success: false, message: 'Insufficient stock' });
    }

    const movementId = `ISS-${Date.now().toString().slice(-4)}`;
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
      ownerEmail: req.user.email,
      project: project || asset.project,
    });

    await movement.save();

    // Update asset quantity and status
    asset.quantity -= quantity;
    asset.value = `AED ${(asset.quantity * asset.unitCost).toLocaleString()}`;
    asset.status = 'In use';
    if (asset.quantity < asset.minimum) {
      asset.status = 'Low stock';
    }
    await asset.save();

    res.status(201).json({ success: true, data: movement, message: 'Issue recorded successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE transfer movement
router.post('/movements/transfer', async (req, res) => {
  try {
    const { assetCode, quantity, fromLocation, toLocation, project, remarks, recordedBy } = req.body;

    const asset = await Asset.findOne({ code: assetCode, ownerEmail: req.user.email });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    if (asset.quantity < quantity) {
      return res.status(400).json({ success: false, message: 'Insufficient stock' });
    }

    const movementId = `TRF-${Date.now().toString().slice(-4)}`;
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
      ownerEmail: req.user.email,
      project: project || asset.project,
    });

    await movement.save();

    // Update asset location
    asset.location = toLocation;
    asset.status = 'In transit';
    await asset.save();

    res.status(201).json({ success: true, data: movement, message: 'Transfer recorded successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE movement
router.put('/movements/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.ownerEmail;
    const movement = await Movement.findOneAndUpdate({ _id: req.params.id, ownerEmail: req.user.email }, updates, { new: true });
    if (!movement) {
      return res.status(404).json({ success: false, message: 'Movement not found' });
    }
    res.json({ success: true, data: movement, message: 'Movement updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE movement
router.delete('/movements/:id', async (req, res) => {
  try {
    const movement = await Movement.findOneAndDelete({ _id: req.params.id, ownerEmail: req.user.email });
    if (!movement) {
      return res.status(404).json({ success: false, message: 'Movement not found' });
    }
    res.json({ success: true, message: 'Movement deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
