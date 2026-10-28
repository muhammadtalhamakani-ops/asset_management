# FieldStock project guide

## Evidence and scope

Inspected 2026-10-25. This guide describes repository source, not a verified deployed system. Locations use paths and named symbols or route handlers; line numbers are starting points in the inspected revision. Database connectivity, existing data/indexes, deployment, and browser workflows were not exercised. No prior `AGENTS.md`, migration directory, CI workflow, or automated test suite was found outside installed dependencies.

Existing `README.md` is largely the Vite template. `ARCHITECTURE.md`, `SETUP.md`, `START_HERE.md`, `QUICK_REFERENCE.md`, `IMPLEMENTATION_SUMMARY.md`, `PROJECT_COMPLETION.md`, and `VISUAL_SUMMARY.md` contain older integration examples/completion claims. `API_TESTING.md` is a manual curl/Postman reference; `USER_MANUAL.md` describes user workflows. Preserve these resources, but verify instructions against source: older requests omit bearer authentication and newer required asset fields. Historical claims of complete tests or production readiness are not verification evidence. Legacy documentation contains credential-like connection strings; do not reproduce them.

## Architecture and stack

Inventory and Receive Assets now share a receiving form with Asset/Supplier references and an asset-derived fixed Project. See [Inventory receiving](INVENTORY_RECEIVING.md) for API compatibility, the non-destructive backfill command and verification.

The active Dashboard is now the global asset-count dashboard documented in [Dashboard](DASHBOARD.md): five fixed cards, optional status cards, category/status donuts and project bars backed by the aggregate summary API. The old dashboard descriptions below are historical.

Current Asset Register changes supersede the original asset/ownership descriptions below: see [Asset Register](ASSET_REGISTER.md) for shared assets/history, ObjectId catalogs/projects, real attachments, soft deletion, applied migration and integration tests. Assemblies retain ownership isolation.

General Setup additions are documented in [General Setup](GENERAL_SETUP.md): shared authenticated masters/items, atomic codes, additive seed, API contracts, and focused Node tests. It is an intentional exception to the owner-scoped domain modules below.

Supplier Setup is also shared: see [Supplier Setup](SUPPLIER_SETUP.md) for required name/email, generated supplier codes, active-only lists, soft deletion, applied legacy backfill and tests.

FieldStock is a construction inventory and asset portal. Browser entry `index.html` loads `src/main.tsx`, which mounts the default `App` from `src/App.tsx` under React `StrictMode`. Navigation uses local React page state rather than a URL router. Most types, forms, tables, helpers, and business UI live in that single file. There is no separate frontend service/store/component directory.

Flow: React components -> exported domain API objects in `src/api/client.ts` -> browser fetch to `http://localhost:5000/api` -> Express routers -> Mongoose models -> MongoDB. Routes contain handler and business logic directly; no controller/service/repository layer exists. Backend and frontend have separate manifests and lockfiles, not npm workspace configuration.

Manifest ranges (`package.json`, `backend/package.json`): React/React DOM `^19.2.8`, Vite `^8.2.2`, TypeScript `~6.0.2`, Lucide `^1.38.0`, qrcode.react `^4.2.0`; Express `^4.18.2`, Mongoose `^8.0.0`, bcryptjs `^2.4.3`, cors `^2.8.5`, dotenv `^16.3.1`, body-parser `^1.20.2`. Oxlint supplies linting; nodemon is installed as a backend dev dependency but the dev script uses Node watch mode. These are declared ranges, not a claim about deployed versions.

## Directory and responsibility map

| Path | Responsibility |
| --- | --- |
| `src/main.tsx`, `index.html` | React bootstrap and document shell |
| `src/App.tsx` | Mounted portal, local navigation/auth state, record types, domain screens, forms, exports; also retained legacy/demo UI |
| `src/App.css`, `src/index.css` | Global/portal styles and responsive breakpoints; index imports Google Fonts |
| `src/api/client.ts` | Shared fetch/token adapter and seven domain API objects |
| `src/api/examples.ts` | Illustrative integration functions; not imported by the mounted app |
| `src/assets/`, `public/` | Images and static SVG assets |
| `backend/server.js` | Environment loading, permissive CORS, 10 MB parsers, DB connection, route mounts, health, fallback/error handlers, startup/shutdown |
| `backend/middleware/auth.js` | Token signing and bearer verification |
| `backend/routes/` | Asset, movement, inspection, return, assembly, supplier, and authentication handlers |
| `backend/models/` | Seven Mongoose model schemas and indexes |
| `backend/seed.js` | Destructive sample-data reset and inserts; not a migration |
| `backend/.env.example`, `backend/.env` | Example/local environment locations; local environment is ignored by `backend/.gitignore` |
| `vite.config.ts`, `tsconfig*.json`, `.oxlintrc.json` | React plugin, TypeScript project/bundler checks, Oxlint rules |
| `artifacts/FieldStock-Portal-Screens.pdf`, `artifacts/asset-portal-screens/` | Reference screenshots/PDF; not executable tests |
| `PRESENTATION_CONTENT.txt`, root Markdown files | Presentation, historical setup, manual testing, and usage material |

