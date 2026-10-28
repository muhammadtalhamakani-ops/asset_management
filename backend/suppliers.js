import { Supplier } from './models/Supplier.js';
import { SupplierCounter } from './models/SupplierCounter.js';

export async function nextSupplierCode() {
  const counter = await SupplierCounter.findOneAndUpdate(
    { _id: 'suppliers', value: { $lt: 999999 } },
    { $inc: { value: 1 } }, { new: true, runValidators: true },
  );
  if (!counter) throw Object.assign(new Error('Supplier code sequence is exhausted.'), { status: 409 });
  return String(counter.value).padStart(6, '0');
}

export async function initializeSuppliers() {
  await Promise.all([Supplier.init(), SupplierCounter.init()]);
  const collection = Supplier.collection;
  const missingCode = { $or: [{ code: { $exists: false } }, { code: null }, { code: '' }] };
  const highest = await collection.find({ code: /^\d{6}$/ }).sort({ code: -1 }).limit(1).next();
  try {
    await SupplierCounter.updateOne({ _id: 'suppliers' }, { $max: { value: Number(highest?.code || 0) } }, { upsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    await SupplierCounter.updateOne({ _id: 'suppliers' }, { $max: { value: Number(highest?.code || 0) } });
  }

  // Only remove indexes tied to the retired user ownership fields.
  for (const index of await collection.indexes()) {
    if (Object.hasOwn(index.key, 'ownerEmail')) {
      try { await collection.dropIndex(index.name); }
      catch (error) { if (error.code !== 27) throw error; }
    }
  }
  await collection.updateMany({ isActive: { $exists: false } }, [
    { $set: { isActive: { $ne: ['$status', 'Inactive'] } } },
  ]);
  await collection.updateMany({}, { $unset: { ownerEmail: '', createdBy: '', status: '' } });

  let assigned = 0;
  for await (const supplier of collection.find(missingCode).sort({ _id: 1 })) {
    const code = await nextSupplierCode();
    const result = await collection.updateOne({ _id: supplier._id, ...missingCode }, { $set: { code } });
    assigned += result.modifiedCount;
  }
  return { assigned, total: await collection.countDocuments(), active: await collection.countDocuments({ isActive: true }) };
}
