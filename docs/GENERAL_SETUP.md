# General Setup

The SETUP > General Setup screen uses shared records. Every authenticated user can list, create, edit and deactivate ordinary items; no ownerEmail/createdBy or role restrictions apply. The [Asset Register](ASSET_REGISTER.md) now consumes these items as relations and initializes a Status master with protected workflow statuses.

## Database and initialization

- `setup_master`: MongoDB `_id`, unique required trimmed `name`, `isActive` default true.
- `setup_items`: MongoDB `_id`, immutable unique six-digit `code`, required trimmed `name`, immutable ObjectId `parentId` referencing SetupMaster, `isActive` default true, internal lowercase `normalizedName`.
- `setup_counters`: internal key `_id: 'setup-items'` and numeric high-water mark `value`.

There is no additional item/master `id` or virtual alias. A partial unique index on `(parentId, normalizedName)` rejects case-insensitive active duplicate names within a master. Deactivation permits reuse of the name with a new code. `(parentId, isActive, code)` indexes listings. Parent existence/activity is checked in the API; MongoDB refs are not foreign-key constraints.

The server initializes indexes/counter after connection and gates setup requests on readiness. To insert defaults, run from `backend`:

```powershell
npm.cmd run seed:setup
```

This additive command uses existing `MONGODB_URI` (environment or backend `.env`). It upserts Asset Category, Warranty, Make, Model and Department without deleting records, duplicating defaults, resetting the counter or reactivating existing masters. When only the earlier Assets Category label exists, it renames that master in place, preserving its MongoDB ID and item references. No new application environment variable or SQL migration is needed. The original `seed` command remains destructive and must not be used for this feature.

Codes start at `000001`. A guarded atomic `$inc` allocates globally unique numbers; an item unique index is the final constraint. Failed inserts may consume numbers, intentionally leaving gaps. No multi-document transaction/replica set is required. Codes are never reused by this module. At `999999`, further creation returns 409. Preserve the counter with item backups and never reset/delete it manually.

## API

All endpoints require the existing bearer session token. All path IDs are MongoDB `_id` strings. Responses preserve `{ success, data?, message?, count? }`.

| Method | Endpoint | Request / result |
| --- | --- | --- |
| GET | `/api/setup-masters` | Active shared masters |
| GET | `/api/setup-items/:parentId` | Active shared items ordered by code |
| POST | `/api/setup-items` | `{ "name": "Excavators", "parentId": "<master ObjectId>" }` |
| PUT | `/api/setup-items/:parentId/:id` | `{ "name": "Heavy excavators" }` |
| DELETE | `/api/setup-items/:parentId/:id` | No body; soft delete |

Example create response (201):

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "code": "000001",
    "name": "Excavators",
    "parentId": "507f1f77bcf86cd799439011",
    "isActive": true
  },
  "message": "Setup item 000001 created."
}
```

Master data includes `_id`, `name`, `isActive`; item data includes the five fields above. Lists return data arrays and count. Update returns the saved item; delete returns it with `isActive: false`. Internal normalized names are hidden.

Only name/parent are accepted on creation, only name on update. Extra fields cannot change code, parent, activity or ownership. Invalid IDs/empty or non-string names return 400, missing/invalid authentication 401, unavailable/inactive masters/items or parent mismatch 404, active duplicate names and sequence exhaustion 409. Unexpected failures use generic 500 messages. Inactive items cannot be edited/deleted again.

## Frontend and verification

`src/GeneralSetup.tsx` dynamically renders masters as cards, in two columns above 899px and one below 900px. Cards fetch independently with loading/errors/retry. The shared Add/Edit modal hides code on create and shows it read-only on edit. Delete confirmation names the item and explains deactivation. Existing portal styles and notifications are reused. Mutations update only the affected card and block repeated submission/dismissal; pending fetches are aborted on unmount or superseding mutations.

Root checks: `npm.cmd run lint`, `npm.cmd run build`, `git diff --check`. Backend focused checks:

```powershell
npm.cmd run test:setup
# Optional explicit disposable MongoDB server for integration tests:
$env:SETUP_TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017'
npm.cmd run test:setup
```

Tests never fall back to application `MONGODB_URI`. Integration tests create a fresh `fieldstock_setup_test_<timestamp>_<pid>` database and drop only that database afterward; credentials need create/drop access. They cover idempotent seeding, concurrent allocation/duplicate-name races, cross-user shared access, immutable fields, invalid/inactive relationships, soft deletion and exhaustion. Without the test URI, database integration is explicitly skipped. Schema, mocked counter query/format/exhaustion and HTTP authentication/input validation tests run without MongoDB; mocks do not verify database concurrency.

Browser checklist: desktop/mobile columns, dynamic additional master after reopening, Add/Edit/Deactivate, generated/read-only code, duplicate/empty-name errors, failed-request retry, repeated submission protection, and shared data across users.

Implementation verification:

- `npm.cmd run test:setup` from backend: four passed, one database integration suite skipped because no disposable URI was configured.
- `npm.cmd run lint`: passed with 15 existing warnings; no new module warnings.
- `npm.cmd run build`: failed on five existing App.tsx TypeScript errors (four unused declarations and a missing warranty field in the existing asset-create payload). An in-memory check using the original HEAD App.tsx reproduced the same five errors without changing working files.
- `npm.cmd exec -- vite build`: production bundle passed independently of those existing TypeScript errors.
- `node --check` on new/modified backend JavaScript and `git diff --check`: passed.
- `npm.cmd run seed:setup`: succeeded with network access; database readback verified all five requested masters exist with `isActive: true`, including the corrected Asset Category name.
- Browser checks were unavailable in this environment; Playwright/browser tooling was not installed.

Files added: `src/GeneralSetup.tsx`, `src/GeneralSetup.css`, `backend/models/SetupMaster.js`, `backend/models/SetupItem.js`, `backend/models/SetupCounter.js`, `backend/setup.js`, `backend/seedSetup.js`, `backend/routes/setupRoutes.js`, `backend/tests/setup.test.js`, and this guide. Existing files updated: `src/App.tsx`, `src/api/client.ts`, `backend/server.js`, `backend/package.json`, `AGENTS.md`, `docs/PROJECT_GUIDE.md`, and `docs/CODING_PATTERNS.md`. Pre-existing App.tsx/navigation edits and root lockfile changes were preserved.
