# Existing coding patterns

The active [Dashboard](DASHBOARD.md) uses the global MongoDB summary endpoint, stable status keys, native SVG charts, persisted extra-card IDs and shared PortalMetric. Counts represent active asset documents; rail filters do not change summary scope.

Asset Register now uses shared authenticated assets/movements/inspections/returns, relation validation, explicit fields, real uploads and soft deletion. See [Asset Register](ASSET_REGISTER.md); these changes supersede the original owner-scoped asset/history examples below. Assembly records remain owner-scoped.

Asset Add/Edit frontend validation uses Yup in `src/assetValidation.ts`, field-level red errors and noValidate to suppress native validation bubbles. Validate touched fields on blur/change and all fields on submit; retain backend validation. Form controls/grid labels must use min-width: 0 and constrained widths so long dropdown labels do not overlap adjacent fields.

General Setup uses shared authenticated records without owner filters, by explicit product requirement. See [General Setup](GENERAL_SETUP.md) for its allowed-field updates, partial duplicate-name index, guarded atomic counter, additive seed, and Node tests. Existing domain ownership conventions remain unchanged.

Supplier Setup is now another shared authenticated module. See [Supplier Setup](SUPPLIER_SETUP.md) for explicit create fields, required name/email, atomic supplier codes, active-only reads, soft deletion and legacy backfill. Other modules remain owner-scoped.

This is a source-grounded reference inspected 2026-10-25. Examples describe existing behavior; known defects below are not recommendations. See [project guide](PROJECT_GUIDE.md) for module/configuration maps and commands. Named handlers remain useful when line numbers drift.

## Organization, naming, and reusable UI

`src/App.tsx` owns local record types (`AssetRecord`, `AssemblyRecord`, etc.), PascalCase functional components, camelCase handlers, and `PortalPage` string-union navigation. `src/main.tsx` mounts default `App`; follow `PortalContent` (`src/App.tsx:419`) to identify live screens. `LegacyApp` (`:1077`), exported static `PortalDashboard` (`:435`), and retained/commented implementations are not the primary application.

Frontend files generally use single quotes and omit semicolons, with both multiline and heavily compressed JSX. Backend files use single quotes, two-space indentation, semicolons, ES modules, named domain model exports, default router exports, and `.js` relative imports. User is a default model export, unlike other models. CSS uses hyphenated global classes, commonly `portal-*`, with responsive media rules in `src/App.css`; do not introduce a new styling system for a small change.

Reuse these existing local building blocks before adding equivalents:

| Function/component | Location | Existing purpose |
| --- | --- | --- |
| `formatPortalDate`, `parsePortalDate` | `src/App.tsx:45`, `:52` | Portal date display and validated textual date parsing |
| `PortalMetric`, `PortalHead`, `PortalStatus` | `src/App.tsx:437` | Metric cards, panel headings, status badges; status class lowercases and replaces spaces with hyphens |
| `PortalRegister` | `src/App.tsx:456` | Register/inventory table, client filters, pagination, edit entry point |
| `PortalModal`, `AssetEditModal` | `src/App.tsx:1029`, `:1025` | Existing modal form shell and loading/error/save patterns |
| `exportAssetsToExcel` | `src/App.tsx:441` | CSV quoting, BOM, Blob download, and object URL cleanup |
| `assetAPI`, `movementAPI`, `supplierAPI`, `inspectionAPI`, `returnAPI`, `assemblyAPI`, `authAPI` | `src/api/client.ts` | Shared domain request entry points |

Helpers/components are mostly private to App.tsx, not an exported component library. Reuse locally where practical; extraction across files is a deliberate change, not an existing architecture requirement. `src/api/examples.ts` is illustrative, uses `any`, and its `createNewAsset` omits current required department/receiveDate fields; inspect actual callers rather than treating it as authoritative shared business logic.

## Requests, responses, and frontend state

