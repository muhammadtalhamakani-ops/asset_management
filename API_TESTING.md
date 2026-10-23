# API Testing Guide - Using curl and Postman

This guide helps you test all the API endpoints to ensure your MongoDB backend is working correctly.

## ✅ Prerequisites

- Backend server running on `http://localhost:5000`
- MongoDB Atlas connection established
- curl installed (on Windows: use PowerShell or WSL)

## 🏥 Health Check

### Test Server is Running
```bash
curl http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "message": "Asset Management API is running",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

---

## 📦 ASSET ENDPOINTS

### 1. CREATE Asset
```bash
curl -X POST http://localhost:5000/api/assets \
  -H "Content-Type: application/json" \
  -d '{
    "code": "MAC-022",
    "name": "Excavator CAT 330",
    "type": "Reusable asset",
    "serial": "CAT330-DXB-009",
    "category": "Machinery",
    "subcategory": "Earthmoving equipment",
    "description": "Hydraulic tracked excavator",
    "manufacturer": "Caterpillar",
    "model": "330 GC",
    "quantity": 3,
    "unit": "units",
    "minimum": 1,
    "unitCost": 450000,
    "supplier": "Al-Bahar Equipment",
    "purchaseDate": "2025-04-15",
    "project": "Riverside Commercial Hub",
    "location": "Dubai Creek Harbour, Plot DCH-12",
    "status": "Available",
    "qrCode": "QR-MAC-022",
    "remarks": "New equipment added to fleet"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "code": "MAC-022",
    "name": "Excavator CAT 330",
    "value": "AED 1,350,000",
    ...
  },
  "message": "Asset created successfully"
}
```

### 2. GET All Assets
```bash
curl http://localhost:5000/api/assets
```

**With Filters:**
```bash
# Filter by status
curl "http://localhost:5000/api/assets?status=Available"

# Filter by category
curl "http://localhost:5000/api/assets?category=Machinery"

# Filter by location
curl "http://localhost:5000/api/assets?location=Dubai%20Creek%20Harbour"

# Search by name/code
curl "http://localhost:5000/api/assets?search=Excavator"
```

### 3. GET Single Asset
```bash
# By MongoDB ID
curl http://localhost:5000/api/assets/[MONGODB_ID]

# By Asset Code
curl http://localhost:5000/api/assets/MAC-022

# By QR Code
curl http://localhost:5000/api/assets/QR-MAC-022
```

### 4. UPDATE Asset
```bash
curl -X PUT http://localhost:5000/api/assets/[ASSET_ID] \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 5,
    "location": "Warehouse 02",
    "status": "Available",
    "remarks": "Transferred to new location"
  }'
```

### 5. DELETE Asset
```bash
curl -X DELETE http://localhost:5000/api/assets/[ASSET_ID]
```

### 6. GET Asset Statistics
```bash
curl http://localhost:5000/api/assets-stats/summary
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "totalAssets": 10,
    "totalValue": 5000000,
    "byStatus": [
      { "_id": "Available", "count": 7 },
      { "_id": "In use", "count": 2 },
      { "_id": "Damaged", "count": 1 }
    ],
    "byCategory": [
      { "_id": "Machinery", "count": 3 },
      { "_id": "Steel", "count": 4 },
      { "_id": "Timber", "count": 3 }
    ]
  }
}
```

### 7. UPDATE Stock Level
```bash
curl -X PATCH http://localhost:5000/api/assets/[ASSET_ID]/stock \
  -H "Content-Type: application/json" \
  -d '{"quantityChange": 10}'
