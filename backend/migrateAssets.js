import 'dotenv/config';
import mongoose from 'mongoose';
import { previewAssetMigration, migrateAssets } from './assetMigration.js';

try {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  // Preview must not initialize collections/indexes.
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 10000 });
  console.log(JSON.stringify(process.argv.includes('--apply') ? await migrateAssets() : await previewAssetMigration(), null, 2));
} catch (error) {
  console.error('Asset migration failed:', error.name === 'Error' ? error.message : 'Check database connectivity and indexes.');
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
