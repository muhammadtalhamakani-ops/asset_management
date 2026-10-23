# Architecture & Data Flow Guide

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        WEB BROWSER                              │
│                    (React TypeScript App)                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    API Client (src/api/client.ts)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     HTTP / REST API                             │
│              http://localhost:5000/api/*                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Express.js Server                             │
│              (backend/server.js - Port 5000)                   │
│                                                                 │
│  Routes:                                                        │
│  ├─ /api/assets/*          (Asset CRUD)                        │
│  ├─ /api/movements/*       (Transactions)                      │
│  ├─ /api/inspections/*     (Inspections)                       │
│  ├─ /api/returns/*         (Returns & Damage)                  │
│  └─ /api/assemblies/*      (Assemblies)                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      MongoDB (Atlas Cloud)                      │
│                                                                 │
│  Collections:                                                   │
│  ├─ assets                  (Master data)                       │
│  ├─ movements              (Transactions)                       │
│  ├─ inspections            (Inspection records)                │
│  ├─ returns                (Returns & Damage)                  │
│  └─ assemblies             (Assemblies)                        │
│                                                                 │
│  Connection: TLS/SSL Encrypted                                │
└─────────────────────────────────────────────────────────────────┘
```

## 📡 Data Flow Examples

### Creating an Asset

```
React Component (Add Asset Modal)
         ↓
    Form Submission
         ↓
    assetAPI.create({
      code, name, type, quantity,
      unitCost, unit, location, ...
    })
         ↓
    HTTP POST /api/assets
         ↓
    Express Route Handler
         ↓
    Validation & Processing
         ↓
    Calculate value: quantity × unitCost
         ↓
    Mongoose Schema
         ↓
    MongoDB Insert
         ↓
    Return: { success: true, data: asset }
         ↓
    Update UI / Show Success Message
```

### Recording a Receiving Transaction

```
React Component (Receive Modal)
         ↓
    Form Submission
         ↓
    movementAPI.receive({
      assetCode, quantity,
      supplier, grn, recordedBy
    })
         ↓
    HTTP POST /api/movements/receive
         ↓
    Express Route Handler
    ├─ Find Asset by Code
    ├─ Create Movement Record
    ├─ Update Asset Quantity
    │  └─ quantity += received
    ├─ Recalculate Asset Value
    │  └─ value = quantity × unitCost
    └─ Update Status if needed
         ↓
    MongoDB Operations (Atomic)
    ├─ Insert Movement
    └─ Update Asset
         ↓
    Return: { success: true, data: movement }
         ↓
    Refresh Asset List & Show Success
```

### Performing an Inspection

```
React Component (Inspection Form)
         ↓
    Form Submission
         ↓
    inspectionAPI.create({
      assetCode, type, checklist,
      condition, status, remarks
    })
         ↓
    HTTP POST /api/inspections
         ↓
    Express Route Handler
    ├─ Find Asset by Code
    ├─ Create Inspection Record
    ├─ Update Asset Status Based on Result:
    │  ├─ Pass → status = "Available"
    │  ├─ Fail → status = "Damaged"
    │  └─ Needs Repair → status = "Damaged"
    └─ Calculate Next Due Date
         ↓
    MongoDB Operations
    ├─ Insert Inspection
    └─ Update Asset
         ↓
    Return: { success: true, data: inspection }
         ↓
    Update UI & Asset Details
```

### Recording Returns & Damage

```
React Component (Return Form)
         ↓
    Form Submission
         ↓
    returnAPI.create({
      assetCode, type, quantityIssued,
      quantityReturned, quantityDamaged,
      quantityMissing, responsibleParty
    })
         ↓
    HTTP POST /api/returns
         ↓
    Express Route Handler
    ├─ Find Asset by Code
    ├─ Create Return Record
    ├─ Update Asset:
    │  ├─ quantity += returned
    │  ├─ status = damaged? → "Damaged"
    │  └─ Calculate replacement cost
    └─ Calculate Total Value
         ↓
    MongoDB Operations
    ├─ Insert Return
    └─ Update Asset
         ↓
    Return: { success: true, data: return }
         ↓
    Update Dashboard & Return List
```

## 🔄 Component Integration Pattern

### Standard Pattern for All Pages

```typescript
import { assetAPI, movementAPI, /* ... */ } from './api/client';

function MyPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await assetAPI.getAll();
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (formData) => {
    try {
      setLoading(true);
      const response = await assetAPI.create(formData);
      if (response.success) {
        setData([response.data, ...data]); // Add to top
        notify('Created successfully');
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id, updates) => {
    try {
      const response = await assetAPI.update(id, updates);
      if (response.success) {
        setData(data.map(item => item._id === id ? response.data : item));
        notify('Updated successfully');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await assetAPI.delete(id);
      if (response.success) {
        setData(data.filter(item => item._id !== id));
        notify('Deleted successfully');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div>
      {/* Render data */}
    </div>
  );
}
```

## 📊 Database Operations Flow

### Asset Operations
```
Asset Master Record
    ↓
├─ Created via: Asset Register Page
├─ Updated via: Asset Edit Modal
├─ Deleted via: Asset Delete Action
├─ Quantity Updated via:
│  ├─ Receive Movement (add)
│  ├─ Issue Movement (subtract)
│  ├─ Stock Update API
│  └─ Return Movement (add back)
├─ Status Changed via:
│  ├─ Movement Recording
│  ├─ Inspection Results
│  └─ Return Records
└─ Triggers Related Records:
   ├─ Movement (when issued/received)
   ├─ Inspection (when checked)
   └─ Return (when damaged/missing)
```

### Movement Recording
```
Transaction Type
    ├─ Receive (GRN)
    │  ├─ Finds Asset by Code
    │  ├─ Creates Movement Record
    │  ├─ Adds to Asset Quantity
    │  └─ Updates Status to "Available"
    │
    ├─ Issue (Allocation)
    │  ├─ Checks Asset Availability
    │  ├─ Creates Movement Record
    │  ├─ Reduces Asset Quantity
    │  └─ Updates Status to "In use"
    │
    └─ Transfer
       ├─ Verifies Quantity Available
       ├─ Creates Movement Record
       ├─ Updates Asset Location
       └─ Sets Status to "In transit"
```

### Inspection Workflow
```
Inspection Record
    ├─ References Asset by Code
    ├─ Records Checklist Items
    ├─ Captures Condition (Good/Fair/Poor)
    ├─ Sets Status (Pass/Fail/Needs Repair)
    ├─ Schedules Next Due Date
    └─ Updates Asset Status:
       ├─ Pass → "Available"
       └─ Fail → "Damaged"
```

### Return & Damage Flow
```
Return Record
    ├─ Type: Return/Damage/Loss/Variance
    ├─ Tracks:
    │  ├─ Quantity Issued
    │  ├─ Quantity Returned
    │  ├─ Quantity Damaged
    │  └─ Quantity Missing
    ├─ Calculates:
    │  ├─ Replacement Cost = Damaged × Unit Cost
    │  └─ Total Missing Value
    └─ Updates Asset:
       ├─ Adds Returned Qty
       └─ Sets Status to "Damaged" if damaged
```

## 🔐 Error Handling Flow

```
API Request
    ↓
    ├─ Validation Error?
    │  └─ Return 400 + Message
    │
    ├─ Not Found?
    │  └─ Return 404 + Message
    │
    ├─ Business Logic Error?
    │  └─ Return 400 + Message
    │     (e.g., "Insufficient stock")
    │
    ├─ Database Error?
    │  └─ Return 500 + Message
    │
    └─ Success?
       └─ Return 200 + Data

Frontend Handling
    ├─ Check response.success
    ├─ On Success: Update UI
    └─ On Error: Display Message
```

## 🎯 Key Integration Points

### 1. Dashboard Page
```
loadDashboardData()
  ├─ assetAPI.getStatistics()
  ├─ movementAPI.getAll({ status: 'Received' })
  ├─ returnAPI.getStatistics()
  └─ Display: Total Value, Metrics, Recent Movements
```

### 2. Asset Register Page
```
PortalRegister Component
  ├─ Load: assetAPI.getAll(filters)
  ├─ Create: assetAPI.create(newAsset)
  ├─ Update: assetAPI.update(id, changes)
  ├─ Delete: assetAPI.delete(id)
  └─ Search: assetAPI.getAll({ search: query })
```

### 3. Receive Assets Page
```
PortalModal (receive)
  └─ movementAPI.receive({
       assetCode, quantity, supplier, grn, ...
     })
  └─ Auto-updates:
       ├─ Asset quantity increased
       └─ Status set to "Available"
```

### 4. Issue & Allocate Page
```
PortalModal (issue)
  └─ movementAPI.issue({
       assetCode, quantity, recipientName, ...
     })
  └─ Auto-updates:
       ├─ Asset quantity decreased
       └─ Status set to "In use"
```

### 5. Transfers Page
```
PortalModal (transfer)
  └─ movementAPI.transfer({
       assetCode, quantity, fromLocation, toLocation, ...
     })
  └─ Auto-updates:
       ├─ Asset location changed
       └─ Status set to "In transit"
```

### 6. Inspections Page
```
PortalInspections Component
  ├─ Create: inspectionAPI.create(inspectionData)
  ├─ Result: Pass/Fail/Needs Repair
  └─ Auto-updates:
       └─ Asset status based on result
```

### 7. Returns & Damage Page
```
PortalReturns Component
  ├─ Create: returnAPI.create(returnData)
  ├─ Track: Returned/Damaged/Missing
  └─ Auto-updates:
       ├─ Asset quantity
       └─ Asset status (if damaged)
```

### 8. Assemblies Page
```
PortalAssemblies Component
  ├─ Load: assemblyAPI.getAll()
  ├─ Update: assemblyAPI.updateComponent(id, data)
  └─ Auto-updates:
       └─ Assembly status (complete/incomplete)
```

## 🧮 Calculation Logic

### Asset Value Calculation
```javascript
Value = Quantity × Unit Cost
Format = "AED " + value.toLocaleString()

Example:
Quantity: 100
Unit Cost: 250
Value: "AED 25,000"
```

### Stock Level Determination
```javascript
if (quantity === 0) {
  status = "Low stock"
} else if (quantity < minimum) {
  status = "Low stock"
} else if (quantity >= minimum) {
  status = "Available"
}
```

### Replacement Cost Calculation
```javascript
Replacement Cost = Quantity Damaged × Unit Cost

Example:
Damaged: 5
Unit Cost: 150
Total Cost: "AED 750"
```

## 🚦 Status Flow

```
Available
  ↓ (Issue)
In use
  ↓ (Transfer)
In transit
  ↓ (Receive)
Available
  ↓ (Inspection Fail)
Damaged
  ↓ (Inspect/Repair)
Available

Low stock (Quantity < Minimum)
  ↓ (Receive/Return)
Available
```

---

This architecture ensures:
✅ Clean separation of concerns
✅ Real-time data synchronization
✅ Automatic status management
✅ Complete audit trail
✅ Scalable design
