# Asset Register

Inventory receiving now has a separate shared form with Asset/Supplier ObjectId selectors and a fixed asset Project. See [Inventory receiving](INVENTORY_RECEIVING.md) for APIs, safe historical backfill and tests; Asset Edit continues to use the form described below.

## Access and persistence

Assets, projects, movements, inspections and returns are shared by all authenticated users. Routers retain `requireAuth`, but do not store/filter ownerEmail. Recorder names remain audit information. Assemblies retain their existing owner access rules. Asset codes are trimmed/uppercased, immutable on edit, globally unique even after deactivation, and protected by a case-insensitive unique index installed by migration.

Assets have `isActive` default true. DELETE `/api/assets/:id` sets it false, retaining the asset document, attachments and all history. Normal lists, identifiers/QR lookup, dashboard summaries and new stock/inspection/return operations require an active asset. Historical lists can still populate a deactivated asset. Stock/history writes retain the existing sequential-save architecture; there is no multi-document transaction. Asset optimistic concurrency rejects stale saves, but a history save preceding an asset conflict can still require reconciliation.

Relations use MongoDB ObjectIds:

| Asset field | Target |
| --- | --- |
| categoryId | setup_items under Asset Category |
| departmentId | setup_items under Department |
| makeId | setup_items under Make |
| modelId | setup_items under Model |
| warrantyId | setup_items under Warranty; optional |
| statusId | setup_items under Status |
| supplierId | suppliers; optional |
| project_id | projects |

Text labels remain compatibility/display snapshots. API asset responses resolve the current related labels, return IDs unchanged and hide attachment storage keys. The asset list batches catalog lookups. Backend validates item/master membership and active catalogs. An existing inactive selection may be retained when its master is still active, but cannot be newly selected. Unresolved required legacy selections must be corrected when editing. New writes cannot overwrite ownership, code, tag ID, activity or arbitrary model fields.

The new Project model contains `_id`, unique required name, isActive (default true), and timestamps. GET `/api/projects` returns active projects. Existing six project names are seeded idempotently; no Project management UI is added.

Status master defaults are Available, In use, In transit, Low stock, Under inspection and Damaged. Their internal immutable `systemKey` values (`asset:available`, `asset:inUse`, `asset:inTransit`, `asset:lowStock`, `asset:underInspection`, `asset:damaged`) keep automation stable when names change. Required system statuses cannot be soft-deleted through Setup APIs; custom statuses are supported. Workflow writes use status IDs/keys, and mutation responses include an `asset` object alongside the existing history `data`. The browser uses that saved object rather than duplicating stock/status calculations.

## Add/Edit form

Desktop order: code/tag/name; full-width description; category/department/make; model/warranty/status; order/receive dates and Delivery Note; project/supplier/location; stock fields; attachments; remarks. Three desktop columns collapse to one on small screens. Asset Type and Serial Number are removed from these forms/register columns; legacy values are retained in storage. Subcategory also remains legacy data, without a new editable form field.

Name, code, Delivery Note, order/receive dates, category, department, make, model, unit, project and location are required. Add quantity defaults to 1 and must be positive; edit permits zero stock. Unit defaults to `unit`, with previous measurement options retained. Minimum stock and unit cost default to zero and must be finite nonnegative numbers. Warranty, supplier, description, attachments and remarks are optional. Status defaults to Available. Asset tag and QR remain server-generated; code/tag are read-only on Edit.

Both dates use a calendar picker with visible `dd-MMM-yyyy` formatting, for example `25-Oct-2026`. API dates are strict `YYYY-MM-DD` values stored at UTC midnight. Category/department/make/model/warranty/status fetch active items via master IDs using the common setup API. Project and supplier options come from their active API lists.

Asset Add/Edit validation uses the shared Yup schema in `src/assetValidation.ts`. The form disables native validation popups and displays red messages immediately below each invalid control, linked with aria-describedby/aria-invalid. Fields validate on blur, corrected touched fields revalidate on change, and submit displays all errors and focuses the first invalid field. Rules cover required fields/relation IDs, strict dates, measurement options, create quantity greater than zero (edit permits zero), nonnegative costs/stock and attachment types/count/size. Optional blank cost/minimum values become zero; supplier/warranty remain optional. Duplicate-code API errors also appear beneath Code. General request/loading failures remain in the form alert; server validation is retained.

