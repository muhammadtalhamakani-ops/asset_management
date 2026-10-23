import mongoose from 'mongoose';

const movementSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['receive', 'issue', 'transfer', 'return', 'damage'],
      required: true,
      index: true,
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
    },
    assetCode: {
      type: String,
      required: true,
    },
    assetName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
    fromLocation: {
      type: String,
      default: null,
    },
    toLocation: {
      type: String,
      default: null,
    },
    supplier: {
      type: String,
      default: null,
    },
    grn: {
      type: String,
      default: null,
    },
    billNo: {
      type: String,
      default: null,
    },
    recipientName: {
      type: String,
      default: null,
    },
    purchaseOrder: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['Transferred', 'Issued', 'Received', 'Returned', 'Pending'],
      default: 'Pending',
      index: true,
    },
    remarks: {
      type: String,
      default: '',
    },
    recordedBy: {
      type: String,
      required: true,
    },
    ownerEmail: {
      type: String,
      required: true,
      index: true,
      default: 'system@fieldstock.local',
    },
    project: {
      type: String,
      default: 'Not recorded',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Movement = mongoose.model('Movement', movementSchema);
