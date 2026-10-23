import mongoose from 'mongoose';

const assemblySchema = new mongoose.Schema(
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
    },
    type: {
      type: String,
      enum: ['Scaffolding', 'Formwork', 'Other'],
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    parentAssets: [
      {
        assetId: mongoose.Schema.Types.ObjectId,
        assetCode: String,
        assetName: String,
        quantity: Number,
        unit: String,
      },
    ],
    components: [
      {
        componentName: String,
        required: Number,
        onAssembly: Number,
        condition: {
          type: String,
          enum: ['Pass', 'Missing', 'Damaged'],
          default: 'Pass',
        },
      },
    ],
    status: {
      type: String,
      enum: ['Available', 'In use', 'Incomplete', 'Under inspection', 'Damaged'],
      default: 'Available',
      index: true,
    },
    location: {
      type: String,
      required: true,
    },
    project: {
      type: String,
      required: true,
    },
    lastInspection: {
      type: Date,
      default: null,
    },
    nextInspectionDue: {
      type: Date,
      default: null,
    },
    remarks: {
      type: String,
      default: '',
    },
    createdBy: {
      type: String,
      default: 'System',
    },
    ownerEmail: {
      type: String,
      required: true,
      index: true,
      default: 'system@fieldstock.local',
    },
    qrCode: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Assembly = mongoose.model('Assembly', assemblySchema);
