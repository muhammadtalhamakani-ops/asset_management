import express from 'express';
import crypto from 'node:crypto';
import { assetData, setAssetStatus, hasAssetStatus, invalid } from '../assetCatalog.js';
import { Inspection } from '../models/Inspection.js';
import { Asset } from '../models/Asset.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// GET all inspections
router.get('/inspections', async (req, res) => {
  try {
    const { status, assetCode, dateFrom, dateTo } = req.query;
    let query = {};

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
    res.status(error.status || (error.name === 'ValidationError' ? 400 : error.name === 'VersionError' ? 409 : 500)).json({ success: false, message: error.status ? error.message : error.name === 'VersionError' ? 'Asset changed. Reload and try again.' : error.name === 'ValidationError' ? 'Invalid workflow data.' : 'Unable to complete the request.' });
  }
});

// GET single inspection
router.get('/inspections/:id', async (req, res) => {
  try {
    const inspection = await Inspection.findOne({ _id: req.params.id }).populate('assetId');
    if (!inspection) {
      return res.status(404).json({ success: false, message: 'Inspection not found' });
    }
    res.json({ success: true, data: inspection });
  } catch (error) {
    res.status(error.status || (error.name === 'ValidationError' ? 400 : error.name === 'VersionError' ? 409 : 500)).json({ success: false, message: error.status ? error.message : error.name === 'VersionError' ? 'Asset changed. Reload and try again.' : error.name === 'ValidationError' ? 'Invalid workflow data.' : 'Unable to complete the request.' });
  }
});

// CREATE inspection
router.post('/inspections', async (req, res) => {
  try {
    const { assetCode, type, checklist, condition, status, location, inspector, nextInspectionDue, remarks } = req.body;

    const asset = await Asset.findOne({ code: assetCode, isActive: true });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    const inspectionId = `INSP-${crypto.randomUUID()}`;
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
    });

    await inspection.save();

    // Update asset status based on inspection
    if (status === 'Pass' && await hasAssetStatus(asset, 'underInspection')) {
      await setAssetStatus(asset, 'available');
    } else if (status === 'Fail' || status === 'Needs Repair') {
      await setAssetStatus(asset, 'damaged');
    }
    asset.lastModifiedBy = inspector?.name || 'System';
    await asset.save({ validateModifiedOnly: true });

    res.status(201).json({ success: true, data: inspection, asset: await assetData(asset), message: 'Inspection recorded successfully' });
  } catch (error) {
    res.status(error.status || (error.name === 'ValidationError' ? 400 : error.name === 'VersionError' ? 409 : 500)).json({ success: false, message: error.status ? error.message : error.name === 'VersionError' ? 'Asset changed. Reload and try again.' : error.name === 'ValidationError' ? 'Invalid workflow data.' : 'Unable to complete the request.' });
  }
});

// UPDATE inspection
router.put('/inspections/:id', async (req, res) => {
  try {
    const { checklist, condition, status, correctionActions, nextInspectionDue } = req.body;

    const inspection = await Inspection.findOne({ _id: req.params.id });
    if (!inspection) {
      return res.status(404).json({ success: false, message: 'Inspection not found' });
    }

    if (checklist) inspection.checklist = checklist;
    inspection.condition = condition || inspection.condition;
    inspection.status = status || inspection.status;
    inspection.correctionActions = correctionActions || inspection.correctionActions;
    inspection.nextInspectionDue = nextInspectionDue || inspection.nextInspectionDue;


    const asset = await Asset.findOne({ _id: inspection.assetId, isActive: true });
    if (!asset) throw invalid('Active asset not found.', 404);
    await inspection.save();

    // Update asset status
    if (asset) {
      if (inspection.status === 'Pass') {
        await setAssetStatus(asset, 'available');
      } else if (inspection.status === 'Fail' || inspection.status === 'Needs Repair') {
        await setAssetStatus(asset, 'damaged');
      }
      await asset.save({ validateModifiedOnly: true });
    }

    res.json({ success: true, data: inspection, asset: await assetData(asset), message: 'Inspection updated successfully' });
  } catch (error) {
    res.status(error.status || (error.name === 'ValidationError' ? 400 : error.name === 'VersionError' ? 409 : 500)).json({ success: false, message: error.status ? error.message : error.name === 'VersionError' ? 'Asset changed. Reload and try again.' : error.name === 'ValidationError' ? 'Invalid workflow data.' : 'Unable to complete the request.' });
  }
});

// DELETE inspection
router.delete('/inspections/:id', async (req, res) => {
  try {
    const inspection = await Inspection.findOneAndDelete({ _id: req.params.id });
    if (!inspection) {
      return res.status(404).json({ success: false, message: 'Inspection not found' });
    }
    res.json({ success: true, message: 'Inspection deleted successfully' });
  } catch (error) {
    res.status(error.status || (error.name === 'ValidationError' ? 400 : error.name === 'VersionError' ? 409 : 500)).json({ success: false, message: error.status ? error.message : error.name === 'VersionError' ? 'Asset changed. Reload and try again.' : error.name === 'ValidationError' ? 'Invalid workflow data.' : 'Unable to complete the request.' });
  }
});

export default router;
