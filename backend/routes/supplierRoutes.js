import express from 'express';
import { Supplier } from '../models/Supplier.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

router.get('/suppliers', async (req, res) => {
  try {
    const suppliers = await Supplier.find({ ownerEmail: req.user.email }).sort({ companyName: 1 });
    res.json({ success: true, data: suppliers, count: suppliers.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/suppliers', async (req, res) => {
  try {
    const companyName = String(req.body.companyName || '').trim();
    if (!companyName) {
      return res.status(400).json({ success: false, message: 'Supplier name is required.' });
    }

    const supplier = await Supplier.create({
      ...req.body,
      companyName,
      ownerEmail: req.user.email,
    });
    res.status(201).json({ success: true, data: supplier, message: 'Supplier registered successfully.' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A supplier with this name is already registered.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;