```

---

## 🚚 MOVEMENT ENDPOINTS

### 1. RECORD RECEIVING (GRN)
```bash
curl -X POST http://localhost:5000/api/movements/receive \
  -H "Content-Type: application/json" \
  -d '{
    "assetCode": "SAF-104",
    "quantity": 50,
    "supplier": "SiteSafe Equipment",
    "grn": "GRN-2024-001",
    "project": "Riverside Commercial Hub",
    "recordedBy": "Alex Rivera",
    "remarks": "Delivery from supplier, all items inspected"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "GRN-0147",
    "type": "receive",
    "status": "Received",
    "quantity": 50,
    ...
  },
  "message": "Receiving recorded successfully"
}
```

Asset quantity will be automatically increased!

### 2. RECORD ISSUE (ALLOCATION)
```bash
curl -X POST http://localhost:5000/api/movements/issue \
  -H "Content-Type: application/json" \
  -d '{
    "assetCode": "SAF-104",
    "quantity": 12,
    "recipientName": "Eastern Fitout Ltd.",
    "project": "Riverside Commercial Hub",
    "recordedBy": "Alex Rivera",
    "remarks": "Allocated for Level 3 fitout work"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "ISS-0328",
    "type": "issue",
    "status": "Issued",
    "quantity": 12,
    ...
  },
  "message": "Issue recorded successfully"
}
```

Asset quantity will be automatically decreased!

### 3. RECORD TRANSFER
```bash
curl -X POST http://localhost:5000/api/movements/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "assetCode": "SCAF-000125",
    "quantity": 1,
    "fromLocation": "Dubai Marina, Tower 3 Level 12",
    "toLocation": "Business Bay, Tower C Level 2",
    "project": "Riverside Commercial Hub",
    "recordedBy": "Alex Rivera",
    "remarks": "Scaffold assembly relocated to new project phase"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "TRF-0082",
    "type": "transfer",
    "status": "Transferred",
    ...
  },
  "message": "Transfer recorded successfully"
}
```

Asset location will be automatically updated!

### 4. GET All Movements
```bash
curl http://localhost:5000/api/movements

# With filters
curl "http://localhost:5000/api/movements?type=receive"
curl "http://localhost:5000/api/movements?status=Transferred"
curl "http://localhost:5000/api/movements?assetCode=MAC-021"

# By date range
curl "http://localhost:5000/api/movements?dateFrom=2024-01-01&dateTo=2024-12-31"
```

### 5. GET Single Movement
```bash
curl http://localhost:5000/api/movements/[MOVEMENT_ID]
```

### 6. UPDATE Movement
```bash
curl -X PUT http://localhost:5000/api/movements/[MOVEMENT_ID] \
  -H "Content-Type: application/json" \
  -d '{"status": "Received", "remarks": "Updated remarks"}'
```

### 7. DELETE Movement
```bash
curl -X DELETE http://localhost:5000/api/movements/[MOVEMENT_ID]
```

---

## 🔍 INSPECTION ENDPOINTS

### 1. CREATE Inspection
```bash
curl -X POST http://localhost:5000/api/inspections \
  -H "Content-Type: application/json" \
  -d '{
    "assetCode": "SCAF-000125",
    "type": "Safety check",
    "checklist": [
      {
        "item": "Base and load-bearing components secure",
        "checked": true,
        "remarks": "All bolts tight"
      },
      {
        "item": "Guard rails and platforms installed",
        "checked": true,
        "remarks": "No issues observed"
      },
      {
        "item": "Cross braces complete and locked",
        "checked": true,
        "remarks": "All braces present"
      },
      {
        "item": "No visible deformation or corrosion",
        "checked": true,
        "remarks": "Good condition"
      }
    ],
    "condition": "Good",
    "status": "Pass",
    "location": "Building B, Level 3",
    "inspector": {
      "name": "Samira Khan",
      "signature": ""
    },
    "nextInspectionDue": "2024-10-01",
    "remarks": "Asset in excellent condition, cleared for use"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "INSP-0064",
    "status": "Pass",
    "inspectionDate": "2024-09-01T...",
    ...
  },
  "message": "Inspection recorded successfully"
}
```

Asset status will update to "Available" (if Pass) or "Damaged" (if Fail)!

### 2. GET Inspections
```bash
curl http://localhost:5000/api/inspections