All grid cells and controls constrain their minimum/maximum width, with long supplier option text clipped to its column. Error messages wrap inside the field, preventing overlap with Location. Chrome checks with mocked APIs verified red below-field errors, correction clearing, blocked invalid submission, valid Add/Edit, and no Supplier/Location overlap using a very long supplier name at desktop/mobile widths. Direct Yup boundary checks verified required, date, number and file limits. Lint and Vite bundle passed; the existing four unused-code TypeScript build errors remain.

## Asset APIs and uploads

Existing asset endpoints/envelopes remain. POST/PUT accept JSON business data or multipart FormData with a `data` JSON string and zero or more `files` fields. Full form updates require the mandatory business fields. The existing scanner's QR-only update is retained.

Example business data:

```json
{
  "code": "MAC-021", "name": "Excavator", "deliveryNote": "DN-001", "categoryId": "<ObjectId>",
  "departmentId": "<ObjectId>", "makeId": "<ObjectId>", "modelId": "<ObjectId>",
  "warrantyId": "<ObjectId>", "statusId": "<ObjectId>", "supplierId": "<ObjectId>",
  "project_id": "<ObjectId>", "quantity": 1, "unit": "unit", "minimum": 0,
  "unitCost": 0, "purchaseDate": "2026-10-25", "receiveDate": "2026-10-26",
  "location": "Store", "description": "", "remarks": "", "removeAttachmentIds": []
}
```

Actual files use backend multer disk storage with generated UUID filenames. Default directory: `backend/uploads/assets`, excluded from Git; optional `ASSET_UPLOAD_DIR` overrides it. Provision a persistent writable directory and back it up with MongoDB. Maximum 10 total files per asset and 10 MiB each. Allowed extension/MIME pairs: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX. This is an extension/MIME allowlist, not malware scanning or content authentication.

Attachment response metadata contains `_id`, originalName, mimeType and size. Authenticated GET `/api/assets/:id/attachments/:attachmentId` downloads the file, only for active assets. Add/Edit lists files, supports multiple selection and individual removal. PUT uses `removeAttachmentIds`; existing files are removed after a successful database update. Failed saves clean new files; asset deactivation retains files. Legacy filename-only attachments are separately displayed as unavailable files.

Errors: 400 validation/reference/unsupported upload; 401 authentication; 404 unavailable asset/file; 409 duplicate code/stale updates; 413 file size exceeded. Files are never served by a public static mount.

## Migration and verification

From `backend`, using existing MONGODB_URI:

```powershell
npm.cmd run migrate:assets                 # Read-only preview; disables automatic collection/index creation
npm.cmd run migrate:assets -- --apply      # Idempotent application
```

Preview reports normalized code conflicts and missing required relations. Apply refuses code conflicts, preserves `_id`, activates only records without an explicit activity flag, normalizes code, converts legacy attachment names, maps real setup/project labels to IDs, creates missing real catalog entries and removes retired ownership fields/indexes from shared collections. It never deletes asset/history records or invents placeholder catalog values. Supplier matches must be unambiguous and active; unmatched labels remain because supplier email is not fabricated. It installs the case-insensitive code constraint. Startup initializes catalogs/projects/statuses, but does not automatically migrate old assets; run the explicit migration during deployment before serving writes.

Live migration processed **20 assets**, with **zero code conflicts**. All 20 lacked legacy Department values, so their required department relations need manual selection. All 20 legacy supplier labels lacked an unambiguous active supplier match; original text was preserved. Readback also found 20 missing receive dates (order dates were present); those dates must be supplied on the next full edit. Matching setup/project relations were migrated. No supplier email or receive date was invented. Readback verified 20 active assets, 11 active projects including preserved legacy project names, six workflow statuses, the case-insensitive unique code index, and zero ownership references across assets/movements/inspections/returns.

Run `npm.cmd run test:assets` from backend. Without explicit `ASSET_TEST_MONGODB_URI`, only the schema test runs; integration is skipped. Integration uses a fresh `fs_asset_<timestamp>_<pid>` database and temporary upload directory, and removes only those test resources afterward. Setup/supplier suites have their own explicit test URI variables. The setup test database prefix is now `fs_setup_test` to satisfy the hosting database-name limit.

