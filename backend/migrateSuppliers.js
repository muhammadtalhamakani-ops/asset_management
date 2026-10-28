import 'dotenv/config';
import mongoose from 'mongoose';
import { initializeSuppliers } from './suppliers.js';

try {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('Supplier migration complete:', await initializeSuppliers());
} catch {
  console.error('Supplier migration failed. Check database connectivity and indexes.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
