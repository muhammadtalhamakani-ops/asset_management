# Inventory receiving

## Form and data flow

Inventory's **Receive assets** and the Receive Assets page's **New receiving** open the same `ReceiveAssetForm`. Asset and Supplier use the shared searchable/clearable `SearchSelect`. Options come from authenticated `assetAPI.getAll()`, `supplierAPI.getAll()` and `assetAPI.getProjects()`; API success is checked before using the lists. Loading, failed-option retry and missing asset/supplier states block submission.

Selecting an asset fills its tag, active linked supplier, Project, Location and Unit. Project is read-only and must reference an active Project; unresolved/inactive projects show a correction message directing the user to Asset Register. Changing/clearing Asset resets dependent defaults instead of retaining the previous asset's supplier/project. Supplier can be changed for this receiving without changing the asset's supplier.

Asset, Supplier, Project, Quantity, GRN and Bill No. are required. Yup displays red inline errors, validates touched fields and prevents invalid submission. Quantity must be finite and greater than zero, including fractional quantities supported by existing stock workflows. Remarks are optional. The save guard and disabled controls prevent repeated submissions while a save is pending. A failed save retains the form for correction/retry. Small screens stack fields and the form body scrolls while footer actions remain available.

Issue/Transfer keep their existing forms and semantics. Inventory Edit continues to use the existing Asset Register form and its catalog relations.

## Relations and API

The shared authenticated movement model now includes:

| Field | Reference / meaning |
| --- | --- |
| `assetId` | Existing ObjectId reference to Asset |
| `supplierId` | Optional legacy-compatible ObjectId reference to Supplier, indexed |
| `project_id` | Optional legacy-compatible ObjectId reference to Project, indexed |
| `assetCode`, `assetName`, `supplier`, `project` | Server-derived historical label snapshots |
| `unit`, `toLocation` | Server-derived asset snapshots |
| `grn`, `billNo`, `remarks`, `recordedBy` | Trimmed text; first two and recorder required |

New receiving writes always save the Supplier/Project IDs. The schema leaves them optional for old movements and other workflow types. There is no database-enforced SQL foreign key. All authenticated users share receiving records; no ownership fields/filters are introduced.

POST `/api/movements/receive` retains its envelope and uses this preferred payload:

```json
{
  "assetId": "<Asset ObjectId>",
  "supplierId": "<Supplier ObjectId>",
  "quantity": 2,
  "grn": "GRN-001",
  "billNo": "BILL-001",
  "remarks": "Delivered to store",
  "recordedBy": "Recorder name"
}
```

The frontend also sends the selected `assetCode` for compatibility. An active asset is resolved by ID, or by trimmed/uppercased code for older callers. If both are supplied they must match. Project is always derived from the asset's active Project relation. A supplied Project ID/name must agree; clients cannot relocate the asset via receiving. Supplier must be active. Older supplier-name requests resolve only one case-insensitive active match; absent supplier input may fall back to the asset's active linked supplier. Empty/invalid explicit values do not silently fall back. Existing callers must supply valid GRN, Bill No. and recorder text.

Invalid input/unavailable Project or Supplier returns 400; missing/inactive Asset returns 404; authentication remains required. Arbitrary client fields cannot overwrite derived labels, location, unit, ownership or workflow status. Generic movement PUT rejects changes to receiving Asset/Supplier/Project IDs and their snapshot labels; existing remarks updates remain available.

Movement list, detail, receive and update responses retain IDs and resolve current active Supplier/Project names in batches. Inactive/deleted historical references fall back to the saved labels. The receive response still includes the saved `asset`; the frontend uses it to refresh quantity/value/status and trigger the existing dashboard refresh. Receiving increments the asset's quantity/value and retains the existing low-stock-to-available status rule. It does not add a project/location stock ledger. Existing sequential movement/asset saves and optimistic concurrency remain; this change does not introduce transactions or server-side idempotency.

## Safe historical backfill

From `backend`:

```powershell
npm.cmd run migrate:receiving
npm.cmd run migrate:receiving -- --apply
```

Both use the configured `MONGODB_URI`. Default mode previews only. The CLI imports no Mongoose models and uses raw collection reads, avoiding schema-level auto-create/index side effects during preview. The report includes total receiving records, proposed Supplier/Project mappings, changed IDs and unresolved reasons.

Apply fills missing/null relation fields using unique trimmed case-insensitive names from existing catalogs, including inactive historical entries. Ambiguous supplier names, placeholders, missing names and dangling existing references are reported. It never fabricates catalogs, replaces historical labels, derives old projects from the asset's current project, or overwrites existing references. Each field update checks that the relation is still empty and the historical label has not changed. Repeated execution leaves linked records unchanged. No records are deleted.

## Verification

```powershell
# backend
npm.cmd run test:receiving
npm.cmd run test:assets
```

Receiving database integration requires an explicitly supplied `RECEIVING_TEST_MONGODB_URI`; it creates/drops a fresh uniquely named database. Asset integration separately requires `ASSET_TEST_MONGODB_URI`. Integration cases cover ID persistence, required/invalid/inactive input, fixed Project, ID/code agreement, supplier compatibility/ambiguity, shared access, unchanged stock/status effects, read-only preview and idempotent backfill.

Actual verification for this change:

- Receiving tests: two database-free tests passed; database integration skipped because no explicit disposable URI was supplied. Asset tests: two passed, integration skipped for the same reason.
- Headless Chrome with mocked authenticated APIs passed both entrypoints, common dropdown search/clear, supplier/tag/project resets, fixed/missing Project, Yup errors, responsive layout/portal bounds, ID payload, failed save/retry, option-load retry, empty Supplier state and double-submit protection. No live database writes were made.
- Root lint passed with warnings. Backend syntax checks and `git diff --check` passed. Vite production bundle passed.
- Full root build remains blocked by four pre-existing unused declarations in App.tsx: `ActiveReturnModalWithAssets`, `editAssetRecord`, `today`, `LegacyPortalReturns`.
- No live migration/seed or database-connected service was run for verification.
