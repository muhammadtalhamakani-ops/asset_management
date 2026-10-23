import express from 'express';
import crypto from 'node:crypto';
import { Asset } from '../models/Asset.js';
import { Movement } from '../models/Movement.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// GET all assets with filters
router.get('/assets', async (req, res) => {
  try {
    const { status, category, location, project, search } = req.query;
    let query = { ownerEmail: req.user.email };

    if (status) query.status = status;
    if (category) query.category = category;
    if (location) query.location = location;
    if (project) query.project = project;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { serial: { $regex: search, $options: 'i' } },
        { qrCode: { $regex: search, $options: 'i' } },
      ];
    }

    const assets = await Asset.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: assets, count: assets.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET asset by ID or code
router.get('/assets/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    let asset = await Asset.findOne({ _id: identifier, ownerEmail: req.user.email }).catch(() => null);
    
    if (!asset) {
      asset = await Asset.findOne({
        ownerEmail: req.user.email,
        $or: [{ code: identifier }, { qrCode: identifier }],
      });
    }

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    res.json({ success: true, data: asset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE new asset
router.post('/assets', async (req, res) => {
  try {
    const { code, name, type, quantity, unitCost, qrCode: _providedQrCode, ...otherData } = req.body;
    const requiredFields = ['category', 'department', 'purchaseDate', 'receiveDate'];
    const missingFields = [!String(code || '').trim() && 'Asset ID / code', ...requiredFields.filter((field) => !String(otherData[field] || '').trim())].filter(Boolean);
    if (missingFields.length > 0) {
      return res.status(400).json({ success: false, message: `Required fields: ${missingFields.join(', ')}.` });
    }
    if (Number.isNaN(new Date(otherData.purchaseDate).getTime()) || Number.isNaN(new Date(otherData.receiveDate).getTime())) {
      return res.status(400).json({ success: false, message: 'Order date and receive date must be valid dates.' });
    }

    // Check if code already exists
    const existing = await Asset.findOne({ code, ownerEmail: req.user.email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Asset code already exists' });
    }

    const totalValue = quantity * unitCost;
    const asset = new Asset({
      code,
      name,
      type,
      quantity,
      unitCost,
      value: `AED ${totalValue.toLocaleString()}`,
      ...otherData,
      ownerEmail: req.user.email,
      assetTagId: `TAG-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`,
      qrCode: `QR-${code}-${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`,
    });

    await asset.save();
    res.status(201).json({ success: true, data: asset, message: 'Asset created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE asset
router.put('/assets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, unitCost, ...otherData } = req.body;

    let updateData = { ...otherData };

    // Recalculate value if quantity or unitCost changed
    if (quantity !== undefined || unitCost !== undefined) {
      const asset = await Asset.findOne({ _id: id, ownerEmail: req.user.email });
      if (!asset) {
        return res.status(404).json({ success: false, message: 'Asset not found' });
      }

      const newQuantity = quantity !== undefined ? quantity : asset.quantity;
      const newUnitCost = unitCost !== undefined ? unitCost : asset.unitCost;
      updateData.quantity = newQuantity;
      updateData.unitCost = newUnitCost;
      updateData.value = `AED ${(newQuantity * newUnitCost).toLocaleString()}`;
    }

    delete updateData.ownerEmail;
    const asset = await Asset.findOneAndUpdate({ _id: id, ownerEmail: req.user.email }, updateData, { new: true });

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    res.json({ success: true, data: asset, message: 'Asset updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE asset
router.delete('/assets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await Asset.findOneAndDelete({ _id: id, ownerEmail: req.user.email });

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    // Delete related movements
    await Movement.deleteMany({ assetId: id, ownerEmail: req.user.email });

    res.json({ success: true, message: 'Asset deleted successfully', data: asset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET asset statistics
router.get('/assets-stats/summary', async (req, res) => {
  try {
    const totalAssets = await Asset.countDocuments({ ownerEmail: req.user.email });
    const totalValue = await Asset.aggregate([
      {
        $match: { ownerEmail: req.user.email },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $toInt: {
                $regexFind: { input: '$value', regex: /\d+/ }.captures[0],
              },
            },
          },
        },
      },
    ]);

    const byStatus = await Asset.aggregate([
      {
        $match: { ownerEmail: req.user.email },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const byCategory = await Asset.aggregate([
      {
        $match: { ownerEmail: req.user.email },
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        totalAssets,
        totalValue: totalValue[0]?.total || 0,
        byStatus,
        byCategory,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update asset stock level
router.patch('/assets/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantityChange } = req.body;

    const asset = await Asset.findOne({ _id: id, ownerEmail: req.user.email });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    const newQuantity = asset.quantity + quantityChange;
    if (newQuantity < 0) {
      return res.status(400).json({ success: false, message: 'Insufficient stock' });
    }

    asset.quantity = newQuantity;
    asset.value = `AED ${(newQuantity * asset.unitCost).toLocaleString()}`;

    // Update status based on stock level
    if (newQuantity === 0) {
      asset.status = 'Low stock';
    } else if (newQuantity >= asset.minimum && asset.status === 'Low stock') {
      asset.status = 'Available';
    }

    await asset.save();

    res.json({ success: true, data: asset, message: 'Stock updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
