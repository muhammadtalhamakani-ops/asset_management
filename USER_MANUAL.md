# FieldStock User Manual

## 1. Portal Overview

FieldStock is the asset and site-material control portal for **Al Marasi Construction LLC**, a Dubai-based construction company. It provides a single record for equipment, materials, PPE, scaffolding, formwork, stock movements, inspections, returns, and audit activity across active Dubai projects.

The portal is designed for store keepers, site managers, engineers, safety officers, and administrators. Asset and transaction records are stored in MongoDB through the backend API. The browser interface reads and writes those records through the API; it does not use front-end-only sample records for the operational workflows.

### Active Dubai projects

- Dubai Creek Harbour - Tower C
- Business Bay Business Park Extension
- Dubai Marina - Tower 3
- Al Quoz Logistics Hub
- Palm Jumeirah Villa Development
- Jebel Ali Industrial Yard

### Main stock locations

- Dubai Creek Harbour, Plot DCH-12
- Business Bay, Tower C Level 2
- Dubai Marina, Tower 3 Level 12
- Al Quoz Logistics Hub, Warehouse 4
- Palm Jumeirah, Villa Cluster D
- Jebel Ali Industrial Yard, Bay 7
- Store room - Main Yard
- Steel yard - Al Quoz

## 2. Start the System

### Prerequisites

- Node.js 16 or later.
- A reachable MongoDB database configured in `backend/.env`.
- Dependencies installed in both the project root and `backend` directory.

### Start the backend

From the project root:

```bash
cd backend
npm install
npm start
```

The API runs at `http://localhost:5000`. Confirm it is available by opening:

```text
http://localhost:5000/api/health
```

The response should report that the Asset Management API is running.

### Start the frontend

Open a second terminal from the project root:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

### Load the Dubai sample dataset

The seed command clears the existing asset-management collections and inserts a complete demo dataset. Use it only when you intend to reset the environment:

```bash
cd backend
npm run seed
```

The seed inserts users, assets, movement history, inspections, return/damage records, and assemblies. It also recalculates the asset values from quantity and unit cost. Do not run it against a production database because existing records are deleted first.

## 3. Sign In

1. Open the FieldStock web address.
2. Enter a seeded user email and password.
3. Select **Sign in to workspace**.
4. The Dashboard opens after authentication succeeds.

Example site manager account:

```text
Email:    ahmed.mansouri@almarasi.ae
Password: Passw0rd!1
```

Other seeded roles are available for testing:

| Role | Email | Password |
| --- | --- | --- |
| Admin | fatima.rashid@almarasi.ae | `Passw0rd!2` |
| Store Keeper | ravi.kumar@almarasi.ae | `Passw0rd!3` |
| Safety Officer | sara.abdullah@almarasi.ae | `Passw0rd!4` |
| Site Engineer | john.dsouza@almarasi.ae | `Passw0rd!5` |

Demo account:

| Role | Email | Password |
| --- | --- | --- |
| Admin | harmandemo@fastymtech.ae | `harmandemo` |

These are demonstration credentials. Change or remove seeded accounts before using the system with real company data.

### Sign out

Select **Log out** at the bottom of the left navigation. The portal returns to the sign-in screen.

## 4. Navigation

The left navigation is grouped by work area:

- **Dashboard**: Stock summary and recent activity.
- **Asset Register**: Master records for every asset or material.
- **Inventory**: Quantities, values, locations, and stock status.
- **Receive Assets**: Incoming deliveries and GRNs.
- **Issue & Allocate**: Stock issued to a person, crew, or project.
- **Transfers**: Movement between project locations.
- **Assemblies**: Scaffold and formwork assemblies with components.
- **QR Scanner**: Search for an asset by code or QR value.
- **Inspections**: Safety and condition records.
- **Returns & Damage**: Returned, damaged, lost, or variance quantities.
- **Reports & Audit**: Combined movement history and exportable audit data.

The selected page is remembered in the browser. Reloading the page does not remove database records.

## 5. Dashboard

The Dashboard summarizes the records currently available from the backend.

### Summary cards

- **Total asset value**: Quantity multiplied by the unit cost for recorded assets.
- **Available stock**: Stock currently available for use.
- **Issued / in use**: Stock allocated to site teams or currently in use.
- **Needs attention**: Low-stock, damaged, under-inspection, or similar exceptions.

### Dashboard actions

Use the quick actions to open the appropriate transaction form:

- **Receive delivery** for a supplier delivery.
- **Issue asset** for allocation to a person or team.
- **Transfer asset** for a location change.
- **View full audit** for the Reports & Audit page.

