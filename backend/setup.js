import { SetupMaster } from './models/SetupMaster.js';
import { SetupItem } from './models/SetupItem.js';
import { SetupCounter } from './models/SetupCounter.js';

export const defaultSetupMasters = ['Asset Category', 'Warranty', 'Make', 'Model', 'Department'];

export async function initializeSetup() {
  await Promise.all([SetupMaster.init(), SetupItem.init(), SetupCounter.init()]);
  // A retained high-water mark protects codes even when items are deactivated.
  try {
    await SetupCounter.updateOne({ _id: 'setup-items' }, { $setOnInsert: { value: 0 } }, { upsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
}

export async function seedSetupMasters() {
  await initializeSetup();
  // Preserve the existing master ID and its items when correcting the old label.
  if (!await SetupMaster.exists({ name: 'Asset Category' })) {
    try {
      await SetupMaster.updateOne({ name: 'Assets Category' }, { $set: { name: 'Asset Category' } }, { runValidators: true });
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }
  for (const name of defaultSetupMasters) {
    try {
      await SetupMaster.updateOne({ name }, { $setOnInsert: { name, isActive: true } }, { upsert: true });
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }
}

export async function nextSetupCode() {
  const counter = await SetupCounter.findOneAndUpdate(
    { _id: 'setup-items', value: { $lt: 999999 } },
    { $inc: { value: 1 } },
    { new: true, runValidators: true },
  );
  if (!counter) {
    const error = new Error('Setup item code sequence is exhausted.');
    error.status = 409;
    throw error;
  }
  return String(counter.value).padStart(6, '0');
}
