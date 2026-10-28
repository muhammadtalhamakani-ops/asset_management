# Dashboard

The mounted Dashboard now renders `src/Dashboard.tsx`. It displays global active asset-record counts across all projects, independent of the rail's project filter. A zero-quantity asset still counts once. Old value/stock cards, activity, alerts, location bars, quick actions and dashboard-specific filters were replaced.

## Cards and charts

Desktop first row always has five cards: Total Assets, Available, In use, In transit and Low stock. Status names come from the API and stable `systemKey` identifies default cards. Total cannot be removed. The checkbox selector offers active non-default statuses such as Damaged, Under inspection and custom statuses. Extra cards occupy separate rows below the defaults; users can remove them. Browser localStorage key `fieldstock-dashboard-extra-statuses` stores selected status IDs, pruning inactive/deleted/default IDs after successful refresh. Malformed or unavailable browser storage is handled safely.

Category and Status donut charts appear side by side, followed by a full-width **Assets by Project bar chart** (updated from the original line-chart request). Category/status breakdowns include all counted groups, independent of selected extra cards. Project names are alphabetical; zero-count active projects remain on the chart. Charts use native SVG without a chart dependency, stable donut colors, focus/hover/tap tooltips and expandable accessible data tables. Project charts scroll horizontally when needed. Cards/charts stack on mobile. Empty asset data produces zero cards and empty donuts; projects still display their zero counts.

## API and refresh

Authenticated GET `/api/assets-stats/summary` uses `backend/dashboardSummary.js`. It preserves `{ success, data }` with totalAssets/totalValue/byCategory/byStatus and adds byProject. Group rows include `_id`, name, count, isActive and optional systemKey. MongoDB `$facet` computes all counts and value from the same active-asset snapshot; no movement limit or frontend asset filtering is involved. Catalog labels, active zero-count entries, referenced inactive entries and an Unassigned bucket for missing/orphaned relations are resolved server-side. All category/status/project count sums reconcile with totalAssets.

The frontend uses typed `assetAPI.getStatistics(signal)`, with loading/error/retry and aborted obsolete requests. Reopening Dashboard fetches fresh data. The unfiltered App asset-array reference is the refresh key, so persisted asset/stock changes invalidate the summary without letting rail filtering change counts. Shared PortalMetric lives in `src/PortalMetric.tsx`. Existing loading for other modules is retained.

## Verification

Run `npm.cmd run test:dashboard` from backend. Database integration requires explicit `DASHBOARD_TEST_MONGODB_URI`; tests use a fresh `fs_dash_<timestamp>_<pid>` database and drop only that database afterward. They do not fall back to the app database. Without the variable, only the authentication test runs and integration is explicitly skipped.

Executed with a disposable database: **7 tests passed**, none skipped. Tests cover authentication, asset-record rather than quantity totals, zero quantity, active-only data, compatible totalValue/envelopes, labels, zero groups, inactive/missing references, renamed statuses, global/shared access and empty data.

Chrome checks with fully mocked APIs passed: five defaults and renamed status labels; extra-row add/remove/persistence/pruning; rail-independent global counts; donut/bar tooltips; accessible chart data; project scrolling; mobile layout; loading, error/retry and empty states. No browser writes reached live data.

A read-only live summary check returned 1,763 active records, and category/status/project count sums each equalled 1,763. No dashboard migration or live-data writes were needed. Lint (existing warnings only), backend syntax, Vite bundle and diff checks passed. Full TypeScript build remains blocked by the same four pre-existing unused declarations in App.tsx: ActiveReturnModalWithAssets, editAssetRecord, today and LegacyPortalReturns.
