import mongoose from 'mongoose';

const returnSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
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
    qrCode: {
      type: String,
      default: 'Not recorded',
    },
    type: {
      type: String,
      enum: ['Return', 'Damage', 'Loss', 'Variance'],
      required: true,
      index: true,
    },
    quantityIssued: {
      type: Number,
      required: true,
    },
    quantityReturned: {
      type: Number,
      default: 0,
    },
    quantityDamaged: {
      type: Number,
      default: 0,
    },
    quantityMissing: {
      type: Number,
      default: 0,
    },
    condition: {
      type: String,
      enum: ['Good', 'Damaged', 'Missing', 'Destroyed'],
      required: true,
    },
    damageDescription: {
      type: String,
      default: '',
    },
    responsibleParty: {
      type: String,
      required: true,
    },
    returnDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    location: {
      type: String,
      required: true,
    },
    resolution: {
      type: String,
      enum: ['Closed', 'Replacement pending', 'Repair pending', 'Under investigation'],
      default: 'Closed',
      index: true,
    },
    replacementCost: {
      type: Number,
      default: 0,
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
  },
  {
    timestamps: true,
  }
);

export const Return = mongoose.model('Return', returnSchema);
