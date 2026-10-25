import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['Countable / Consumable', 'Material', 'Reusable asset', 'Scaffolding', 'Formwork', 'Assembly / Kit'],
    },
    serial: {
      type: String,
      default: 'Not recorded',
    },
    assetTagId: {
      type: String,
      default: 'Not recorded',
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    subcategory: {
      type: String,
      default: 'Not recorded',
    },
    description: {
      type: String,
      default: 'Not recorded',
    },
    manufacturer: {
      type: String,
      default: 'Not recorded',
    },
    model: {
      type: String,
      default: 'Not recorded',
    },
    warranty: {
      type: String,
      default: 'Not recorded',
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    unit: {
      type: String,
      required: true,
      enum: ['pieces', 'units', 'meters', 'kg', 't', 'set', 'box', 'packet'],
    },
    minimum: {
      type: Number,
      required: true,
      default: 0,
    },
    unitCost: {
      type: Number,
      required: true,
      default: 0,
    },
    value: {
      type: String,
      default: 'AED 0',
    },
    supplier: {
      type: String,
      default: 'Not recorded',
    },
    purchaseDate: {
      type: Date,
      required: true,
      default: null,
    },
    receiveDate: {
      type: Date,
      required: true,
      default: null,
    },
    project: {
      type: String,
      default: 'Not recorded',
      index: true,
    },
    location: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['Available', 'In use', 'In transit', 'Low stock', 'Under inspection', 'Damaged'],
      default: 'Available',
      index: true,
    },
    qrCode: {
      type: String,
      default: 'Not recorded',
      unique: true,
      sparse: true,
    },
    attachments: {
      type: String,
      default: 'No files',
    },
    remarks: {
      type: String,
      default: 'No remarks',
    },
    createdBy: {
      type: String,
      default: 'System',
    },
    lastModifiedBy: {
      type: String,
      default: 'System',
    },
    ownerEmail: {
      type: String,
      required: true,
      index: true,
      default: 'system@fieldstock.local',
    },
  },
  {
    timestamps: true,
  }
);

export const Asset = mongoose.model('Asset', assetSchema);
