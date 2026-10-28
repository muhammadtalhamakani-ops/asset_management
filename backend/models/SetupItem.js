import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, immutable: true, match: /^\d{6}$/ },
  name: { type: String, required: true, trim: true },
  normalizedName: { type: String, required: true, select: false },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'SetupMaster', required: true, immutable: true },
  isActive: { type: Boolean, default: true },
  systemKey: { type: String, immutable: true },
}, { collection: 'setup_items', id: false });

schema.pre('validate', function () {
  if (typeof this.name === 'string') this.normalizedName = this.name.trim().toLowerCase();
});
schema.index({ parentId: 1, normalizedName: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
schema.index({ parentId: 1, isActive: 1, code: 1 });
schema.index({ systemKey: 1 }, { unique: true, partialFilterExpression: { systemKey: { $type: 'string' } } });

export const SetupItem = mongoose.model('SetupItem', schema);