`apiFetch` (`src/api/client.ts:6`) constructs Headers, reads `fieldstock-session-token` from localStorage, and attaches `Authorization: Bearer ...`. Domain objects use URLSearchParams for string query filters and JSON request bodies for mutations. Auth uses direct fetch. Every wrapper resolves `res.json()` without checking `res.ok`; HTTP 4xx/5xx responses do not themselves reject the promise.

Domain conventions, represented by `backend/routes/assetRoutes.js` GET/POST handlers:

- List: `{ success: true, data: [...], count }`.
- Detail/update: `{ success: true, data, message? }`; creates generally use 201.
- Failure: `{ success: false, message }`, usually 400 for explicit validation, 401 for auth, 404 for missing owned data, 409 for selected conflicts, 500 in catches.
- Delete response data is inconsistent: asset delete returns data, while movement/inspection/return/assembly delete generally returns a message only. Login adds a top-level `token`; health/root do not use this envelope.

`App` effects (`src/App.tsx:90`) and `PortalSupplierSetup` (`:492`) check `response.success`, assign typed data with casts, and show fallback errors on failure. Response casts are not runtime validation. Supplier/assembly/inspection screens use local loading flags. Modal submits use FormData or controlled state, `event.preventDefault()`, numeric conversion, inline errors, and disabled submit buttons. `App.save` returns an error string or undefined, updates state after successful persistence, and shows a timed toast.

State synchronization is mixed: main saves manually mirror stock/value/status calculations; `AssetEditModal` calls an onSaved callback; `PortalAssemblies` patches local returned records; some edit/delete helpers and `TransferEditModal` use `window.location.reload()`. Examine the affected path and avoid adding another conflicting state strategy. Search is often client-side via JSON.stringify; register pagination is client-side, not server pagination.

## CRUD and queries

`backend/routes/assetRoutes.js` is the broad CRUD example: owner-scoped list plus filters, `_id` lookup with code/QR fallback, create with duplicate-code check and server-generated tag/QR, update with value recalculation, and delete with movement cleanup. Asset creation uppercases/trims code and checks duplicates globally with case-insensitive collation. Update endpoints generally take MongoDB `_id`; business `Movement.id`/`Inspection.id`/`Return.id` are display identifiers, not interchangeable route keys.

Inspect module-specific patterns rather than copying one CRUD handler everywhere:

| Module | Query and mutation behavior |
| --- | --- |
| `backend/routes/movementRoutes.js` | Filter type/status/project/assetCode/date range; timestamp descending, max 500, populate assetId. Dedicated receive/issue/transfer creates; broad PUT and delete affect history only. |
| `backend/routes/inspectionRoutes.js` | Status/asset/date filters, date sort/populate; explicit checklist/condition/status/correctionActions/due-date update followed by save and asset status adjustment. |
| `backend/routes/returnRoutes.js` | Type/resolution/responsible-party/date filters, date sort/populate; PUT allows resolution/replacementCost/remarks only; owner-matched aggregate summaries. |
| `backend/routes/assemblyRoutes.js` | Status/project/location filters, newest first; create embedded components; PUT and component PATCH recalculate completion status. |
| `backend/routes/supplierRoutes.js` | Shared alphabetical active list, validated name/email create with atomic code, explicit business-field update preserving code, and soft delete; no user ownership fields. |

Queries use async/await directly in handlers. Related asset resolution on business creates includes ownerEmail. Aggregate summaries begin with owner `$match`. No shared query builder, lean/DTO layer, general server pagination, or centralized business service exists. `findOneAndUpdate(..., { new: true })` in asset/movement routes differs from load/mutate/save in inspection/return/assembly routes; query updates do not currently request `runValidators`.

## Stock, derived values, and transaction behavior

`backend/routes/movementRoutes.js` saves the movement before saving the changed Asset. Return and inspection creates similarly save their record then the asset. No sessions/transactions or rollback surround these operations. Stock changes are read-modify-save operations rather than guarded atomic increments. A partial failure or concurrent request can leave history and stock inconsistent; do not describe these workflows as atomic database transactions.

