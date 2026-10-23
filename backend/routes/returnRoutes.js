import express from 'express';
import { Return } from '../models/Return.js';
import { Asset } from '../models/Asset.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// GET all returns/damage records
router.get('/returns', async (req, res) => {
  try {
    const { type, resolution, dateFrom, dateTo, responsibleParty } = req.query;
    let query = { ownerEmail: req.user.email };

    if (type) query.type = type;
    if (resolution) query.resolution = resolution;
    if (responsibleParty) query.responsibleParty = responsibleParty;
    if (dateFrom || dateTo) {
      query.returnDate = {};
      if (dateFrom) query.returnDate.$gte = new Date(dateFrom);
      if (dateTo) query.returnDate.$lte = new Date(dateTo);
    }

    const returns = await Return.find(query)
      .sort({ returnDate: -1 })
      .populate('assetId');

    res.json({ success: true, data: returns, count: returns.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single return record
router.get('/returns/:id', async (req, res) => {
  try {
    const returnRecord = await Return.findOne({ _id: req.params.id, ownerEmail: req.user.email }).populate('assetId');
    if (!returnRecord) {
      return res.status(404).json({ success: false, message: 'Return record not found' });
    }
    res.json({ success: true, data: returnRecord });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE return/damage record
router.post('/returns', async (req, res) => {
  try {
    const {
      assetCode,
      qrCode,
      returnDate,
      type,
      quantityIssued,
      quantityReturned,
      quantityDamaged,
      quantityMissing,
      condition,
      damageDescription,
      responsibleParty,
      location,
      recordedBy,
      remarks,
    } = req.body;

    const asset = await Asset.findOne({ code: assetCode, ownerEmail: req.user.email });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    const recordId = `RTN-${Date.now().toString().slice(-4)}`;
    const returnRecord = new Return({
      id: recordId,
      assetId: asset._id,
      assetCode: asset.code,
      assetName: asset.name,
      qrCode: asset.qrCode || qrCode || 'Not recorded',
      type,
      quantityIssued,
      quantityReturned: quantityReturned || 0,
      quantityDamaged: quantityDamaged || 0,
      quantityMissing: quantityMissing || 0,
      condition,
      returnDate: returnDate ? new Date(returnDate) : undefined,
      damageDescription,
      responsibleParty,
      location,
      recordedBy,
      ownerEmail: req.user.email,
      remarks,
      replacementCost: quantityDamaged ? quantityDamaged * asset.unitCost : 0,
    });

    await returnRecord.save();

    // Update asset quantity if items are returned
    if (quantityReturned) {
      asset.quantity += quantityReturned;
    }

    // Update asset status if damaged
    if (quantityDamaged > 0) {
      asset.status = 'Damaged';
    }

    asset.value = `AED ${(asset.quantity * asset.unitCost).toLocaleString()}`;
    await asset.save();

    res.status(201).json({ success: true, data: returnRecord, message: 'Return record created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE return record
router.put('/returns/:id', async (req, res) => {
  try {
    const { resolution, replacementCost, remarks } = req.body;

    const returnRecord = await Return.findOne({ _id: req.params.id, ownerEmail: req.user.email });
    if (!returnRecord) {
      return res.status(404).json({ success: false, message: 'Return record not found' });
    }

    returnRecord.resolution = resolution || returnRecord.resolution;
    returnRecord.replacementCost = replacementCost !== undefined ? replacementCost : returnRecord.replacementCost;
    returnRecord.remarks = remarks || returnRecord.remarks;

    await returnRecord.save();

    res.json({ success: true, data: returnRecord, message: 'Return record updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE return record
router.delete('/returns/:id', async (req, res) => {
  try {
    const returnRecord = await Return.findOneAndDelete({ _id: req.params.id, ownerEmail: req.user.email });
    if (!returnRecord) {
      return res.status(404).json({ success: false, message: 'Return record not found' });
    }
    res.json({ success: true, message: 'Return record deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get return statistics
router.get('/returns-stats/summary', async (req, res) => {
  try {
    const totalReturns = await Return.countDocuments({ ownerEmail: req.user.email });
    const byType = await Return.aggregate([
      {
        $match: { ownerEmail: req.user.email },
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalCost: { $sum: '$replacementCost' },
        },
      },
    ]);

    const byResolution = await Return.aggregate([
      {
        $match: { ownerEmail: req.user.email },
      },
      {
        $group: {
          _id: '$resolution',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        totalReturns,
        byType,
        byResolution,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