# By status
curl "http://localhost:5000/api/inspections?status=Pass"
curl "http://localhost:5000/api/inspections?status=Fail"

# By asset
curl "http://localhost:5000/api/inspections?assetCode=SCAF-000125"

# By date range
curl "http://localhost:5000/api/inspections?dateFrom=2024-08-01&dateTo=2024-09-30"
```

### 3. GET Single Inspection
```bash
curl http://localhost:5000/api/inspections/[INSPECTION_ID]
```

### 4. UPDATE Inspection
```bash
curl -X PUT http://localhost:5000/api/inspections/[INSPECTION_ID] \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Pass",
    "condition": "Good",
    "correctionActions": [
      {
        "action": "Tighten loose bolt",
        "assignedTo": "Site supervisor",
        "dueDate": "2024-09-05",
        "completed": true
      }
    ]
  }'
```

### 5. DELETE Inspection
```bash
curl -X DELETE http://localhost:5000/api/inspections/[INSPECTION_ID]
```

---

## 🔄 RETURN & DAMAGE ENDPOINTS

### 1. CREATE Return/Damage Record
```bash
curl -X POST http://localhost:5000/api/returns \
  -H "Content-Type: application/json" \
  -d '{
    "assetCode": "SAF-104",
    "type": "Damage",
    "quantityIssued": 12,
    "quantityReturned": 8,
    "quantityDamaged": 2,
    "quantityMissing": 2,
    "condition": "Damaged",
    "damageDescription": "2 helmets cracked due to site accident, 2 missing from inventory",
    "responsibleParty": "Eastern Fitout Ltd.",
    "location": "Store room",
    "recordedBy": "Alex Rivera",
    "remarks": "Incident reported to insurance, awaiting claim"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "RTN-0098",
    "type": "Damage",
    "replacementCost": 80,
    "resolution": "Closed",
    ...
  },
  "message": "Return record created successfully"
}
```

Asset quantity and status will be automatically updated!

### 2. GET Return Records
```bash
curl http://localhost:5000/api/returns

# By type
curl "http://localhost:5000/api/returns?type=Damage"
curl "http://localhost:5000/api/returns?type=Loss"

# By resolution
curl "http://localhost:5000/api/returns?resolution=Closed"

# By responsible party
curl "http://localhost:5000/api/returns?responsibleParty=Eastern%20Fitout%20Ltd."
```

### 3. GET Return Statistics
```bash
curl http://localhost:5000/api/returns-stats/summary
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "totalReturns": 5,
    "byType": [
      {
        "_id": "Damage",
        "count": 2,
        "totalCost": 80
      },
      {
        "_id": "Return",
        "count": 2,
        "totalCost": 0
      },
      {
        "_id": "Loss",
        "count": 1,
        "totalCost": 25
      }
    ],
    "byResolution": [
      {
        "_id": "Closed",
        "count": 4
      },
      {
        "_id": "Replacement pending",
        "count": 1
      }
    ]
  }
}
```

### 4. UPDATE Return Record
```bash
curl -X PUT http://localhost:5000/api/returns/[RETURN_ID] \
  -H "Content-Type: application/json" \
  -d '{
    "resolution": "Replacement pending",
    "replacementCost": 80,
    "remarks": "Replacement items ordered, delivery expected 2024-09-10"
  }'