Value calculation is repeated as `AED ${(quantity * unitCost).toLocaleString()}` in asset create/update/stock PATCH, movement routes, return routes, seed, and frontend state updates. Numeric quantity/unitCost are the calculation inputs; value is a display string. Stock PATCH sets Low stock at zero; issue sets it below minimum; receive only clears an existing Low stock state when the threshold is met. These are conflicting status rules, not a single reusable policy.

Inspection create changes a failing asset to Damaged and clears Under inspection on Pass; inspection update sets any passing asset Available. Return create adds returned quantity and sets Damaged for damaged quantity. Movement edits/deletes and return deletes do not reverse/recalculate those effects. Asset delete cleans movements only, leaving inspection/return/assembly references unhandled. Confirm desired compatibility and side effects before changing a workflow.

## Validation, errors, and logging

Mongoose schemas in `backend/models/` supply required fields, enums, casts, timestamps, and uniqueness indexes. Asset create adds explicit code/category/department/date presence and valid-date checks; supplier create checks its name. Client inputs add required/min/type constraints, but the backend does not consistently validate positive finite numbers or cross-field quantity totals.

Prefer explicit server field validation and allowed update fields for new work. Existing broad body spreads in asset/movement updates remove ownerEmail but permit many other schema fields and are not an appropriate general template. Schema `unique` is an index declaration, not a substitute for duplicate-key handling. Asset/supplier routes map selected duplicate errors to 409; assembly pre-check uses 400 and does not match its global index scope.

Each router normally catches errors and returns 500 with `error.message`, even for some validation/cast/duplicate failures. `backend/server.js` provides terminal JSON 404 and error middleware, but route catches usually handle their own failures. Logging uses console.log/error in server startup/DB/error paths and example helpers; there is no structured logger, request ID, centralized error taxonomy, or logging service. Avoid copying raw internal error exposure or logging tokens/credentials into new code.

## Authentication and ownership

`backend/routes/authRoutes.js` normalizes email, hashes registration passwords with bcrypt cost 10, compares hashes at login, and returns a profile without the hash. Public registration accepts a descriptive role. No role enforcement, password-reset flow, rate limiter, server session store, or logout revocation was found.

`backend/middleware/auth.js` signs base64url JSON `{ email, expiresAt }` with HMAC-SHA256 and compares signatures using timingSafeEqual. Tokens last seven days; they are custom tokens, not JWTs. `requireAuth` places email in req.user. Every domain router installs it and normal queries scope by that email. The browser's localStorage profile/page flags are convenience state and cannot authorize backend access.

For new handlers, reuse requireAuth and server-derived ownership on all relevant operations, including related lookups/aggregations. Do not trust incoming ownerEmail or use UI role labels as permission checks. Keep security improvements within the requested scope; the issues below need deliberate remediation.

## Known defects, inconsistent patterns, and investigation targets

These findings are based on inspected code, not live database/browser reproduction unless stated.

