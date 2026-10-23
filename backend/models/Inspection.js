import mongoose from 'mongoose';

const inspectionSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ['Safety check', 'Maintenance', 'Condition assessment', 'Compliance'],
      required: true,
    },
    checklist: {
      type: [
        {
          item: String,
          checked: Boolean,
          remarks: String,
        },
      ],
      default: [],
    },
    condition: {
      type: String,
      enum: ['Good', 'Fair', 'Poor'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Pass', 'Fail', 'Needs Repair'],
      required: true,
      index: true,
    },
    location: {
      type: String,
      required: true,
    },
    inspector: {
      name: String,
      signature: String,
    },
    correctionActions: [
      {
        action: String,
        assignedTo: String,
        dueDate: Date,
        completed: Boolean,
      },
    ],
    nextInspectionDue: {
      type: Date,
      default: null,
    },
    remarks: {
      type: String,
      default: '',
    },
    inspectionDate: {
      type: Date,
      default: Date.now,
      index: true,
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

export const Inspection = mongoose.model('Inspection', inspectionSchema);
