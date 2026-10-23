import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

// Import routes
import assetRoutes from './routes/assetRoutes.js';
import movementRoutes from './routes/movementRoutes.js';
import inspectionRoutes from './routes/inspectionRoutes.js';
import returnRoutes from './routes/returnRoutes.js';
import assemblyRoutes from './routes/assemblyRoutes.js';
import authRoutes from './routes/authRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// MongoDB Connection
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  });

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Asset Management API is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api', authRoutes);
app.use('/api', assetRoutes);
app.use('/api', movementRoutes);
app.use('/api', inspectionRoutes);
app.use('/api', returnRoutes);
app.use('/api', assemblyRoutes);
app.use('/api', supplierRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Asset Management Portal API',
    version: '1.0.0',
    endpoints: {
      assets: '/api/assets',
      movements: '/api/movements',
      inspections: '/api/inspections',
      returns: '/api/returns',
      assemblies: '/api/assemblies',
      health: '/api/health',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Error handling middleware
app.use((error, req, res, _next) => {
  console.error('Error:', error);
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Asset Management API running on http://localhost:${PORT}`);
  console.log(`📊 Database: MongoDB`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⛔ Shutting down gracefully...');
  mongoose.connection.close();
  process.exit(0);
});
