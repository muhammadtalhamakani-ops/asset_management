# Repository instructions

## Start here

- Read applicable `AGENTS.md` instructions first, including any instructions beneath the directory being changed.
- FieldStock manages construction assets, stock movements, suppliers, assemblies, inspections, and returns. The frontend uses React 19, TypeScript 6, Vite 8, plain CSS, Lucide, and qrcode.react. The separate backend uses JavaScript ES modules, Express 4, Mongoose 8/MongoDB, bcryptjs, and custom HMAC session tokens.
- Read only documentation relevant to the task: [project guide](docs/PROJECT_GUIDE.md) for architecture, modules, schemas, configuration, and commands; [coding patterns](docs/CODING_PATTERNS.md) for implementation examples, reuse, API/security conventions, and known pitfalls. These files are lookup references, not automatically loaded context.
- Inspect the relevant live implementation, its callers, API client, routes, and schema before coding. Older root documentation and `src/api/examples.ts` can lag behind source.

## Implementation rules

- Reuse domain API objects in `src/api/client.ts`, existing record types, date helpers, modal structures, `PortalStatus`/`PortalHead` in `src/App.tsx` and shared `PortalMetric` in `src/PortalMetric.tsx` where appropriate. Check active `PortalContent` wiring; exported `LegacyApp` and older demo components are not the mounted application.
- Match local style: PascalCase components/models/types, camelCase functions/fields, `*API` client objects, `*Routes.js` route files, and hyphenated CSS classes. Frontend generally omits semicolons; backend uses them. Use ES modules and `.js` extensions for backend relative imports.
- Keep changes focused; avoid unnecessary refactoring, dependencies, and unrelated formatting. Preserve user changes and backward compatibility unless the task requires a change.
- Keep domain requests behind `apiFetch` so the bearer token is attached. Preserve `{ success, data?, message?, count? }` response envelopes and check `response.success`; JSON parsing alone does not detect API errors.
- For protected routes, reuse `requireAuth`, scope reads/writes and aggregation matches by `req.user.email`, and derive `ownerEmail` on the server. Roles are descriptive today, not implemented permission checks. Preserve isolation when resolving related records.
- General Setup, Supplier Setup, assets, projects, movements, inspections and returns are shared by all authenticated users, without ownerEmail fields/filters. Assemblies remain owner-scoped. See [asset register guide](docs/ASSET_REGISTER.md) for relations, soft deletion, uploads and migration.
- Use model enums and exact status strings. Validate input on the server; HTML validation is insufficient. For new update logic, use explicit allowed fields and appropriate Mongoose validation rather than copying broad body spreads or unvalidated query updates.
- Preserve `_id` versus business `id`/`code` distinctions. Check actual uniqueness indexes: most business IDs are global; supplier codes are globally unique and supplier names are not unique. Do not assume SQL tables, migrations, cascade deletion, transactions, or per-location inventory exist.
- Inspect all affected stock/value/status side effects. Current workflows use sequential saves, not database transactions, and some frontend handlers duplicate their calculations. Treat documented inconsistencies as debt, not rules to reproduce or permission to fix unrelated code.
- Follow local error envelopes and useful UI loading/error feedback. Do not expose secrets or add credentials to logs/docs. Existing credential-like material in legacy docs is not configuration to copy.

## Verification and completion

- Temporary public demos use the local Express production build plus Cloudflare Quick Tunnel; see [deployment guide](docs/DEPLOYMENT.md). A private SESSION_SECRET is required, and registration is disabled by default and always disabled in frontend-serving mode. Demo checks: `npm.cmd run test:demo` from `backend`.

- Run relevant checks and report actual commands, results, and limitations. Root scripts are `npm run lint` and `npm run build`; on Windows use `npm.cmd` when PowerShell blocks `npm.ps1`. Build generates output/cache. Backend syntax can be checked with `node --check <file>` without starting the server.
- No general repository test suite exists; General Setup has focused tests described below. Use focused manual checks when appropriate, with authorized disposable data for writes; do not claim automated coverage from legacy documentation.
- General Setup now has focused Node tests: run `npm.cmd run test:setup` from `backend`. Database integration requires explicit `SETUP_TEST_MONGODB_URI` and uses a fresh disposable database. `seed:setup` is additive; the original `seed` remains destructive.
- Supplier Setup tests run with `npm.cmd run test:suppliers` from `backend`; integration needs explicit `SUPPLIER_TEST_MONGODB_URI` and creates/drops only a fresh test database. See [supplier guide](docs/SUPPLIER_SETUP.md) for shared-data migration and code backfill.
- Asset tests run with `npm.cmd run test:assets`; integration needs explicit `ASSET_TEST_MONGODB_URI` and isolated temporary files/database. `migrate:assets` previews only; `migrate:assets -- --apply` maps legacy relations and shared access without deleting records. Assets are soft-deleted; retain history and files.
- Receiving tests run with `npm.cmd run test:receiving`; integration needs explicit `RECEIVING_TEST_MONGODB_URI` and a fresh disposable database. `migrate:receiving` previews existing Supplier/Project mappings; `-- --apply` fills only unique historical matches. See [inventory receiving guide](docs/INVENTORY_RECEIVING.md) for fixed asset Project, relations and backfill.
- Dashboard tests run with `npm.cmd run test:dashboard`; database tests need explicit `DASHBOARD_TEST_MONGODB_URI`. The dashboard uses global active-record counts from `/api/assets-stats/summary`, independent of rail filters. See [dashboard guide](docs/DASHBOARD.md).
- Never run `backend`'s seed script as a routine check: it deletes entire collections, including users. Do not start database-connected services or mutate data just to verify documentation.
- Check the diff for unintended files and run `git diff --check`. Summarize what changed, verification, and unresolved risks without claiming checks you did not run.
- Update the relevant detailed guide when architecture, schemas, contracts, conventions, commands, or shared functionality changes. Update this file when essential instructions or lookup links change; preserve useful existing documentation.
