import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  _id: String,
  value: { type: Number, required: true, min: 0, max: 999999 },
}, { collection: 'setup_counters', id: false });

export const SetupCounter = mongoose.model('SetupCounter', schema);
