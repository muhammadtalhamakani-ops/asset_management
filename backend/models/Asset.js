import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      uppercase: true,
      immutable: true,
    },
    name: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
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
      default: 1,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      enum: ['unit', 'pieces', 'units', 'meters', 'kg', 't', 'set', 'box', 'packet'],
      default: 'unit',
    },
    minimum: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    unitCost: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    value: {
      type: String,
      default: 'AED 0',
    },
    supplier: {
      type: String,
      default: 'Not recorded',
    },
    deliveryNote: { type: String, trim: true },
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
      default: 'Available',
      index: true,
    },
    qrCode: {
      type: String,
      default: 'Not recorded',
      unique: true,
      sparse: true,
    },
    attachments: [{ originalName: String, mimeType: String, size: Number, storageKey: { type: String, select: false } }],
    legacyAttachments: { type: String, default: '' },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SetupItem', index: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'SetupItem', index: true },
    makeId: { type: mongoose.Schema.Types.ObjectId, ref: 'SetupItem' },
    modelId: { type: mongoose.Schema.Types.ObjectId, ref: 'SetupItem' },
    warrantyId: { type: mongoose.Schema.Types.ObjectId, ref: 'SetupItem' },
    statusId: { type: mongoose.Schema.Types.ObjectId, ref: 'SetupItem', index: true },
    statusKey: { type: String, default: '' },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    isActive: { type: Boolean, default: true, index: true },
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
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  }
);

export const Asset = mongoose.model('Asset', assetSchema);
