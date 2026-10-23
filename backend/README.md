# Asset Management Portal Backend

This is the backend API for the Asset Management Portal application. It handles all database operations with MongoDB and provides RESTful APIs for asset management, movements, inspections, returns, and assemblies.

## Features

✅ **Asset Management** - Create, read, update, delete assets with complete tracking  
✅ **Movement Tracking** - Record receive, issue, and transfer operations  
✅ **Inspections** - Track asset inspections, conditions, and corrective actions  
✅ **Returns & Damage** - Log returns, damaged, and missing asset records  
✅ **Assemblies** - Manage scaffolding and formwork assemblies with component tracking  
✅ **MongoDB Integration** - Secure cloud database with MongoDB Atlas  
✅ **RESTful API** - Complete API endpoints for all operations  

## Prerequisites

- Node.js v16+ installed
- npm or yarn package manager
- MongoDB Atlas account with connection URI

## Installation

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create .env file with MongoDB connection:**
The `.env` file is already created with your MongoDB URI. Verify it contains:
```
MONGODB_URI=mongodb://talhamakani22_db_user:Talha123a@ac-hs7kvvt-shard-00-00.002rpt0.mongodb.net:27017,...
PORT=5000
NODE_ENV=development
```

## Running the Server

### Development mode (with auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Health Check
- `GET /api/health` - Check if API is running

### Asset Endpoints
- `GET /api/assets` - Get all assets with filters
- `GET /api/assets/:id` - Get single asset
- `POST /api/assets` - Create new asset
- `PUT /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset
- `GET /api/assets-stats/summary` - Get asset statistics
- `PATCH /api/assets/:id/stock` - Update asset stock level

### Movement Endpoints
- `GET /api/movements` - Get all movements with filters
- `GET /api/movements/:id` - Get single movement
- `POST /api/movements/receive` - Record receiving
- `POST /api/movements/issue` - Record issue/allocation
- `POST /api/movements/transfer` - Record transfer
- `PUT /api/movements/:id` - Update movement
- `DELETE /api/movements/:id` - Delete movement

### Inspection Endpoints
- `GET /api/inspections` - Get all inspections
- `GET /api/inspections/:id` - Get single inspection
- `POST /api/inspections` - Create inspection
- `PUT /api/inspections/:id` - Update inspection
- `DELETE /api/inspections/:id` - Delete inspection

### Return Endpoints
- `GET /api/returns` - Get all return records
- `GET /api/returns/:id` - Get single return record
- `POST /api/returns` - Create return/damage record
- `PUT /api/returns/:id` - Update return record
- `DELETE /api/returns/:id` - Delete return record
- `GET /api/returns-stats/summary` - Get return statistics

### Assembly Endpoints
- `GET /api/assemblies` - Get all assemblies
- `GET /api/assemblies/:id` - Get single assembly
- `POST /api/assemblies` - Create assembly
- `PUT /api/assemblies/:id` - Update assembly
- `DELETE /api/assemblies/:id` - Delete assembly
- `PATCH /api/assemblies/:id/components` - Update assembly component

## Database Models

### Asset
```javascript
{
  code: String (unique),
  name: String,
  type: String,
  serial: String,
  category: String,
  quantity: Number,
  unit: String,
  minimum: Number,
  unitCost: Number,
  value: String,
  location: String,
  status: String,
  supplier: String,
  purchaseDate: Date,
  project: String,
  qrCode: String,
  attachments: String,
  remarks: String
}
```

### Movement
```javascript
{
  id: String,
  type: String (receive|issue|transfer|return|damage),
  assetId: ObjectId,
  quantity: Number,
  fromLocation: String,
  toLocation: String,
  status: String,
  recordedBy: String,
  timestamp: Date
}
```

### Inspection
```javascript
{
  id: String,
  assetId: ObjectId,
  type: String,
  condition: String (Good|Fair|Poor),
  status: String (Pass|Fail|Needs Repair),
  checklist: Array,
  inspector: Object,
  nextInspectionDue: Date,
  inspectionDate: Date
}
```

### Return
```javascript
{
  id: String,
  assetId: ObjectId,
  type: String (Return|Damage|Loss|Variance),
  quantityIssued: Number,
  quantityReturned: Number,
  quantityDamaged: Number,
  quantityMissing: Number,
  condition: String,
  resolution: String,
  recordedBy: String,
  returnDate: Date
}
```

### Assembly
```javascript
{
  code: String,
  name: String,
  type: String,
  status: String,
  location: String,
  project: String,
  parentAssets: Array,
  components: Array,
  lastInspection: Date,
  nextInspectionDue: Date
}
```

## Frontend Integration

The frontend API client is available in `src/api/client.ts`. Import and use it in your React components:

```typescript
import { assetAPI, movementAPI, inspectionAPI, returnAPI, assemblyAPI } from './api/client';

// Get all assets
const response = await assetAPI.getAll({ status: 'Available' });

// Create new asset
const newAsset = await assetAPI.create({
  code: 'MAC-022',
  name: 'New Excavator',
  type: 'Reusable asset',
  quantity: 2,
  unitCost: 341500,
  location: 'Dubai Creek Harbour'
});

// Record receiving
const receiving = await movementAPI.receive({
  assetCode: 'MAC-021',
  quantity: 5,
  supplier: 'Al-Bahar Equipment',
  grn: 'GRN-12345',
  recordedBy: 'Alex Rivera'
});
```

## Error Handling

All API responses follow this format:
```javascript
{
  success: true/false,
  data: {...},
  message: "Success or error message",
  count: Number (for list endpoints)
}
```

## CORS Configuration

The API is configured to accept requests from any origin. For production, update the CORS settings in `server.js`.

## MongoDB Indexing

The following fields are indexed for performance:
- Asset: code, name, category, location, status, project
- Movement: type, status, timestamp
- Inspection: status, inspectionDate
- Return: type, resolution, returnDate
- Assembly: code, status, project

## Troubleshooting

### MongoDB Connection Issues
- Verify your MongoDB URI in `.env`
- Ensure network access is allowed in MongoDB Atlas
- Check your internet connection

### Port Already in Use
```bash
# Change PORT in .env file or use:
PORT=3001 npm run dev
```

### CORS Errors
- Ensure the frontend is making requests to `http://localhost:5000`
- Check that CORS is properly configured in `server.js`

## Project Structure

```
backend/
├── models/
│   ├── Asset.js
│   ├── Movement.js
│   ├── Inspection.js
│   ├── Return.js
│   └── Assembly.js
├── routes/
│   ├── assetRoutes.js
│   ├── movementRoutes.js
│   ├── inspectionRoutes.js
│   ├── returnRoutes.js
│   └── assemblyRoutes.js
├── server.js
├── package.json
├── .env
└── .gitignore
```

## Next Steps

1. Start the backend server: `npm run dev`
2. Update your React frontend to use the API client
3. Test all CRUD operations on the different pages
4. Deploy to production when ready

## Support

For issues or questions, check the main README in the project root directory.
