import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    contactPerson: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    phone: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    taxId: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    ownerEmail: { type: String, required: true, index: true },
  },
  { collection: 'suppliers', timestamps: true, autoCreate: true }
);

supplierSchema.index({ ownerEmail: 1, companyName: 1 }, { unique: true });

export const Supplier = mongoose.model('Supplier', supplierSchema);