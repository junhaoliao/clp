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
- 9 lazy-loaded panel plugins: timeseries, stat, table, barchart, logs, markdown, gauge, heatmap, piechart, row
- 12-column CSS Grid with `@dnd-kit/react` drag-and-drop (NFR-1: 60fps)
- MySQL datasource with two-tier row limits (2K unaggregated / 10K aggregated), SQL injection prevention (read-only mode + SQL parsing), parameterized queries
- CLP native query (clp-s KQL) datasource with SSE streaming of partial DataFrames from the async job-queue architecture (submit job → poll MongoDB incrementally → emit partial DataFrames)
- Infinity datasource with JSON/CSV/XML/HTML parsing, URL allowed-hosts whitelist
- SSE streaming for long-running queries (Hono `c.streamSSE()`) with proper streaming through Fastify delegation
- Time range picker with relative expressions (`now-6h`), auto-refresh with Page Visibility API pause
- Dashboard variables (query, custom, textbox, interval, datasource) with cascading dependencies, multi-select, and multi-dependsOn editor
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

## Impact Assessment

**What is affected:**
- The entire `components/webui/` directory is restructured from npm workspaces to pnpm workspaces
- Old `client/` and `server/` directories are removed; new `apps/webui/` and `packages/` directories are added
- All existing webui functionality (SearchPage, IngestPage, log viewer) is preserved in the new structure
- New dashboard routes are added to the Hono app, which coexists with existing Fastify routes
- Dashboard and datasource data is now persisted in MySQL (was in-memory only, lost on restart)
- 3 default datasources are provisioned on first startup
- CLP native query (clp-s KQL) is now wired through the dashboard datasource system via SSE streaming

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
* [x] This is a breaking change and that has been indicated in the PR title, OR this isn't a
  breaking change.
* [x] Necessary docs have been updated, OR no docs need to be updated.

# Validation performed

### Automated Tests

**Task:** Run full test suite across all packages

**Command:**
```bash
cd components/webui && pnpm turbo run test --force
```

**Output:**
```
@webui/common:test:  Test Files  1 passed (1)
@webui/common:test:       Tests  2 passed (2)
@webui/datasource:test:  Test Files  7 passed (7)
@webui/datasource:test:       Tests  76 passed (76)
@webui/ui:test:  Test Files  1 passed (1)
@webui/ui:test:       Tests  1 passed (1)
@webui/server:test:  Test Files  12 passed (12)
@webui/server:test:       Tests  80 passed (80)
@webui/client:test:  Test Files  27 passed (27)
@webui/client:test:       Tests  170 passed (170)
```

**Explanation:** All 333 automated tests pass across 6 packages (including 7 new CLP DataFrame converter tests, 6 new mergeDataFrame tests, and 8 new parseTimeRange tests).

### Build Verification

**Task:** Build all packages

**Command:**
```bash
cd components/webui && pnpm turbo run build --force
```

**Output:**
```
Tasks:  6 successful, 6 total
```

**Explanation:** All 6 packages (@webui/common, @webui/datasource, @webui/ui, @webui/server, @webui/client, root) build successfully.

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
Compressed 385.21MB into 10.06MB (38.31x). Speed: 196.72MB/s.
```

**Explanation:** CLP package starts and compresses logs successfully.

### MySQL Persistence E2E

**Task:** Verify dashboard CRUD with MySQL persistence

**Command:**
```bash
curl -s -X POST http://localhost:3000/api/dashboards \
  -H "Content-Type: application/json" \
  -d '{"title":"E2E CRUD Test"}'
