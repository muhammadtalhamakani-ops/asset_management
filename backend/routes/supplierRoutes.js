import express from 'express';
import mongoose from 'mongoose';
import { Supplier } from '../models/Supplier.js';
import { requireAuth } from '../middleware/auth.js';
import { nextSupplierCode } from '../suppliers.js';

const router = express.Router();
router.use(requireAuth);

router.get('/suppliers', async (_req, res) => {
  try {
    const suppliers = await Supplier.find({ isActive: true }).sort({ companyName: 1 });
    res.json({ success: true, data: suppliers, count: suppliers.length });
  } catch (error) {
    supplierError(res, error);
  }
});

router.post('/suppliers', async (req, res) => {
  try {
    const fields = supplierFields(req.body);
    const code = await nextSupplierCode();
    const supplier = await Supplier.create({ ...fields, code, isActive: true });
    res.status(201).json({ success: true, data: supplier, message: 'Supplier registered successfully.' });
  } catch (error) {
    supplierError(res, error);
  }
});

router.put('/suppliers/:id', async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid supplier ID.' });
    }
    const fields = supplierFields(req.body);
    const data = await Supplier.findOneAndUpdate(
      { _id: req.params.id, isActive: true }, { $set: fields }, { new: true, runValidators: true },
    );
    if (!data) return res.status(404).json({ success: false, message: 'Active supplier not found.' });
    res.json({ success: true, data, message: 'Supplier updated.' });
  } catch (error) { supplierError(res, error); }
});

function supplierFields(body) {
  const companyName = typeof body?.companyName === 'string' ? body.companyName.trim() : '';
  if (!companyName) throw Object.assign(new Error('Supplier name is required.'), { status: 400 });
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error('A valid supplier email is required.'), { status: 400 });
  }
  const fields = { companyName, email };
  for (const field of ['contactPerson', 'phone', 'address', 'taxId', 'notes']) {
    if (body[field] !== undefined && typeof body[field] !== 'string') {
      throw Object.assign(new Error(`${field} must be text.`), { status: 400 });
    }
    fields[field] = (body[field] || '').trim();
  }
  return fields;
}

router.delete('/suppliers/:id', async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid supplier ID.' });
    }
    const data = await Supplier.findOneAndUpdate(
      { _id: req.params.id, isActive: true }, { $set: { isActive: false } }, { new: true, runValidators: true },
    );
    if (!data) return res.status(404).json({ success: false, message: 'Active supplier not found.' });
    res.json({ success: true, data, message: 'Supplier deactivated.' });
  } catch (error) { supplierError(res, error); }
});

function supplierError(res, error) {
  const status = error.status || (error.code === 11000 ? 409 : error.name === 'ValidationError' ? 400 : 500);
  res.status(status).json({ success: false, message: status === 500 ? 'Unable to complete supplier request.'
    : error.code === 11000 ? 'Supplier code conflict. Please try again.' : error.message });
}

export default router;