| Finding | Evidence and implication |
| --- | --- |
| Broken asset summary expression | `backend/routes/assetRoutes.js`, GET `/assets-stats/summary`: `$regexFind: { ... }.captures[0]` accesses captures on a JavaScript object without that property while constructing the pipeline. This can throw before aggregation executes; it also attempts to derive totals from formatted money text. |
| Secret initialization order | `backend/middleware/auth.js` reads SESSION_SECRET at module scope; `backend/server.js` calls dotenv.config only after static imports evaluate. A secret supplied only by the local dotenv file can therefore miss initialization and use the fixed development fallback. Pre-existing process environment differs. |
| Weak token payload checks | `requireAuth` checks email and compares expiresAt but does not require a valid finite expiration; signed malformed payloads need investigation. No User lookup or revocation check occurs per request. |
| Public registration and login messages | `backend/routes/authRoutes.js` exposes registration and distinguishes unknown email from incorrect password. Roles are accepted but not enforced; there is no demonstrated administrative authorization. |
| Stock/history consistency | Movement/return/inspection handlers use sequential saves; movement PUT/DELETE do not reconcile assets. Negative/string quantities and concurrency are insufficiently guarded; no numeric min constraints cover most stock fields. |
| Transfer granularity | `backend/routes/movementRoutes.js`, transfer create updates the entire asset location even when transfer quantity is smaller than stock. There is no per-location quantity model. |
| Reference/populate mismatch | Assembly schema embeds components and parent ObjectIds without refs, but `backend/routes/assemblyRoutes.js` populates both paths. Do not assume these calls resolve Asset documents; behavior needs a runtime check. |
| Return bill number mismatch | Return UI/types send/display billNo (`src/App.tsx`, return modals/table), but `backend/models/Return.js` and create handler omit it. It is not persisted by that path. |
| Scanner promises exceed lookup | `PortalScanner` matches asset.code only despite its QR input label and hardcodes some assigned-party/inspection text. No camera decoder exists; backend QR lookup capability is separate. |
| Owner versus index scope | Asset/Assembly codes and history business IDs are globally unique, while queries are owner-scoped. Assembly duplicate pre-check is owner-scoped despite a global unique index. Supplier codes are globally unique and records are shared; old owner indexes are removed by its initializer. |
| Short generated IDs | Movement, inspection, and return creates use the last four digits of Date.now with a prefix. Global unique indexes can reject collisions/reuse; QR replacement in the UI uses a short timestamp suffix, unlike UUID generation on asset create. |
| Sparse QR default | Asset qrCode is unique/sparse but defaults to the literal 'Not recorded'; sparse indexes do not omit an actual placeholder value. Normal create overwrites it, but direct model inserts need care. |
| Orphans and denormalization | Asset delete removes movements only; copied asset names/codes on history are not synchronized on asset edits. There is no general referential integrity/cascade strategy. |
| Sample owner mismatch | `backend/seed.js` inserts domain records without ownerEmail, relying on model system-owner defaults. Seeded login accounts therefore do not automatically own that data under current query scoping. Seed also deletes users and five domain collections, but not suppliers. |
| Incomplete state/config robustness | `App` parses stored user JSON without a guard; client has no centralized 401 reset. API origin is hardcoded, CORS is unrestricted, and server listen/health are not gated on a successful DB connection. |
| Legacy documentation security/version claims | `backend/README.md` includes credential-like connection material; older root guides claim production readiness/coverage and old Node compatibility without executable evidence. Do not copy secrets or treat those claims as validation. |
| Accumulated UI debt | `src/App.tsx` includes unused return implementations/helpers, commented login variants, demo/LegacyApp, and duplicated state calculations; App.css retains overlapping rules. `PortalHead` renders an action button without a callback. Inspect active wiring before reuse. |

## Testing and completion pattern

There is no established automated test pattern in project source: neither manifest has a test script, and no test files/framework/CI checks were found. `API_TESTING.md` is manual documentation, not test coverage. For future code tasks, use root lint/build, targeted backend syntax checks, and focused authorized manual API/browser checks suitable to the changed behavior. Build writes generated output; backend startup and seed can connect to real configured data.

During this documentation task `npm.cmd run lint` exited 0 with 15 pre-existing warnings. Runtime/API and browser checks were not performed. Preserve unrelated changes, inspect the final diff, verify referenced paths, and report what was actually tested. Update these guides when the documented behavior changes, without reproducing the same instructions across multiple documents.


Mounted single-select dropdowns use `SearchSelect` (React/CSS, no new dependency). Pass native select props/options; native change events and the visually hidden named select preserve existing FormData/Yup integration. Search options are portalled to avoid modal overflow. Give standalone filters an aria-label; nested fields derive their visible label. Clearing a filter restores its All option. Dashboard multi-select checkboxes, date controls and free-entry datalists are separate controls. See ASSET_REGISTER.md for Delivery Note and the read-only details screen.