If a page shows an API loading message, check that the backend is running and that MongoDB is reachable. Refresh after the connection is restored.

## 6. Asset Register

The Asset Register is the master record for equipment, materials, PPE, tools, steel, scaffolding, and formwork.

### Search and view an asset

1. Open **Asset Register**.
2. Search by asset code, name, serial number, QR code, category, or location.
3. Select a row to open the asset details.

Examples from the seeded Dubai dataset include `MAC-021` (Excavator CAT 320), `STL-016` (Rebar 16 mm), `SCF-031` (Scaffold Frame Set), and `HRD-104` (Safety Helmets).

### Add an asset

1. Select **Add asset**.
2. Complete the asset master fields:
   - Asset code or ID. This must be unique.
   - Name, type, category, and subcategory.
   - Description, manufacturer, model, and serial number where applicable.
   - Quantity and unit, such as `units`, `kg`, `pieces`, `box`, or `set`.
   - Minimum stock level.
   - Unit cost in AED.
   - Supplier and purchase date.
   - Project and current location.
   - Status, QR code, attachments, and remarks.
3. Select **Create asset**.
4. Wait for the success notice. The record is written to MongoDB and appears in the register after the API response succeeds.

### Edit an asset

1. Double-click the Asset ID or select the row's **Edit** action.
2. Update the permitted fields.
3. Select **Save changes**.

The update is sent to the backend. Reloading the page should show the same value because it is stored in the database.

### Delete an asset

1. Select the asset's **Delete** action.
2. Confirm the warning.

Deleting an asset also removes its related movement history. Use this only for an incorrect or test record; use an issue, return, damage, or loss transaction when preserving audit history matters.

## 7. Inventory

Inventory displays the current quantity and location held on each asset master record.

Review:

- Asset code and name.
- Category and unit.
- Current quantity.
- Location and project.
- Unit cost and calculated value.
- Status and minimum level.

Inventory is changed by backend transaction logic when a receiving, issue, transfer, or return is saved. Do not manually change quantities to represent a transaction; create the appropriate movement record instead.

## 8. Receive Assets

Use receiving for supplier deliveries arriving at a store, yard, or project.

1. Open **Receive Assets** and select **New receiving**.
2. Enter or select the existing asset code.
3. Enter the supplier, GRN number, quantity, project, and remarks.
4. Select **Save record**.
5. Confirm the success notice and the new receiving row.

The backend validates the asset code, creates a receive movement, and increases the asset quantity. The GRN should match the supplier's official goods received note. Examples from the seed data include `GRN-2201` from Conares Steel and `GRN-2202` from Al Jaber Building Materials.

An unknown asset code or invalid quantity is rejected. Create the asset master record first if the delivery contains a new item.

## 9. Issue & Allocate

Use issue records whenever equipment, PPE, tools, or materials leave stores for a crew or responsible person.

1. Open **Issue & Allocate** and select **New issue**.
2. Select or enter the asset code.
3. Enter the quantity, recipient or responsible team, project, and remarks.
4. Select **Save record**.

The backend checks that enough stock exists, creates an issue movement, and decreases the asset quantity. The issue is also visible in Reports & Audit.

Use specific recipients such as `Earthworks Team - Ahmed Al Mansouri` or `Facade crew - John D'Souza`, rather than a vague note, so responsibility can be followed later.

## 10. Transfers

Use transfers when stock changes location without being consumed.

1. Open **Transfers** and select **New transfer**.
2. Select the asset code.
3. Enter the quantity, source location, destination location, project, and remarks.
4. Select **Save record**.

The backend records both locations and updates the asset's current location. A transfer does not represent consumption. Use the actual project and location names, for example, moving stock from `Al Quoz Logistics Hub, Warehouse 4` to `Dubai Creek Harbour, Plot DCH-12`.

## 11. QR Scanner

The current scanner page uses code entry rather than camera capture.

1. Open **QR Scanner**.
2. Enter an Asset ID, code, or QR value such as `QR-MAC-021`.
3. Review the matching asset's quantity, status, project, and location.
4. Select **View asset details** for the full master record.

If no record is returned, check the code and confirm that the asset exists in the backend.

## 12. Inspections

Use inspections for machinery safety checks, scaffold tag checks, compliance reviews, and tool maintenance.

1. Open **Inspections**.
2. Select the asset and inspection type.
3. Complete each checklist item.
4. Record the condition as **Good**, **Fair**, or **Poor**.
5. Record the result as **Pass**, **Fail**, or **Needs Repair**.
6. Add the inspector, inspection date, next due date, and remarks.
7. Save the inspection.

