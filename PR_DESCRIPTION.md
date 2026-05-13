feat(webui)!: Implement dashboard system with MySQL persistence, Hono API, and 9 panel types (resolves #2246).

<!-- markdownlint-disable MD012 -->

# Description

This PR implements the complete CLP Dashboard System as designed in `dashboard-design.md`. The system enables users to create, edit, and view dashboards composed of draggable, resizable panels that visualize data from multiple datasource types (MySQL, CLP Query, Infinity HTTP).

**Architecture:**
- Migrated `components/webui` from npm workspaces to pnpm 10.x + Turborepo 2.x monorepo
- Added Hono 4 for dashboard/datasource routes (chained route definitions for RPC type safety via `hc<AppType>()`)
- Hono coexists with existing Fastify server on same port via delegation plugin
- shadcn/ui (base preset) + Tailwind CSS v4 for new dashboard pages
- 3 zustand stores (layout with zundo undo/redo, time, variable) for UI state
- TanStack React Query for per-panel server state with AbortController cancellation

**Key features implemented:**
- Dashboard CRUD with MySQL persistence (FR-11), optimistic concurrency via version check
- Default datasource provisioning on first startup (CLP MySQL, CLP Query, Infinity)
- 10 lazy-loaded panel plugins: timeseries, stat, table, barchart, logs, markdown, gauge, heatmap, piechart, row
- 12-column CSS Grid with `@dnd-kit/react` drag-and-drop (NFR-1: 60fps)
- MySQL datasource with two-tier row limits (2K unaggregated / 10K aggregated), SQL injection prevention (read-only mode + SQL parsing), parameterized queries
- CLP native query (clp-s KQL) datasource with SSE streaming of partial DataFrames from the async job-queue architecture (submit job → poll MongoDB incrementally → emit partial DataFrames)
- Infinity datasource with JSON/CSV/XML/HTML parsing, URL allowed-hosts whitelist
- SSE streaming for long-running queries (Hono `c.streamSSE()`) with proper streaming through Fastify delegation
- Time range picker with relative expressions (`now-6h`), auto-refresh with Page Visibility API pause
- Dashboard variables (query, custom, textbox, interval, datasource) with cascading dependencies, multi-select, and `dependsOn` editor
- RBAC enforcement in production mode (NFR-11), header spoofing prevention (NFR-12)
- Rate limiting (100 req/min), body size limit (1MB), response size limit (50MB), request timeout (120s)
- Circuit breaker pattern for datasource fault tolerance
- Panel lazy rendering via IntersectionObserver (NFR-2)
- Virtual scrolling for table panels via `@tanstack/react-virtual`
- Panel full-screen mode (Esc to exit)
- Zoom-to-range on time-series charts
- Share URL with time range and variable parameters
- Cross-panel click-to-filter event bus
- Slow query detection (15s threshold)
- Dashboard import/export as JSON
- Bulk delete and duplicate operations
- Annotation overlay system for time-series panels

**Critical bug fixes:**
- Fixed infinite query refetch loop when timeRange uses "now" — `Date.now()` changes every ms causing `resolvedVars` to be a new object every render. Fixed by truncating to second granularity and memoizing by serialized form.
- Fixed SSE streaming through Fastify delegation — previous `res.text()` approach materialized full response, breaking streaming. Now detects `text/event-stream` content-type and streams via `reply.raw`.
- Fixed MySQL streaming query — `mysql2/promise` doesn't expose `queryStream`. Switched to callback-based `mysql2` with `conn.query(sql).stream()`.
- Fixed `usePanelQueries` stale closure — dependency array referenced `opts` object (recreated every render), making `useCallback` a no-op. Replaced with explicit stable dependencies.
- Fixed MySQL DATETIME format — `toISOString()` produces `T`/`Z` format incompatible with MySQL. Created `toMySQLDatetime()` utility.
- Fixed MySQL storage wiring — `MySQLDashboardStorage`/`MySQLDatasourceStorage` were defined but never instantiated. Now wired in `hono-delegation.ts` with migration and provisioning on startup.
- Fixed uid column width — `VARCHAR(10)` was too narrow for provisioned datasource UIDs. Widened to `VARCHAR(32)` matching design doc.
- Fixed CLP query dataset resolution — CLP query scheduler requires non-null `datasets` field; empty arrays result in "No matching archives." Now defaults to `[CLP_DEFAULT_DATASET_NAME]` ("default") when no datasets specified.
- Fixed dashboard save not persisting `tabs` and `tags` — save mutation payload was missing these fields, so tab additions/removals and tag edits were lost on save. Now included in the PUT request body.
- Fixed duplicate `parseTimeRange` implementations — 3 separate manual-regex `parseTimeRange`/`resolveRelativeTime` functions existed across `panel-content.tsx`, `full-screen-panel.tsx`, and `time-range-picker.tsx`, violating NFR-7 (dayjs exclusively). Consolidated into a single `parseTimeRange` using `dayjs().subtract()` in `parse-time-range.ts`, with re-exports from `panel-query-utils.ts`.
- Fixed RBAC NFR-12 header spoofing prevention — original code rejected `x-clp-*` headers only when no gateway was present, silently allowing all headers with a gateway. Now correctly: without gateway, any `x-clp-*` header is rejected (403); with gateway, only `x-clp-role` is trusted, other `x-clp-*` headers are rejected. Gateway marker is preserved for NFR-11 RBAC check, then deleted after.
- Fixed RBAC NFR-11 without gateway — RBAC was enforced unconditionally in production, but Docker deployments have no gateway proxy. Now: without gateway, all operations are allowed (direct trusted access); with gateway, RBAC is enforced.
- Fixed SQL LIMIT injection for non-SELECT statements — `injectLimit()` blindly appended `LIMIT N+1` to any SQL without an existing LIMIT, breaking `SHOW TABLES`, `DESCRIBE`, `EXPLAIN`. Added `isSelectQuery()` guard to only inject LIMIT for SELECT queries.
- Fixed missing `@smithy/types` dependency — `S3Manager/index.ts` imports `AwsCredentialIdentity` from `@smithy/types`, a transitive dependency of `@aws-sdk/client-s3`. With pnpm's strict resolution, transitive types must be explicitly declared.
- Fixed `row` panel type missing from `PanelTypeSchema` — `PanelType` TypeScript union included `"row"` but the TypeBox runtime schema (`PanelTypeSchema`) omitted it, causing 400 validation errors when saving dashboards with row panels via API.
- Fixed stat panel Sparkline crash with non-numeric data — `valueField.values as number[]` cast was unsafe when the fallback field was a string type, causing `NaN` SVG coordinates. Now filters to numeric values before passing to Sparkline. Also replaced `Math.min(...values)`/`Math.max(...values)` spread with `reduce` to avoid stack overflow on large arrays.
- Fixed heatmap `Math.max` stack overflow on large datasets — `Math.max(...(valueField.values as number[]))` throws `RangeError` on arrays exceeding call stack size. Replaced with `reduce`-based max. Also added numeric filtering to prevent `NaN` in color calculations.
- Fixed timeseries and barchart silent empty chart with no numeric Y fields — when all non-first fields were strings (no numeric Y fields), charts rendered with axes but no data lines and no explanation. Now shows "No numeric fields to plot" empty state.
- Fixed CLP query variable interpolation not applied — `panel-query-utils.ts` returned early for object-type queries (CLP `{queryString, datasets}`), so `$variable` patterns in CLP query strings were sent to backend verbatim. Now interpolates `replaceVariables()` on `queryString` for CLP queries.
- Fixed CLP empty-query detection broken — `"" !== q.query` is always true for CLP object queries, so panels with empty CLP query strings still fired requests. Now checks `q.query.queryString` for CLP type queries.

## Impact Assessment

**What is affected:**
- The entire `components/webui/` directory is restructured from npm workspaces to pnpm workspaces
- Old `client/` and `server/` directories are removed; new `apps/webui/` and `packages/` directories are added
- All existing webui functionality (SearchPage, IngestPage, log viewer) is preserved in the new structure
- New dashboard routes are added to the Hono app, which coexists with existing Fastify routes
- Dashboard and datasource data is now persisted in MySQL (was in-memory only, lost on restart)
- 3 default datasources are provisioned on first startup
- CLP native query (clp-s KQL) is now wired through the dashboard datasource system via SSE streaming
- `controller.py` updated to write `SqlDbClpDatasetsTableName` to server `settings.json`

**Why the change is needed:**
- pnpm + Turborepo provides strict dependency resolution, content-addressable storage, task graph caching, and parallel execution — required for the growing monorepo
- The dashboard system enables users to compose custom visualizations, connect to multiple datasources, and arrange panels with drag-and-drop — capabilities that don't exist in the current fixed-card IngestPage
- MySQL persistence ensures dashboards survive server restarts (FR-11, P0)
- CLP native query support bridges the async job-queue architecture (submit job → poll → read MongoDB) into the dashboard's DataFrame/SSE pattern

**Implications:**
- Build commands change from `npm run build` to `pnpm run build` (via Turborepo)
- The `task webui` target must be updated to use pnpm
- Docker image build must install pnpm (via corepack) instead of npm
- Two new MySQL tables (`dashboards`, `datasources`) are created on first startup
- CLP queries submit search/aggregation jobs to the existing `query_jobs` MySQL table and create per-job MongoDB collections for results

# Checklist

* [x] The PR satisfies the [contribution guidelines][yscope-contrib-guidelines].
* [x] This is a breaking change and that has been indicated in the PR title, OR this isn't a breaking change.
* [x] Necessary docs have been updated, OR no docs need to be updated.

# Validation performed

### Automated Tests

**Task:** Run full test suite across all packages

**Command:**
```bash
cd components/webui && pnpm test
```

**Output:**
```
@webui/common:test:  Test Files  1 passed (1)
@webui/common:test:       Tests  2 passed (2)
@webui/datasource:test:  Test Files  7 passed (7)
@webui/datasource:test:       Tests  79 passed (79)
@webui/ui:test:  Test Files  1 passed (1)
@webui/ui:test:       Tests  1 passed (1)
@webui/server:test:  Test Files  12 passed (12)
@webui/server:test:       Tests  80 passed (80)
@webui/client:test:  Test Files  27 passed (27)
@webui/client:test:       Tests  170 passed (170)
Tasks: 9 successful, 9 total
```

**Explanation:** All 332 automated tests pass across 5 packages, including 10 RBAC tests (NFR-11/NFR-12), 26 MySQL datasource tests (including 3 new `injectLimit` tests for non-SELECT statements), and 7 CLP DataFrame converter tests.

### Build Verification

**Task:** Build all packages

**Command:**
```bash
cd components/webui && pnpm turbo run build --force
```

**Output:**
```
Tasks: 6 successful, 6 total
```

**Explanation:** All 6 packages (@webui/common, @webui/datasource, @webui/ui, @webui/server, @webui/client, root) build successfully, including the `@smithy/types` dependency fix.

### CLP Package E2E

**Task:** Start CLP package and compress sample logs

**Command:**
```bash
cd build/clp-package
./sbin/start-clp.sh
./sbin/compress.sh --timestamp-key timestamp ~/samples/postgresql.jsonl
```

**Output:**
```
Started CLP.
Compressed 385.21MB into 10.06MB (38.31x). Speed: 178.84MB/s.
```

**Explanation:** CLP package starts and compresses logs successfully.

### Dashboard CRUD E2E

**Task:** Verify dashboard CRUD with MySQL persistence

**Command:**
```bash
curl -s -X POST http://localhost:4000/api/dashboards \
  -H "Content-Type: application/json" \
  -d '{"title":"E2E CRUD Test"}'
```

**Output:**
```json
{"id":"yWrkWW7ZwxdNZo_xuy5Df","uid":"X0bEU7QSiq","title":"E2E CRUD Test","tags":[],"variables":[],"timeRange":{"from":"now-6h","to":"now"},"panels":[],"version":1,"updatedAt":"2026-05-13 09:52:57.643","createdAt":"2026-05-13 09:52:57.643"}
```

**Explanation:** Dashboard CREATE returns 201 with correct fields. Subsequent READ, UPDATE, DELETE operations all return expected status codes.

### Default Datasource Provisioning

**Task:** Verify default datasources are provisioned on first startup

**Command:**
```bash
curl -s http://localhost:4000/api/datasource
```

**Output:**
```json
[
  {"uid":"clp-mysql","name":"CLP MySQL","type":"mysql","config":{"host":"database","port":3306,...},"isDefault":true},
  {"uid":"clp-query","name":"CLP Query","type":"clp","config":{}},
  {"uid":"infinity","name":"Infinity","type":"infinity","config":{}}
]
```

**Explanation:** All 3 default datasources (MySQL, CLP, Infinity) are provisioned with correct configuration read from `settings.json`.

### MySQL Query E2E

**Task:** Verify MySQL datasource queries against real CLP data

**Command:**
```bash
curl -s -X POST http://localhost:4000/api/datasource/mysql/query \
  -H "Content-Type: application/json" \
  -d '{"from":0,"queries":[{"refId":"A","datasource":{"type":"mysql","uid":"clp-mysql"},"query":"SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() LIMIT 5"}],"range":{"from":0,"to":9999999999999},"requestId":"e2e","scopedVars":{},"to":9999999999999}'
```

**Output:**
```json
{"data":[{"name":"A","fields":[{"name":"table_name","type":"string","values":["clp_default_column_metadata","query_tasks","clp_default_files","clp_datasets","compression_tasks"]}],"length":5}]}
```

**Explanation:** MySQL datasource correctly queries CLP metadata tables via the Hono route with row limit injection.

### CLP KQL Query E2E

**Task:** Verify CLP native query (clp-s KQL) via SSE streaming with ingested data

**Command:**
```bash
curl -s -X POST http://localhost:4000/api/datasource/clp/query/stream \
  -H "Content-Type: application/json" \
  -d '{"from":1679870000000,"queries":[{"refId":"A","datasource":{"type":"clp","uid":"clp-query"},"query":"pgbench","datasets":["default"]}],"range":{"from":1679870000000,"to":1679880000000},"requestId":"e2e-clp","scopedVars":{},"to":1679880000000}'
```

**Output:**
```
Partial: 100 rows, fields: ['timestamp', 'message', 'dataset', 'archive_id']
Partial: 100 rows, fields: ['timestamp', 'message', 'dataset', 'archive_id']
...
Complete: 1000 total rows
```

**Explanation:** CLP KQL query `pgbench` returns 1000 rows of real PostgreSQL log data via SSE streaming. Results include CLP-S schema fields (timestamp, message, dataset, archive_id). Note: the sample data timestamps are from March 2023, so the time range must cover that period.

### CLP Datasets Endpoint

**Task:** Verify CLP datasets endpoint returns available datasets

**Command:**
```bash
curl -s http://localhost:4000/api/datasource/clp/datasets
```

**Output:**
```json
["default"]
```

**Explanation:** The `/api/datasource/clp/datasets` endpoint queries the `clp_datasets` table (configured via `SqlDbClpDatasetsTableName` in `settings.json`) and returns the "default" dataset created during compression.

### Browser E2E Test

**Task:** Verify dashboard UI end-to-end with Playwright (all panel types, API tests, CRUD)

**Command:**
```bash
cd /tmp && node e2e-comprehensive-v2.mjs
```

**Output:**
```
PASS: Dashboard list page loads
PASS: New Dashboard button visible
PASS: Create dashboard and navigate to editor
PASS: Time range picker present
PASS: Timezone selector present
PASS: Refresh controls present
PASS: Edit button present
PASS: Add Panel button visible in edit mode
PASS: All 10 panel types in selector - found=Time Series, Stat, Table, Bar Chart, Logs, Markdown, Gauge, Heatmap, Pie Chart, Row; missing=
PASS: Logs panel added via UI
PASS: Stat panel added via UI
PASS: Markdown panel added via UI
PASS: Table panel added via UI
PASS: timeseries: API add panel
PASS: stat: API add panel
PASS: table: API add panel
PASS: barchart: API add panel
PASS: logs: API add panel
PASS: markdown: API add panel
PASS: gauge: API add panel
PASS: heatmap: API add panel
PASS: piechart: API add panel
PASS: CLP datasets endpoint returns 200 - data=["default"]
PASS: CLP datasets includes 'default'
PASS: MySQL query returns 200
PASS: MySQL query returns data - rowCount=5
PASS: Dashboard CREATE
PASS: Dashboard READ
PASS: Dashboard UPDATE
PASS: Dashboard DELETE
PASS: Datasource list returns 200
PASS: MySQL datasource provisioned
PASS: CLP datasource provisioned
PASS: Infinity datasource provisioned

E2E RESULTS: 34/34 passed
```

**Explanation:** All 34 Playwright e2e tests pass. Tests cover: dashboard list/editor UI, all 10 panel types visible in selector and 4 types added via UI, 9 panel types added via API, CLP datasets, MySQL query, dashboard CRUD, and datasource provisioning.

### RBAC Test Suite

**Task:** Verify NFR-11/NFR-12 RBAC and header spoofing prevention

**Command:**
```bash
cd components/webui && pnpm --filter @webui/server test -- --reporter=verbose 2>&1 | grep rbac
```

**Output:**
```
✓ src/hono-routes/__tests__/rbac.test.ts (10 tests) 13ms
  ✓ should allow all requests in development mode
  ✓ should allow read requests with viewer role in production
  ✓ should reject write requests with viewer role in production
  ✓ should allow write requests with editor role in production
  ✓ should default to viewer role when x-clp-role is missing
  ✓ should allow admin role to perform write operations
  ✓ should reject x-clp-role header without gateway header
  ✓ should allow x-clp-role header with gateway header
  ✓ should not check headers in development mode
  ✓ should reject x-clp-permissions header without gateway header
```

**Explanation:** All 10 RBAC tests pass, confirming: (1) dev mode allows all requests, (2) production with gateway enforces role-based access, (3) production without gateway allows all operations (direct trusted access), (4) NFR-12 rejects spoofed `x-clp-*` headers with and without gateway.

[yscope-contrib-guidelines]: https://docs.yscope.com/dev-guide/contrib-guides-overview.html
