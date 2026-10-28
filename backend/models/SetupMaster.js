import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  isActive: { type: Boolean, default: true },
}, { collection: 'setup_master', id: false });

export const SetupMaster = mongoose.model('SetupMaster', schema);