The seeded records include a passenger hoist load test, a weekly cuplock scaffold inspection, a tower-crane compliance check, and a power-drill maintenance check. A failed or repair-required inspection should be followed by a corrective action and should be reflected in the asset's operational status before reuse.

## 13. Assemblies

Assemblies group parent assets and components used together, especially scaffolding and formwork.

1. Open **Assemblies**.
2. Review the assembly code, project, location, status, and inspection dates.
3. Check each component's required quantity, assembled quantity, and condition.
4. Update a component when a part is missing, damaged, or replenished.
5. Save the component update through the assembly action.

Seeded examples include `ASM-011` for the Dubai Creek Harbour facade scaffold and `ASM-012` for the Business Bay core wall formwork set.

## 14. Returns & Damage

Use this module when issued stock comes back or when a quantity is damaged, lost, or differs from the issue record.

1. Open **Returns & Damage** and select **Record return**.
2. Select or enter the asset code.
3. Choose **Return**, **Damage**, **Loss**, or **Variance**.
4. Enter issued, returned, damaged, and missing quantities.
5. Record condition, responsible party, location, damage description, and remarks.
6. Select **Save record**.

The backend stores the exception record and updates the asset quantity using the returned quantity. Damaged quantities are retained in the return record for follow-up and may mark the asset as damaged. Do not count missing or damaged units as available stock.

Example:

```text
Issued:          15 safety harnesses
Returned good:   13
Damaged:          2
Missing:          0
```

The returned good quantity is added back to stock; damaged and missing quantities remain exceptions requiring resolution.

## 15. Reports & Audit

Reports & Audit combines movement records from receiving, issue, and transfer operations.

1. Open **Reports & Audit**.
2. Review total stock, asset value, open variance, and audit events.
3. Filter or search by asset, movement type, project, location, or responsible person.
4. Review the recorded date, user, quantity, and status.
5. Select **Export report** to download the available audit information as CSV.

Use this page at the end of each shift to reconcile deliveries, allocations, transfers, and exceptions against site paperwork.

## 16. Backend Data and Persistence

The portal uses these MongoDB collections through REST endpoints under `http://localhost:5000/api`:

| Record | Main endpoint | Purpose |
| --- | --- | --- |
| Assets | `/assets` | Master stock and equipment records |
| Movements | `/movements` | Receiving, issue, and transfer history |
| Inspections | `/inspections` | Checklist, condition, and corrective actions |
| Returns | `/returns` | Return, damage, loss, and variance records |
| Assemblies | `/assemblies` | Scaffold/formwork groups and components |
| Users | `/auth` | Login and registration |

Create, edit, and delete actions return an API response before the screen reports success. A page refresh reloads data from MongoDB. If a browser action appears successful but disappears after refresh, check the backend response and server logs before repeating the transaction.

## 17. Common Problems

### Cannot sign in

- Confirm the backend is running on port 5000.
- Confirm MongoDB is reachable.
- Use the exact seeded email and password.
- Check the backend terminal for an authentication or database error.

### Asset not found

Check spelling, hyphens, and spaces in the asset code. The code must already exist in Asset Register before receiving, issuing, transferring, or recording a return.

### Insufficient stock

An issue or transfer cannot exceed the quantity recorded as available. Record a valid delivery first or reduce the transaction quantity.

### Duplicate asset code

Asset codes are unique. Search the Asset Register before creating a new record and update the existing record when it is the same physical or stock item.

### Table is empty

- Clear the search field.
- Set the status filter to **All**.
- Refresh the page.
- Confirm the backend is connected.
- Confirm the seed command completed if this is a new environment.

### Data does not persist after refresh

Check that the backend request returned success, then open `http://localhost:5000/api/health`. Review the backend terminal for MongoDB connection errors. Do not rely on browser local storage as a replacement for a database transaction.

### Portal does not load

Run `npm run dev` from the project root and open the URL printed by Vite. Use `Ctrl + F5` after a frontend update. If the API is running on a different port, update the API base URL in `src/api/client.ts`.

## 18. Recommended Daily Process

1. Sign in and review Dashboard alerts.
2. Check low-stock, damaged, and inspection-due items.
3. Record each supplier delivery against its GRN.
4. Issue stock to a named person or crew with the correct project.
5. Record every inter-site or warehouse transfer.
6. Complete safety and condition inspections before using critical equipment.
7. Record returns, damage, loss, and variances immediately.
8. Reconcile Reports & Audit with delivery notes and site issue sheets.
9. Sign out after the shift.