## Application workflows

- **Authentication:** active `PortalSignedOut` (`src/App.tsx:392`) calls `authAPI.login`; the backend normalizes email, compares a bcrypt hash, and returns profile plus a signed token. Browser localStorage persists `fieldstock-session-token`, `fieldstock-user`, signed-in state, page, and active project. Logout clears auth state through effects. Backend authorization uses the token email, not browser profile values.
- **Navigation/loading:** `App` (`src/App.tsx:80`) loads assets and multiple movement subsets plus returns after sign-in. `PortalContent` (`:419`) chooses the active screen. Suppliers, assemblies, and inspections load through their own screen components. The active-project selector filters the asset array; it does not uniformly filter every module's independent data.
- **Assets/inventory:** `PortalRegister` (`:456`) shares register/inventory UI, local search/filtering, and ten-row client pagination. Asset creation goes through `PortalModal` (`:1029`); backend normalizes code and creates tag/QR identifiers. Value is stored as an AED-formatted string alongside numeric quantity and unit cost. `AssetEditModal` (`:1025`) updates parent state; some other actions reload the document.
- **Receiving/issues/transfers:** `App.save` and `backend/routes/movementRoutes.js` coordinate movements and assets. Receive increases stock; issue decreases it and sets In use/Low stock; transfer changes the asset's single location and sets In transit without decreasing its quantity. A transfer quantity does not create separate location balances.
- **Returns/damage:** `ReturnModalWithAssets` (`:1008`) and `backend/routes/returnRoutes.js` save a return record, add returned quantities, calculate damage replacement cost, and mark damaged assets. Returns are separate from movement history.
- **Assemblies:** `PortalAssemblies` (`:581`) manages selection, creation, component counts/conditions, QR display, and deletion. Component updates calculate Available/Incomplete from counts. They do not allocate stock from Asset records.
- **Inspections:** `PortalInspections` (`:861`), `InspectionCreateModal` (`:942`), and inspection routes record checklists, inspector, outcomes, and corrective actions. Creating/updating inspections can alter asset status. Default next due date on create is 30 days ahead.
- **QR/export/reporting:** `PortalScanner` (`:777`) generates QR images with qrcode.react and saves replacement QR values through asset updates. Current manual lookup matches asset code only; there is no camera decoding implementation. Backend asset lookup also accepts QR values. `exportAssetsToExcel` (`:441`) actually creates quoted UTF-8 CSV, not XLSX. `PortalReports` (`:1003`) computes summaries from loaded records; movement retrieval is capped at 500.

## Data model and relationships

All seven models enable timestamps. MongoDB documents, not SQL tables, are the persistence model. Collection names below follow Mongoose defaults unless explicitly configured; actual database contents and indexes were not queried.

| Model / schema source | Collection | Important structure and relationships |
| --- | --- | --- |
| `backend/models/User.js` | Explicit `login_users` | Unique normalized email, password hash, name, descriptive role |
| `backend/models/Asset.js` | Expected `assets` | Globally unique code; required name/type/category/department/quantity/unit/minimum/unitCost/purchaseDate/receiveDate/location; metadata, ownerEmail, status, formatted value; unique sparse qrCode |
| `backend/models/Movement.js` | Expected `movements` | Globally unique business id; required Asset ObjectId ref, copied code/name/unit, quantity, type, status, owner, recorder, timestamp; location/supplier/bill fields |
| `backend/models/Inspection.js` | Expected `inspections` | Unique business id; Asset ref and copied identity; checklist, inspector, correctionActions, outcome, condition, due/date fields, owner |
| `backend/models/Return.js` | Expected `returns` | Unique business id; Asset ref and copied identity/QR; issued/returned/damaged/missing quantities, responsible party, resolution, replacement cost, owner |
| `backend/models/Assembly.js` | Expected `assemblies` | Globally unique code and sparse unique QR; embedded parentAssets with ObjectIds but no `ref`; embedded components with required/onAssembly/condition; status/location/project/owner |
| `backend/models/Supplier.js` | Explicit `suppliers` | Required name/email, unique generated code, optional contact/tax/address, isActive; shared without ownership fields |

