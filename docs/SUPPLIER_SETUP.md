# Supplier Setup

Suppliers are shared by all authenticated users. `requireAuth` remains mandatory, but neither reads nor writes use the session email. Supplier business email remains a required contact field; ownerEmail/createdBy are not stored.

## Data and API

`suppliers` retains MongoDB `_id` and timestamps. Required fields are `companyName`, valid trimmed/lowercase `email`, and backend-generated immutable six-digit `code`. Contact person, phone, address, tax ID and notes are optional strings. `isActive` is backend controlled, default true. The old status field and ownership fields are removed.

`supplier_counters` stores a separate global supplier sequence under `_id: 'suppliers'`. Atomic guarded `$inc` starts at `000001`, never returns allocated numbers, and returns 409 after `999999`. Failed inserts/concurrent migration runs may leave gaps. A partial unique code index protects all string codes. Missing legacy codes are permitted only during migration; all API creates require a generated code. Names/emails are not unique: existing suppliers from different users are retained without merging. Old ownership indexes are removed.

| Method | Endpoint | Contract |
| --- | --- | --- |
| GET | `/api/suppliers` | Shared active suppliers sorted by companyName; `{ success, data, count }` |
| POST | `/api/suppliers` | Required `{ companyName, email }`, optional `{ contactPerson, phone, address, taxId, notes }`; 201 and created record |
| PUT | `/api/suppliers/:id` | Same business fields as create; updates an active supplier and preserves code |
| DELETE | `/api/suppliers/:id` | Sets isActive false, returns saved record; never deletes physically |

Create and update ignore client code, status, isActive, ownerEmail and createdBy. Name/email and optional-field types are validated on the server. PUT accepts the complete business form; omitted optional fields become empty strings. Invalid data/IDs return 400; missing authentication 401; unavailable/inactive supplier on update/deletion 404; sequence exhaustion/code conflicts 409. Unexpected errors return generic 500 messages. Codes are never recycled after deactivation. Updates never allocate a new code. No reactivation endpoint is introduced.

The shared Add/Edit form exposes business fields; supplier name and email are mandatory. Edit pre-fills all existing details and shows the original code in a disabled, read-only input. The active list displays code, Edit and Delete actions, with named confirmation explaining deactivation. Successful saves update the row without reloading the page. Successful creation shows the generated code in the row and notification. No activity/status selector is exposed. Pending mutations disable repeated submission and modal dismissal.

Frontend contact validation applies in both Add and Edit: email requires a complete address with a dotted domain. Phone remains optional; when provided it must contain 7–15 digits, optionally with a leading +, spaces, parentheses, dots or hyphens. Invalid fields show native browser validation messages on blur/submit, and correcting input clears the error. Validation runs again before sending the form, including prefilled values. This phone format check is frontend-only; existing server email validation remains enforced.

## Existing-data migration

Run from `backend` using existing `MONGODB_URI`/`.env`:

```powershell
npm.cmd run migrate:suppliers
```

Server startup also calls the same idempotent initializer before serving supplier endpoints. It initializes indexes/counter, raises the counter to at least the highest existing valid code, drops indexes referencing ownerEmail, converts missing isActive from legacy status (Inactive becomes false, otherwise true), removes status/ownerEmail/createdBy, and backfills missing/null/empty codes in `_id` order. Existing codes, IDs, contact data and explicit isActive values are retained. Existing supplier email values are not invented or overwritten; required validation applies to new suppliers.

Do not reset/delete the supplier counter or run the destructive sample seed. Preserve counter and suppliers together in backups. Initialization uses sequential idempotent writes rather than a multi-document transaction; a failed run can be safely rerun. Run migration before serving writes from an older backend version during deployment.

Applied database readback confirmed the existing supplier has code `000001` and isActive true; zero ownerEmail/createdBy references and zero legacy status fields remain.

## Tests and verification

```powershell
# From backend:
npm.cmd run test:suppliers
$env:SUPPLIER_TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017'
npm.cmd run test:suppliers
```

Database tests use a fresh `fs_sup_test_<timestamp>_<pid>` database, ignoring the database name in the explicitly provided test URI, then drop only that temporary database. No application database fallback exists in the test suite. Without the URI, three tests pass and database integration is skipped.

Executed with an explicit URI on the configured server: **9 tests passed**, none skipped. Tests verify schema/HTTP validation, optional fields, generated codes despite spoofed client fields, migration/ID preservation, inactive conversion, removal of ownership indexes/references, idempotent backfill, shared reads/editing/deletion across two users, concurrent unique codes, immutable code/activity on update, update validation/missing records, and no code reuse or editing after soft deletion. Counter exhaustion is covered with a mock.

`npm.cmd run lint` passed with 15 existing warnings. Changed backend JavaScript passed `node --check`; `git diff --check` passed. `npm.cmd exec -- vite build` passed. Full `npm.cmd run build` remains blocked by five existing App.tsx TypeScript errors: four unused declarations and missing warranty in the asset-create payload. Browser checks were not available.