The final combined setup/supplier/asset integration run passed **32 tests**, none skipped. Coverage includes migration/idempotency, active relations and wrong-master validation, duplicate-code races, shared access, immutable code, retained inactive selections, upload limits/download/removal/failure cleanup, workflow status relations, soft-delete history/file preservation and legacy-incomplete stock compatibility.

Stock/status workflows validate changed asset paths so missing legacy form-only requirements do not prevent existing assets from operating. A subsequent full asset edit must supply all currently required fields. A separate integration case covers this legacy compatibility.

Installed Chrome was exercised with Playwright and fully mocked API traffic (no live browser writes). Checks passed for desktop three-column/first-row order, mobile one-column/internal scrolling, quantity/unit defaults, dynamic dropdowns, formatted calendar values, selecting multiple files, Add/Edit multipart submission, prefilled fields and read-only code, with no runtime errors. This caught and corrected an Edit project-selection reset after asynchronous option loading. Browser tooling was installed only in the OS temporary directory, not added to repository dependencies.

Root lint, backend syntax, Vite bundle and diff checks are the completion checks. Full TypeScript build still reports the pre-existing unused ActiveReturnModalWithAssets, editAssetRecord, today and LegacyPortalReturns declarations in App.tsx; the previous missing-warranty error was removed with the obsolete asset form.


## Searchable selectors and Asset Details

Mounted screens use the shared SearchSelect component for single-select form fields and filters, including the project rail. It preserves native select names, values, default values and change events for existing FormData and Yup integration. Search filters labels; arrow keys/Enter select; Escape/outside click close without clearing. The clear button clears the selected value/search, or restores a filter's existing All option. Required clears show a red error. Options render in a fixed portal positioned within the viewport to avoid modal clipping. Multi-status checkboxes, date pickers and free-entry asset-code datalists keep their existing behavior.

Asset Register has an explicit View Asset row action. Asset Details requests fresh authenticated asset data and provides loading/error/retry. The page shows current labels, identifiers, Delivery Note, supplier/phone, dates, stock, description, remarks and attachments. Purchase Order has no reliable asset-level source and displays a dash; missing values also display a dash. Legacy serial values remain visible. Back always opens Asset Register.

Image previews and downloads use the authenticated attachment API. Preview blob URLs are revoked when the record changes or the page unmounts. Other attachments remain downloadable; legacy filename-only labels do not become files. The five detail actions (Issue to Site, Transfer, Send for Maintenance, View History, Edit Asset) are intentionally disabled with a future-update explanation. Existing register Edit and workflow screens remain available.

Delivery Note is a trimmed asset string named deliveryNote. POST and full PUT require it, validated by Yup and the backend allowlist; it is not a unique field. The schema permits missing legacy values so migrations and historical/stock saves do not fabricate data or fail solely for this new field. Next full edit requires a value; QR-only updates remain supported. API responses expose supplierContact resolved from the linked Supplier.phone, with an empty string when absent; the UI displays a dash. Phone is not copied into the asset document.


### Verification for dropdowns/details/Delivery Note (2026-10-28)

- Root npm run lint: passed with warnings, including existing unused declarations and state-in-effect warnings.
- Root npm run build: blocked by four existing unused declarations in App.tsx: ActiveReturnModalWithAssets, editAssetRecord, today, LegacyPortalReturns. No additional TypeScript errors from this change. Separate npx vite build passed.
- Backend node --check passed for models/Asset.js, routes/assetRoutes.js, assetCatalog.js and tests/assets.test.js.
- Backend npm run test:assets: two tests passed; the disposable database integration suite skipped because ASSET_TEST_MONGODB_URI was not supplied. Integration cases now cover required/trimmed Delivery Note and supplier phone resolution.
- Headless Chrome with mocked authenticated APIs passed search/select/clear, keyboard/no-results/Escape, required errors, filter reset, FormData/default/ID preservation, Add/Edit Delivery Note, supplier width/mobile portal bounds, fresh detail reads/error/retry, images/download, missing contact fallback, five disabled actions, responsive stacking and return navigation. Receive Project, Return Record Type and Inspection Type/Result selectors were also exercised.
- git diff --check passed. No live database writes, migration or seed was run for this change.