Asset status enum: Available, In use, In transit, Low stock, Under inspection, Damaged. Movement type is lowercase receive/issue/transfer/return/damage; dedicated creation routes implement the first three. Return types are Return/Damage/Loss/Variance; inspection status is Pass/Fail/Needs Repair. Preserve case and spacing; inspect the relevant schema for all allowed values.

Movement, Inspection, and Return use `ref: 'Asset'` and populate assetId in reads. Supplier names, locations, projects, and owner emails are strings without foreign-key constraints; ownerEmail has no User ref. Assembly parent/component arrays are embedded, not separate collections. Index declarations cover owner and selected filter/date fields; inspect each model rather than assuming every field is indexed. Most domain owners default to a system email; Supplier requires an explicit owner. No versioned migrations, transaction wrapper, or general cascade mechanism was found.

## API and configuration

`backend/server.js` mounts all routers under `/api`. Assets, movements, inspections, returns, and assemblies expose list/detail/create/update/delete operations, with special creation paths for receive/issue/transfer. Suppliers expose GET and POST only. Additional routes: `/assets-stats/summary`, `/returns-stats/summary`, PATCH `/assets/:id/stock`, PATCH `/assemblies/:id/components`. Route details and query filters live in the corresponding `backend/routes/*Routes.js` files.

`/api/auth/login` and `/api/auth/register` are public; domain routers call `router.use(requireAuth)`. Public health is `/api/health`; `/` lists selected endpoints. Health returns status/message/timestamp, not the domain envelope, and does not test database readiness. Because routers are mounted in sequence with router-wide auth middleware, unauthenticated unknown `/api` requests can receive 401 before the terminal 404.

`backend/server.js` reads MONGODB_URI and PORT (default 5000) through dotenv. `backend/middleware/auth.js` reads SESSION_SECRET at module evaluation, with a fixed development fallback; note the environment-loading risk in the patterns guide. The API origin is hardcoded in `src/api/client.ts`; Vite config has no API proxy or environment-based origin. There is no verified deployment pipeline/configuration. Google Fonts is an external browser dependency. Do not assume legacy cloud connection or runtime-version claims are current.

## Commands and verification

These commands are verified from scripts/source, not all executed during analysis. Run frontend commands at the repository root and backend commands from `backend/`. On this Windows host, `npm.cmd` avoids the blocked PowerShell npm shim.

| Directory | Command | Effect |
| --- | --- | --- |
| Root | `npm run dev` | Starts Vite development server |
| Root | `npm run build` | Runs `tsc -b` then Vite build; writes build/cache artifacts |
| Root | `npm run lint` | Runs Oxlint without an auto-fix flag |
| Root | `npm run preview` | Serves a built frontend |
| `backend/` | `npm run dev` | `node --watch server.js`; connects to configured MongoDB |
| `backend/` | `npm start` | `node server.js`; connects to configured MongoDB |
| `backend/` | `npm run seed` | **Destructive:** clears Asset, Movement, Inspection, Return, Assembly, User collections before inserting samples; does not clear Supplier |
| Root | `node --check backend/server.js` | Syntax-only check; analogous checks can target backend JS files |
| Root | `git diff --check` | Checks tracked patch whitespace |

No test script, test framework configuration, or project test files were found. Manual API examples in `API_TESTING.md` need current auth and schema fields and may write/delete data. Do not execute them against an existing database without appropriate authorization.

Analysis verification: `npm.cmd run lint` exited 0 with 15 existing warnings (unused declarations, React render purity, and state updates in effects). The plain `npm` invocation was blocked by PowerShell execution policy. Build, live API, seed, and browser workflows were not run for this documentation-only task. Runtime failures discussed in the patterns guide are source-derived risks unless explicitly identified as a direct code defect.
