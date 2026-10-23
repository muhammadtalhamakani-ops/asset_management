# Quick Reference Card

## 🚀 Start Backend
```bash
cd backend && npm run dev
```
Runs on: `http://localhost:5000`

## 🎨 Start Frontend
```bash
npm run dev
```
Runs on: `http://localhost:5173`

---

## 📦 API Base URL
```
http://localhost:5000/api
```

## 🏥 Health Check
```bash
curl http://localhost:5000/api/health
```

---

## 🔌 Quick API Reference

### Assets
```bash
GET    /api/assets                    # List all
POST   /api/assets                    # Create
PUT    /api/assets/:id                # Update
DELETE /api/assets/:id                # Delete
GET    /api/assets-stats/summary      # Statistics
```

### Movements
```bash
POST   /api/movements/receive         # Record receiving
POST   /api/movements/issue           # Record issue
POST   /api/movements/transfer        # Record transfer
GET    /api/movements                 # List all
```

### Inspections
```bash
POST   /api/inspections               # Create
GET    /api/inspections               # List all
PUT    /api/inspections/:id           # Update
DELETE /api/inspections/:id           # Delete
```

### Returns & Damage
```bash
POST   /api/returns                   # Create
GET    /api/returns                   # List all
PUT    /api/returns/:id               # Update
GET    /api/returns-stats/summary     # Statistics
```

### Assemblies
```bash
GET    /api/assemblies                # List all
POST   /api/assemblies                # Create
PATCH  /api/assemblies/:id/components # Update component
```

---

## 💻 Frontend Integration

### Import API Client
```typescript
import { assetAPI, movementAPI, inspectionAPI, returnAPI, assemblyAPI } from './api/client';
```

### Create Asset
```typescript
const response = await assetAPI.create({
  code: 'MAC-022',
  name: 'Asset Name',
  quantity: 5,
  unitCost: 1000,
  location: 'Warehouse'
});
```

### Record Receiving
```typescript
const response = await movementAPI.receive({
  assetCode: 'MAC-021',
  quantity: 10,
  supplier: 'Supplier Name',
  recordedBy: 'Alex Rivera'
});
```

### Record Issue
```typescript
const response = await movementAPI.issue({
  assetCode: 'MAC-021',
  quantity: 5,
  recipientName: 'Team Name',
  recordedBy: 'Alex Rivera'
});
```

### Record Inspection
```typescript
const response = await inspectionAPI.create({
  assetCode: 'SCAF-000125',
  condition: 'Good',
  status: 'Pass',
  location: 'Building B'
});
```

### Record Return/Damage
```typescript
const response = await returnAPI.create({
  assetCode: 'SAF-104',
  type: 'Damage',
  quantityIssued: 12,
  quantityDamaged: 2,
  condition: 'Damaged'
});
```

---

## ⚡ Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## 🔄 Common Patterns

### Load Data
```typescript
const response = await assetAPI.getAll();
if (response.success) {
  setData(response.data);
}
```

### Create Item
```typescript
const response = await assetAPI.create(formData);
if (response.success) {
  notify('Created successfully');
  setData([response.data, ...data]);
}
```

### Update Item
```typescript
const response = await assetAPI.update(id, updates);
if (response.success) {
  setData(data.map(item => item._id === id ? response.data : item));
}
```

### Delete Item
```typescript
const response = await assetAPI.delete(id);
if (response.success) {
  setData(data.filter(item => item._id !== id));
}
```

---

## 📊 Filter Examples

### Asset Filters
```bash
?status=Available
?category=Machinery
?location=Warehouse%2001
?search=Excavator
?project=Riverside
```

### Movement Filters
```bash
?type=receive
?status=Received
?assetCode=MAC-021
?dateFrom=2024-01-01&dateTo=2024-12-31
```

### Inspection Filters
```bash
?status=Pass
?assetCode=SCAF-000125
?dateFrom=2024-08-01
```

---

## 🧪 Test Endpoints

### Test Asset Creation
```bash
curl -X POST http://localhost:5000/api/assets \
  -H "Content-Type: application/json" \
  -d '{"code":"TEST-001","name":"Test","type":"Material","quantity":5,"unitCost":100,"unit":"units","location":"Test"}'
```

### Test Receiving
```bash
curl -X POST http://localhost:5000/api/movements/receive \
  -H "Content-Type: application/json" \
  -d '{"assetCode":"TEST-001","quantity":10,"supplier":"Test","grn":"GRN-001","recordedBy":"Admin"}'
```

---

## 📁 File Locations

| What | Where |
|------|-------|
| API Client | `src/api/client.ts` |
| Examples | `src/api/examples.ts` |
| Backend Server | `backend/server.js` |
| Asset Model | `backend/models/Asset.js` |
| Asset Routes | `backend/routes/assetRoutes.js` |
| Full Docs | `backend/README.md` |
| Setup Guide | `SETUP.md` |
| Architecture | `ARCHITECTURE.md` |

---

## ⚙️ Configuration

### MongoDB URI
Located in: `backend/.env`
```
MONGODB_URI=mongodb://user:pass@host:port/db...
```

### Port
Default: `5000`
Change in: `backend/.env`
```
PORT=5000
```

---

## 🐛 Common Issues

| Issue | Fix |
|-------|-----|
| Backend won't start | Check MongoDB URI in `.env` |
| CORS error | Both servers must be running |
| Data not saving | Check backend console for errors |
| API timeout | Verify MongoDB Atlas connection |

---

## 📚 Documentation

- **START_HERE.md** - Begin here
- **SETUP.md** - Quick setup
- **ARCHITECTURE.md** - System design
- **API_TESTING.md** - How to test
- **backend/README.md** - Full API docs

---

## 💡 Key Concepts

- **Assets** = Inventory items
- **Movements** = Transactions (receive/issue/transfer)
- **Inspections** = Safety/condition checks
- **Returns** = Damage/missing tracking
- **Assemblies** = Scaffolding components

---

## 🎯 Common Tasks

### Create Asset with Values Auto-Calculated
```typescript
await assetAPI.create({
  code, name, type, quantity, unitCost, ...
  // value auto-calculated as: quantity × unitCost (AED formatted)
});
```

### Update Stock
```typescript
await assetAPI.updateStock(assetId, quantityChange);
// Quantity updated, value recalculated, status auto-updated
```

### Get Statistics
```typescript
await assetAPI.getStatistics();
// Returns: totalAssets, totalValue, byStatus, byCategory
```

### Search Assets
```typescript
await assetAPI.getAll({ search: 'Excavator' });
// Searches: name, code, serial, qrCode
```

---

## ✅ Quick Checklist

- [ ] Backend running: `npm run dev` in backend folder
- [ ] Frontend running: `npm run dev` in root
- [ ] Health check: `curl http://localhost:5000/api/health`
- [ ] Can create asset
- [ ] Can record receiving
- [ ] Can record issue
- [ ] Data appears in database

---

## 🆘 Need Help?

1. Check **START_HERE.md**
2. Read **SETUP.md**
3. Review **ARCHITECTURE.md**
4. See **API_TESTING.md**
5. Read **backend/README.md**

---

**Print this page for quick reference!** 📄
