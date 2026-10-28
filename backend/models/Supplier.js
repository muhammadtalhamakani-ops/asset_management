import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, immutable: true, match: /^\d{6}$/ },
    companyName: { type: String, required: true, trim: true },
    contactPerson: { type: String, default: '', trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    phone: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    taxId: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { collection: 'suppliers', timestamps: true, autoCreate: true }
);

supplierSchema.index({ code: 1 }, { unique: true, partialFilterExpression: { code: { $type: 'string' } } });

export const Supplier = mongoose.model('Supplier', supplierSchema);