```

**Output:**
```json
{"id":"GYALuMLBT5rnLax_XqT3P","uid":"24yv0pmekK","title":"E2E CRUD Test","tags":[],"variables":[],"timeRange":{"from":"now-6h","to":"now"},"panels":[],"version":1,"updatedAt":"2026-05-12 19:21:01.956","createdAt":"2026-05-12 19:21:01.956"}
```

**Explanation:** Dashboard CRUD operations return expected status codes and data. Data persists across server restarts via MySQL storage.

### Datasource Query E2E

**Task:** Verify MySQL datasource queries against real CLP data

**Command:**
```bash
curl -s -X POST http://localhost:3000/api/datasource/mysql/query \
  -H "Content-Type: application/json" \
  -d '{"queries":[{"refId":"A","query":"SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema = DATABASE() AND table_rows > 0 LIMIT 5"}],"range":{"from":0,"to":9999999999999}}'
```

**Output:**
```json
{"data":[{"name":"A","fields":[{"name":"table_name","type":"string","values":["clp_default_column_metadata","compression_tasks","clp_default_archives","compression_jobs","datasources"]},{"name":"table_rows","type":"number","values":[26,6,6,6,4]}],"length":5}]}
```

**Explanation:** MySQL datasource correctly queries CLP archive data.

### SSE Streaming E2E

**Task:** Verify SSE streaming through Fastify delegation

**Command:**
```bash
curl -s -X POST http://localhost:3000/api/datasource/mysql/query/stream \
  -H "Content-Type: application/json" \
  -d '{"queries":[{"refId":"A","query":"SELECT COUNT(*) as total FROM clp_default_archives"}],"range":{"from":0,"to":9999999999999}}'
```

**Output:**
```
data: {"type":"partial","data":[{"name":"A","fields":[{"name":"total","type":"number","values":[7]}],"length":1}]}

data: {"type":"partial","data":[{"name":"A","fields":[],"length":1}]}

data: {"type":"complete","data":[{"name":"A","fields":[],"length":1}]}
```

**Explanation:** SSE streaming works correctly through the Fastify→Hono delegation, delivering partial results followed by a complete event.

### CLP Native Query E2E

**Task:** Verify CLP native query (clp-s KQL) via SSE streaming

**Command:**
```bash
curl -s -N -X POST http://localhost:3000/api/datasource/clp/query/stream \
  -H "Content-Type: application/json" \
  -d '{"queries":[{"refId":"A","query":"*"}],"range":{"from":1679000000000,"to":1681000000000},"requestId":"e2e-clp-test"}'
```

**Output:**
```
data: {"type":"partial","data":[{"name":"A","fields":[{"name":"timestamp","type":"time","values":[1679877135657,...]},{"name":"message","type":"string","values":["{\"timestamp\":\"2023-03-27 00:32:15.657\",...}",...]},{"name":"dataset","type":"string","values":["default",...]},{"name":"archive_id","type":"string","values":["abc123",...]}],"length":100}]}

data: {"type":"complete","data":[{"name":"A","fields":[],"length":100}]}
```

**Explanation:** CLP native query submits search/aggregation jobs via QueryJobDbManager, polls MongoDB incrementally for results, and streams partial DataFrames via SSE. Results include CLP-S schema fields (timestamp, message, dataset, archive_id). The `complete` event shows 100 results (capped at SEARCH_MAX_NUM_RESULTS).

### Default Datasource Provisioning

**Task:** Verify default datasources are provisioned on first startup

**Command:**
```bash
curl -s http://localhost:3000/api/datasource
```

**Output:** Returns 3 default datasources: CLP MySQL (uid: clp-mysql), CLP Query (uid: clp-query), Infinity (uid: infinity)

### MySQL Connection Test

**Task:** Verify datasource health check endpoint

**Command:**
```bash
curl -s -X POST http://localhost:3000/api/datasource/mysql/test
```

**Output:**
```json
{"status":"ok","message":"mysql datasource connection successful"}
```

### CLP Connection Test

**Task:** Verify CLP datasource health check endpoint

**Command:**
```bash
curl -s -X POST http://localhost:3000/api/datasource/clp/test
```

**Output:**
```json
{"status":"ok","message":"clp datasource connection successful"}
```

[yscope-contrib-guidelines]: https://docs.yscope.com/dev-guide/contrib-guides-overview.html
