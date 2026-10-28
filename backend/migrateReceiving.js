import 'dotenv/config';
import mongoose from 'mongoose';
import { migrateReceiving } from './receivingMigration.js';

try {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 10000 });
  console.log(JSON.stringify(await migrateReceiving({ apply: process.argv.includes('--apply') }), null, 2));
} catch (error) {
  console.error('Receiving migration failed:', error.name === 'Error' ? error.message : 'Check database connectivity.');
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