```

### 5. DELETE Return Record
```bash
curl -X DELETE http://localhost:5000/api/returns/[RETURN_ID]
```

---

## 🏗️ ASSEMBLY ENDPOINTS

### 1. CREATE Assembly
```bash
curl -X POST http://localhost:5000/api/assemblies \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SCAF-000126",
    "name": "Tower Scaffold Assembly Level 5",
    "type": "Scaffolding",
    "description": "Tower scaffold for facade work",
    "location": "Business Bay, Tower C Level 5",
    "project": "Riverside Commercial Hub",
    "parentAssets": [
      {
        "assetCode": "SCAF-000125",
        "quantity": 1
      }
    ],
    "components": [
      {
        "componentName": "Base jack",
        "required": 4,
        "onAssembly": 4,
        "condition": "Pass"
      },
      {
        "componentName": "Vertical frame",
        "required": 8,
        "onAssembly": 8,
        "condition": "Pass"
      },
      {
        "componentName": "Cross brace",
        "required": 8,
        "onAssembly": 8,
        "condition": "Pass"
      },
      {
        "componentName": "Platform",
        "required": 2,
        "onAssembly": 2,
        "condition": "Pass"
      }
    ],
    "qrCode": "QR-SCAF-000126"
  }'
```

### 2. GET Assemblies
```bash
curl http://localhost:5000/api/assemblies

# By status
curl "http://localhost:5000/api/assemblies?status=Available"

# By project
curl "http://localhost:5000/api/assemblies?project=Riverside%20Commercial%20Hub"

# By location
curl "http://localhost:5000/api/assemblies?location=Business%20Bay"
```

### 3. UPDATE Component Status
```bash
curl -X PATCH http://localhost:5000/api/assemblies/[ASSEMBLY_ID]/components \
  -H "Content-Type: application/json" \
  -d '{
    "componentName": "Cross brace",
    "onAssembly": 7,
    "condition": "Missing"
  }'
```

Assembly status will automatically change to "Incomplete" if components are missing!

### 4. UPDATE Assembly
```bash
curl -X PUT http://localhost:5000/api/assemblies/[ASSEMBLY_ID] \
  -H "Content-Type: application/json" \
  -d '{
    "location": "New Location",
    "status": "Available",
    "remarks": "Reassembled and ready for use"
  }'
```

### 5. DELETE Assembly
```bash
curl -X DELETE http://localhost:5000/api/assemblies/[ASSEMBLY_ID]
```

---

## 💡 Postman Collection

You can import this Postman collection for easier testing:

### Setting Up Postman

1. **Download Postman** from [postman.com](https://www.postman.com/)
2. **Create New Collection** → "Asset Management API"
3. **Add Requests** from examples above
4. **Set Base URL** → `{{base_url}}` = `http://localhost:5000`

### Common Postman Variables

```
base_url = http://localhost:5000
assetId = [copy MongoDB ID from response]
assetCode = MAC-022
movementId = [copy from response]
inspectionId = [copy from response]
returnId = [copy from response]
assemblyId = [copy from response]
```

---

## 🐛 Debugging Tips

### Check MongoDB Connection
```bash
curl http://localhost:5000/api/health
# Should return status: OK
```

### View Error Messages
```bash
# Any request that fails will return:
{
  "success": false,
  "message": "Detailed error description"
}
```

### Test Specific Operations

#### Test Asset Creation
```bash
curl -X POST http://localhost:5000/api/assets \
  -H "Content-Type: application/json" \
  -d '{"code":"TEST-001","name":"Test","type":"Material","quantity":5,"unitCost":100,"unit":"units","location":"Test"}'
```

#### Test Movement Recording
First create an asset, then:
```bash
curl -X POST http://localhost:5000/api/movements/receive \
  -H "Content-Type: application/json" \
  -d '{"assetCode":"TEST-001","quantity":10,"supplier":"Test","grn":"GRN-TEST","recordedBy":"Admin"}'
```

---

## ✅ Test Checklist

- [ ] Health check passes
- [ ] Can create asset
- [ ] Asset quantity updates automatically
- [ ] Can record receiving
- [ ] Can record issue
- [ ] Can record transfer
- [ ] Can create inspection
- [ ] Can record return/damage
- [ ] Asset status updates correctly
- [ ] Can retrieve all records with filters
- [ ] Values display in AED format
- [ ] Statistics calculate correctly

---

All tests passed? Great! Your MongoDB integration is working perfectly! 🎉
