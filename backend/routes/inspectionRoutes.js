import express from 'express';
import { Inspection } from '../models/Inspection.js';
import { Asset } from '../models/Asset.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// GET all inspections
router.get('/inspections', async (req, res) => {
  try {
    const { status, assetCode, dateFrom, dateTo } = req.query;
    let query = { ownerEmail: req.user.email };

    if (status) query.status = status;
    if (assetCode) query.assetCode = assetCode;
    if (dateFrom || dateTo) {
      query.inspectionDate = {};
      if (dateFrom) query.inspectionDate.$gte = new Date(dateFrom);
      if (dateTo) query.inspectionDate.$lte = new Date(dateTo);
    }

    const inspections = await Inspection.find(query)
      .sort({ inspectionDate: -1 })
      .populate('assetId');

    res.json({ success: true, data: inspections, count: inspections.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single inspection
router.get('/inspections/:id', async (req, res) => {
  try {
    const inspection = await Inspection.findOne({ _id: req.params.id, ownerEmail: req.user.email }).populate('assetId');
    if (!inspection) {
      return res.status(404).json({ success: false, message: 'Inspection not found' });
    }
    res.json({ success: true, data: inspection });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE inspection
router.post('/inspections', async (req, res) => {
  try {
    const { assetCode, type, checklist, condition, status, location, inspector, nextInspectionDue, remarks } = req.body;

    const asset = await Asset.findOne({ code: assetCode, ownerEmail: req.user.email });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    const inspectionId = `INSP-${Date.now().toString().slice(-4)}`;
    const inspection = new Inspection({
      id: inspectionId,
      assetId: asset._id,
      assetCode: asset.code,
      assetName: asset.name,
      type,
      checklist,
      condition,
      status,
      location,
      inspector,
      nextInspectionDue: nextInspectionDue ? new Date(nextInspectionDue) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      remarks,
      ownerEmail: req.user.email,
    });

    await inspection.save();

    // Update asset status based on inspection
    if (status === 'Pass' && asset.status === 'Under inspection') {
      asset.status = 'Available';
    } else if (status === 'Fail' || status === 'Needs Repair') {
      asset.status = 'Damaged';
    }
    asset.lastModifiedBy = inspector?.name || 'System';
    await asset.save();

    res.status(201).json({ success: true, data: inspection, message: 'Inspection recorded successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE inspection
router.put('/inspections/:id', async (req, res) => {
  try {
    const { checklist, condition, status, correctionActions, nextInspectionDue } = req.body;

    const inspection = await Inspection.findOne({ _id: req.params.id, ownerEmail: req.user.email });
    if (!inspection) {
      return res.status(404).json({ success: false, message: 'Inspection not found' });
    }

    if (checklist) inspection.checklist = checklist;
    inspection.condition = condition || inspection.condition;
    inspection.status = status || inspection.status;
    inspection.correctionActions = correctionActions || inspection.correctionActions;
    inspection.nextInspectionDue = nextInspectionDue || inspection.nextInspectionDue;


    await inspection.save();

    // Update asset status
    const asset = await Asset.findOne({ _id: inspection.assetId, ownerEmail: req.user.email });
    if (asset) {
      if (inspection.status === 'Pass') {
        asset.status = 'Available';
      } else if (inspection.status === 'Fail' || inspection.status === 'Needs Repair') {
        asset.status = 'Damaged';
      }
      await asset.save();
    }

    res.json({ success: true, data: inspection, message: 'Inspection updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE inspection
router.delete('/inspections/:id', async (req, res) => {
  try {
    const inspection = await Inspection.findOneAndDelete({ _id: req.params.id, ownerEmail: req.user.email });
    if (!inspection) {
      return res.status(404).json({ success: false, message: 'Inspection not found' });
    }
    res.json({ success: true, message: 'Inspection deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
