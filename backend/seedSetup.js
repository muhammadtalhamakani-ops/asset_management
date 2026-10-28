import 'dotenv/config';
import mongoose from 'mongoose';
import { seedSetupMasters } from './setup.js';

try {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  await seedSetupMasters();
  console.log('General Setup defaults and indexes initialized without deleting data.');
} catch {
  console.error('General Setup initialization failed. Check database configuration and connectivity.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
