import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  isActive: { type: Boolean, default: true },
}, { collection: 'projects', timestamps: true, id: false });

export const Project = mongoose.model('Project', schema);
