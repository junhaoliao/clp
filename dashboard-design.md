# CLP Dashboard System — Design Document

## Overview

This document proposes a scalable, extensible dashboard system to be added to the CLP `components/webui` component. The system enables users to create, edit, and view dashboards composed of draggable, resizable panels that visualize data from multiple datasource types.

### Problem Statement

The current CLP webui provides a fixed IngestPage with four static cards (space savings, details, compress, jobs) and a SearchPage with a single timeline bar chart. There is no way for users to:

- Compose custom dashboards with arbitrary visualizations
- Arrange panels with drag-and-drop flexibility
- Connect panels to different data sources
- Define reusable filters/variables across panels
- Pull data from external APIs (JSON/HTML)

### Proposed Solution

Build a Grafana-inspired dashboard system with:

- **Draggable, resizable panel grid** using `@dnd-kit/react` for drag-and-drop and a CSS Grid layout
- **Pluggable panel types** (time-series charts, bar charts, stat panels, tables, logs) rendered via Recharts and custom components
- **Pluggable datasources** — MySQL (replacing current direct SQL queries), CLP Query System (KQL), and an Infinity-style HTTP datasource for JSON/HTML remote data
- **shadcn/ui (base preset)** + **Tailwind CSS v4** for the component library and styling
- **dayjs** for all date/time handling
- **pnpm** + **Turborepo** for monorepo build orchestration

### Key Technology Choices

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Build tool | Vite 8 | Fast HMR, Rolldown bundler, already used by existing webui |
| Component library | shadcn/ui (base preset, `@base-ui/react`) | Copy-paste components, CSS-variable theming, no vendor lock-in |
| CSS framework | Tailwind CSS v4 | CSS-first config, `@tailwindcss/vite` plugin, auto-detection |
| Drag & drop | `@dnd-kit/react` 0.4.x (new API) | Framework-agnostic core, optimistic sorting, per-item collision detection |
| Charts | Recharts 3.8.x | React-native, composable (`ComposedChart`), `syncId` for cross-chart sync |
| Date/time | dayjs 1.11.x | Lightweight, plugin-based, already used in existing webui |
| Package manager | pnpm 10.x via corepack | Strict dependency resolution, content-addressable storage, workspace protocol |
| Build orchestration | Turborepo 2.x | Task graph, caching, parallel execution |
| State management | zustand + TanStack React Query | Already used in existing webui; zustand for UI state, React Query for server state |
| Backend (dashboard routes) | Hono 4 | End-to-end type safety via RPC (`hc<AppType>()`); TypeBox validator reuse; coexists with Fastify on path prefix `/api/dashboards/` and `/api/datasource/` |
| Backend (existing routes) | Fastify 5 | Already used by existing webui server; will be incrementally replaced by Hono |

### Lessons from Reference Systems

**Grafana** uses a 24-column `react-grid-layout` grid, `PanelPlugin` class with metadata + component + options editor, `DataSourceApi` with `query()` method, mutable `DashboardModel`/`PanelModel` classes in Redux, and `TemplateSrv` for variable interpolation. Its Infinity datasource plugin fetches external JSON/CSV/XML/HTML via configurable HTTP client with auth, pagination, and dual frontend/backend parsing.

**Metabase** uses `react-grid-layout` with integer grid coordinates (`row`, `col`, `size_x`, `size_y`), `registerVisualization()` with `VisualizationDefinition`, a driver hierarchy with Clojure multimethods, ECharts for chart rendering, and dashboard parameters with per-card mapping.

**Superset** uses a custom 12-column CSS Grid (no third-party grid library), a flat `DashboardLayout` dictionary with tree references via `children`/`parents`, `ChartPlugin` with registries for metadata/component/transformProps/buildQuery, SQLAlchemy-based connectors, `redux-undo` for layout undo/redo, and native filters with scoping (rootPath + excluded charts).

---

## Use Cases

### UC-1: Create a Dashboard
A user creates a new dashboard, gives it a title and description, and starts with an empty grid. The dashboard is saved to the database and appears in the dashboard list.

### UC-2: Add and Configure Panels
A user adds panels to the dashboard by selecting a panel type (time-series chart, stat, table, logs, markdown). Each panel is configured with a datasource, query, and visualization options. The panel renders data from the configured datasource.

### UC-3: Arrange Panels via Drag-and-Drop
A user drags panels to rearrange them on the grid. Panels can also be resized by dragging their edges. The layout is persisted on explicit "Save" action.

### UC-4: Filter Data Across Panels
A user defines dashboard-level variables (e.g., dataset selector, time range) that propagate to all panels referencing them. Changing a variable value refreshes all dependent panels.

### UC-5: Query MySQL Data
A user configures a panel with a MySQL datasource, writes a SQL query, and the panel renders the results as a chart or table. This replaces the current `IngestPage` cards that query MySQL directly.

### UC-6: Query CLP Logs
A user configures a panel with the CLP datasource, writes a KQL query, and the panel renders search results (timeline histogram, log table, or aggregated stats).

### UC-7: Fetch External JSON/HTML Data
A user configures a panel with the Infinity datasource, provides a URL and parsing rules (JSONPath for JSON, CSS selectors for HTML), and the panel renders the fetched data. This enables integrating external APIs and web pages.

### UC-8: View Dashboard in Read-Only Mode
A viewer opens a shared dashboard link and sees the dashboard with all panels rendered. They can change dashboard variables and time range but cannot edit the layout or panel configurations.

### UC-9: Export and Import Dashboards
A user exports a dashboard as JSON and imports it into another CLP instance. All panel configurations, queries, and layout are preserved.

### UC-10: Time Range Selection
A user selects a time range for the dashboard. All time-aware panels update their queries to respect the selected range. Panels can override the dashboard time range.

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Users can create, read, update, and delete dashboards | P0 |
| FR-2 | Dashboards contain a grid of panels with configurable positions and sizes | P0 |
| FR-3 | Panels support drag-and-drop reordering and resizing | P0 |
| FR-4 | Panels support at least: time-series chart, bar chart, stat (single value), table, markdown, gauge, heatmap, pie chart | P0 |
| FR-5 | Datasources include: MySQL, CLP Query (KQL), Infinity (HTTP JSON/HTML) | P0 |
| FR-6 | Dashboards support time range selection that propagates to panels | P0 |
| FR-7 | Dashboards support variables (dropdowns, text inputs) that propagate to panel queries | P1 |
| FR-8 | Infinity datasource supports JSON with JSONPath selectors and HTML with CSS selectors | P0 |
| FR-9 | Infinity datasource supports configurable HTTP methods, headers, and authentication | P1 |
| FR-10 | Panels auto-refresh on a configurable interval | P1 |
| FR-11 | Dashboard layout is persisted to the database | P0 |
| FR-12 | Dashboards can be exported and imported as JSON | P1 |
| FR-13 | Panels display loading, error, and empty states | P0 |
| FR-14 | Multiple panels on the same dashboard can query different datasources | P0 |
| FR-15 | Dashboard variables support multi-select | P2 |
| FR-16 | Panels support per-panel time range overrides | P2 |
| FR-17 | Infinity datasource supports pagination (offset, cursor, page-based) | P2 |
| FR-18 | Dashboards support tabs for organizing panels into groups | P2 |

### Non-Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-1 | Panel drag-and-drop must feel smooth (60fps) with optimistic DOM updates | P0 |
| NFR-2 | Dashboard load time under 2 seconds for dashboards with 20 panels (up to 100+ with lazy rendering) | P0 |
| NFR-3 | The system must be extensible — new panel types and datasources can be added without modifying core code | P0 |
| NFR-4 | The system must use the project's existing monorepo structure (pnpm workspaces + Turborepo) | P0 |
| NFR-5 | All components must use shadcn/ui (base preset) + Tailwind CSS v4 for consistent styling | P0 |
| NFR-6 | The system must support React 19 | P0 |
| NFR-7 | All date/time handling must use dayjs exclusively | P1 |
| NFR-8 | The Infinity datasource must not execute user-provided code on the server (security) | P0 |
| NFR-9 | API endpoints for dashboard CRUD must be protected by the existing rate limiter | P1 |
| NFR-10 | Panel queries must be cancellable (AbortController support) | P1 |
| NFR-11 | All dashboard API routes must enforce RBAC in production (gateway) mode; in development, auth is disabled | P0 |
| NFR-12 | The webui server must reject X-CLP-* auth headers from untrusted sources (header spoofing prevention) | P0 |
| NFR-13 | Dashboard-level permissions must override role-level defaults (deferred to post-v1; v1 uses role-based access only) | P2 |
| NFR-14 | The API server must stream (not buffer) response bodies when reverse-proxying to prevent memory exhaustion | P1 |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (SPA)                            │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Dashboard    │  │ Panel       │  │ Datasource             │ │
│  │ Editor       │  │ Registry    │  │ Registry               │ │
│  │ (Grid + DnD) │  │             │  │                        │ │
│  └──────┬───────┘  └──────┬──────┘  └───────────┬────────────┘ │
│         │                 │                     │              │
│  ┌──────┴─────────────────┴─────────────────────┴────────────┐ │
│  │                Dashboard Stores (zustand)               │ │
│  │  useDashboardLayoutStore  - panel positions             │ │
│  │  useDashboardTimeStore   - time range                   │ │
│  │  useDashboardVariableStore - variable values            │ │
│  └────────────────────────────┬──────────────────────────────┘ │
│                               │                                 │
│  ┌────────────────────────────┴──────────────────────────────┐ │
│  │              Query Layer (TanStack React Query)           │ │
│  │  - per-panel queries     - caching & deduplication        │ │
│  │  - variable interpolation - abort controller              │ │
│  └────────────────────────────┬──────────────────────────────┘ │
│                               │ hc<AppType>() (typed RPC)      │
└───────────────────────────────┼─────────────────────────────────┘
                                │
               ┌────────────────┴────────────────┐
               │         Development Mode         │
               │   Browser → WebUI Server only    │
               │   (Vite dev proxy, no auth)      │
               └────────────────┬────────────────┘
                                │
               ┌────────────────┴────────────────┐
               │        Production Mode          │
               │  Browser → API Server (gateway)  │
               │  → WebUI Server / MCP Server    │
               │  (auth + RBAC + reverse proxy)  │
               └─────────────────────────────────┘
┌───────────────────────────────┼─────────────────────────────────┐
│                   Node.js Server                                │
│                               │                                 │
│  ┌────────────────────────────┴────────────────────────────┐   │
│  │              Hono App (dashboard routes)                │   │
│  │  Chained route definitions for RPC type inference:     │   │
│  │  app.post('/dashboards', validator, handler)            │   │
│  │  app.post('/datasource/:type/query', validator, ...)   │   │
│  │  → Export AppType → client: hc<AppType>()              │   │
│  │                                                         │   │
│  │  ┌──────────────┐  ┌─────────┴──────────┐  ┌─────────┐ │   │
│  │  │ Dashboard   │  │ Query Executor     │  │Infinity │ │   │
│  │  │ CRUD API    │  │                    │  │HTTP Proxy│ │   │
│  │  │             │  │ - MySQL driver     │  │         │ │   │
│  │  │ POST /api/  │  │ - CLP query engine │  │- Fetch  │ │   │
│  │  │  dashboards │  │ - Presto engine    │  │- Parse  │ │   │
│  │  │ GET /api/   │  │                    │  │- Auth   │ │   │
│  │  │  dashboards │  │                    │  │         │ │   │
│  │  └──────┬──────┘  └─────────┬──────────┘  └────┬────┘ │   │
│  └─────────┼───────────────────┼─────────────────┼───────┘   │
│            │                    │                 │            │
│  ┌─────────┴────────┐  ┌──────┴──────────┐  ┌───┴─────────┐  │
│  │ MySQL             │  │ MySQL / MongoDB │  │ External    │  │
│  │ (dashboards table)│  │ (CLP data)      │  │ APIs (JSON) │  │
│  └───────────────────┘  └─────────────────┘  └─────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Fastify Server (existing routes)               │  │
│  │  /api/search/query  /api/archive-metadata/sql  etc.      │  │
│  │  (unchanged during transition; routes migrate to Hono)  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  Hono mounted on /api/dashboards/* and /api/datasource/*      │
│  Fastify handles all other /api/* routes                       │
└────────────────────────────────────────────────────────────────┘
```

### Package Structure (Monorepo)

The existing `components/webui` workspace will be restructured from npm workspaces to pnpm workspaces with Turborepo orchestration:

```
components/webui/
  package.json                  # Root: pnpm workspaces + turbo config
  pnpm-workspace.yaml
  turbo.json
  tsconfig.base.json

  apps/
    webui/                      # Main Vite + React app (dashboard + existing pages)
      package.json
      vite.config.ts
      src/
        main.tsx
        index.css               # Tailwind + shadcn theme
        App.tsx
        router.tsx              # React Router (existing + /dashboards/*)
        components/
          ui/                   # shadcn/ui components (generated by CLI)
        pages/
          IngestPage/           # Existing (migrated to use datasources)
          SearchPage/           # Existing
          DashboardPage/        # NEW
          DashboardListPage/    # NEW
        features/
          dashboard/            # Dashboard feature module
          ...existing features

  packages/
    common/                     # Shared types, schemas, SSE events (existing)
      package.json
      src/
    server/                     # Node.js server (Hono + Fastify coexistence)
      package.json
      src/
        app.ts                  # Hono app definition (chained routes for RPC)
        hono-routes/
          dashboards.ts         # Dashboard CRUD routes (Hono)
          datasource.ts         # Datasource proxy/query routes (Hono)
        routes/                 # Fastify routes (existing, unchanged)
          api/
            ...existing routes
        plugins/
          ...existing plugins
    ui/                         # Shared dashboard UI components (@webui/ui)
      package.json              # Recharts wrappers, panel chrome, grid, etc.
      src/
    datasource/                 # Datasource abstractions (@webui/datasource)
      package.json
      src/
        types.ts                # DataSourceApi, Query, Response interfaces
        mysql/                  # MySQL datasource implementation
        clp/                    # CLP query datasource implementation
        infinity/               # Infinity (HTTP) datasource implementation
    utils/                       # Shared utilities (@webui/utils)
      package.json
      src/
```

### Key Architectural Decisions

1. **Feature-module organization**: Dashboard code lives in `apps/webui/src/features/dashboard/` rather than a separate app, since it shares the same shell (navigation, auth, theming) as the existing pages.

2. **Datasource packages as a separate package**: `@webui/datasource` is a shared package because datasource types and implementations are used by both the client (for type-safe query editing) and the server (for query execution).

3. **shadcn/ui components in the app**: Per shadcn/ui's copy-paste model, UI components are generated into `apps/webui/src/components/ui/` using `pnpm dlx shadcn@latest add <component>`. Shared dashboard-specific components (panel chrome, grid) go in `@webui/ui`.

4. **Grid layout over react-grid-layout**: Following Superset's approach, we use a custom 12-column CSS Grid instead of `react-grid-layout`. CSS Grid is native, performant, and avoids a third-party dependency. DnD is handled separately by `@dnd-kit/react`.

5. **New dnd-kit API**: Use `@dnd-kit/react` 0.4.x (the new framework-agnostic API) instead of the legacy `@dnd-kit/core` + `@dnd-kit/sortable`. The new API provides optimistic sorting, per-item collision detection, and a cleaner hooks interface.

6. **zustand over Redux**: The existing webui uses zustand. We continue this pattern — zustand for dashboard UI state, TanStack React Query for server state. This avoids Redux boilerplate while providing the same capabilities.

7. **MySQL for dashboard persistence**: Dashboard metadata (layout, panel configs, variables) is stored in MySQL alongside existing CLP tables, not in a separate database.

8. **Hono for dashboard routes (with Fastify coexistence)**: Dashboard CRUD and datasource query routes are implemented using Hono 4, not Fastify. Hono's RPC system provides end-to-end type safety: route definitions use chained syntax (`app.post('/path', validator, handler)`), the `typeof app` is exported as `AppType`, and the client uses `hc<AppType>()` for fully typed request/response. This eliminates the need to maintain parallel type definitions in `@webui/common`. Hono is mounted on path prefixes `/api/dashboards/*` and `/api/datasource/*` via `@hono/node-server`, coexisting with the existing Fastify server which handles all other `/api/*` routes. `@hono/typebox-validator` integrates directly with the existing `@sinclair/typebox` schemas. Over time, Fastify routes can be incrementally migrated to Hono. Key constraint: Hono routes must use chained definitions (not flat handlers) for `AppType` inference to work.

9. **API server as reverse proxy / gateway in production**: In production deployments (Docker Compose, Helm), the API server acts as the single entry point — authenticating, authorizing, and reverse-proxying all requests to downstream services (webui, MCP server). Downstream services trust identity headers (`X-CLP-*`) injected by the API server. In development, there is no gateway and auth is disabled. This follows Grafana's `[auth.proxy]` pattern. Authorization is two-layered: coarse-grained role checks at the API server, fine-grained resource-level checks at the webui server.

---

## Subsystems

### Subsystem 1: Dashboard Data Model & Storage

#### Description

Defines how dashboards, panels, and their configurations are modeled in TypeScript and persisted in MySQL.

#### Data Model

```typescript
/** A dashboard is a collection of panels arranged on a grid */
interface Dashboard {
  id: string;                          // nanoid
  uid: string;                        // URL-friendly unique ID
  title: string;
  description?: string;
  tags: string[];
  variables: DashboardVariable[];     // Dashboard-level variables
  timeRange: DashboardTimeRange;      // Default time range
  refreshInterval?: string;           // e.g., "10s", "1m", null for no auto-refresh
  panels: DashboardPanel[];           // Ordered list of panels
  version: number;                    // Optimistic concurrency
  // createdBy?: string;               // User ID — deferred to post-v1 (requires auth system)
  updatedAt: string;
  createdAt: string;
}

/** A panel is a single visualization unit on the dashboard */
interface DashboardPanel {
  id: string;                          // nanoid
  type: PanelType;                     // "timeseries" | "stat" | "table" | "barchart" | "logs" | "markdown" | "gauge" | "heatmap" | "piechart"
  title: string;
  description?: string;
  gridPos: GridPos;                    // Position on the grid
  datasource: DatasourceRef;           // Which datasource to query
  queries: PanelQuery[];               // One or more queries
  options: Record<string, unknown>;    // Panel-type-specific options
  fieldConfig?: FieldConfig;           // Field display overrides
  schemaVersion?: number;              // For migration handler on read
  timeFrom?: string;                   // Per-panel time range override
  transparent?: boolean;
  repeatVariable?: string;             // Variable name for panel repetition
}

/** Grid position: 12-column grid */
interface GridPos {
  x: number;     // Column (0-11)
  y: number;     // Row (0-based)
  w: number;     // Width in columns (1-12)
  h: number;     // Height in grid units (1 unit = minimum row height, rows expand to tallest panel)
}

/** Reference to a datasource instance */
interface DatasourceRef {
  type: DatasourceType;               // "mysql" | "clp" | "infinity"
  uid: string;                        // Datasource instance unique ID
}

/** A query bound to a specific datasource */
interface PanelQuery {
  refId: string;                       // Unique within panel (e.g., "A", "B")
  datasource: DatasourceRef;
  query: unknown;                      // Datasource-specific query model
}

/** Dashboard variable definition */
interface DashboardVariable {
  id: string;
  name: string;                        // Used as $variable_name in queries
  label?: string;
  type: "query" | "custom" | "textbox" | "datasource" | "interval";
  defaultValue?: unknown;
  current?: { value: unknown; text: string };
  options?: { value: unknown; text: string; selected: boolean }[];
  // For "query" type:
  datasource?: DatasourceRef;
  query?: string;
  multi?: boolean;
  includeAll?: boolean;
}

/** Dashboard-level time range */
interface DashboardTimeRange {
  from: string;                        // dayjs-compatible, e.g., "now-6h" or ISO string
  to: string;                          // dayjs-compatible, e.g., "now" or ISO string
}
```

#### MySQL Schema

```sql
CREATE TABLE dashboards (
  id         VARCHAR(32)  NOT NULL PRIMARY KEY,  -- nanoid
  uid        VARCHAR(32)  NOT NULL UNIQUE,        -- URL-friendly ID
  title      VARCHAR(255) NOT NULL,
  description TEXT,
  tags       JSON,                                -- string[]
  variables  JSON NOT NULL,                       -- DashboardVariable[]
  time_range JSON NOT NULL,                      -- DashboardTimeRange
  refresh_interval VARCHAR(32),
  panels     JSON NOT NULL,                       -- DashboardPanel[]
  version    INT NOT NULL DEFAULT 1,
  -- created_by VARCHAR(64),                       -- Deferred to post-v1 (requires auth system)
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_uid (uid)
);
```

**Design note**: Panels are stored as a JSON column within the dashboards table rather than in a separate table. This follows Grafana's approach (`position_json`) and simplifies CRUD — a dashboard is read/written as a single document. If panel-level querying becomes necessary, we can add a separate `dashboard_panels` table later.

#### Variable Interpolation

Variable values are interpolated into queries at query time using a `$variable_name` / `${variable_name}` syntax (matching Grafana's convention). The interpolation service replaces these tokens with the current variable values before dispatching queries to datasources.

**Cascading variables**: When Variable A's value changes, Variable B's query (which references `$A`) is re-executed to update its options. This is resolved in dependency order during the variable resolution flow.

Built-in variables:
- `$__from` / `$__to` — dashboard time range (epoch milliseconds)
- `$__interval` — calculated based on time range and panel width
- `$__dashboard` — current dashboard UID

---

### Subsystem 2: Panel Plugin System

#### Description

Defines how different visualization types (time-series, stat, table, etc.) are registered and rendered. Each panel type is a React component with associated metadata, options schema, and data requirements.

#### Panel Registry

```typescript
interface PanelPluginMeta {
  type: PanelType;                     // Unique identifier: "timeseries", "stat", "table", etc.
  name: string;                        // Display name: "Time Series", "Stat", etc.
  icon: string;                        // Lucide icon name
  description: string;
  defaultGridPos: Partial<GridPos>;    // Default size for new panels
  minGridPos: Partial<GridPos>;        // Minimum size
  supportsMultiQuery?: boolean;        // Can have multiple queries (A, B, C...)
  isTimeAware?: boolean;               // Respects dashboard time range
}

interface PanelPlugin {
  meta: PanelPluginMeta;
  component: ComponentType<PanelComponentProps>;
  optionsBuilder?: () => PanelOptionsBuilder;  // Grafana-style builder pattern for options UI
  queryEditor?: ComponentType<PanelQueryEditorProps>;
  defaultOptions?: () => Record<string, unknown>;
  migrationHandler?: (oldVersion: number, options: unknown) => unknown;
}

interface PanelComponentProps {
  id: string;
  data: PanelData;                     // Query results
  options: Record<string, unknown>;    // Panel-type-specific options
  fieldConfig?: FieldConfig;
  timeRange: ResolvedTimeRange;
  width: number;
  height: number;
  transparent: boolean;
  replaceVariables: InterpolateFunction;
  onOptionsChange: (options: unknown) => void;
}
```

#### Initial Panel Types

| Type | Description | Recharts Component | Options |
|------|-------------|--------------------|---------|
| `timeseries` | Line/area chart over time | `<ComposedChart>` with `<Line>`, `<Area>` | Series display mode, line width, point radius, fill opacity, stacking |
| `barchart` | Vertical bar chart | `<ComposedChart>` with `<Bar>` | Orientation, stacking, bar width, grouping |
| `stat` | Single large value with trend indicator and optional sparkline | Custom component + `<Line>` sparkline | Value mapping, thresholds (color by value), sparkline toggle, trend indicator (up/down arrow + % change) |
| `table` | Tabular data display | Custom component (shadcn Table) | Column visibility, sorting, pagination |
| `logs` | Log viewer with syntax highlighting | Custom component (existing log viewer) | Wrap lines, show timestamps |
| `markdown` | Rich text panel | Custom component (markdown renderer) | Markdown content |
| `gauge` | Gauge/meter with color thresholds | Custom component | Min, max, thresholds, display value |
| `heatmap` | 2D density visualization | Custom component + `<HeatMap>` (recharts) | Color scheme, bucket size, time-based |
| `piechart` | Pie/donut chart | `<PieChart>` with `<Pie>` | Donut mode, labels, legend |

#### Panel Rendering Pipeline

```
DashboardPanel (container)
  ├── PanelChrome (shadcn Card wrapper)
  │   ├── PanelHeader (title, menu, drag handle)
  │   ├── PanelContent (conditionally rendered based on state)
  │   │   ├── LoadingState (skeleton)
  │   │   ├── ErrorState (error message + retry)
  │   │   ├── EmptyState (no data placeholder)
  │   │   └── <PluginComponent> (actual visualization)
  │   └── PanelFooter (optional: variable override, time override)
  └── usePanelQueries (hook managing query lifecycle)
```

The `usePanelQueries` hook:
1. Resolves datasource from `DatasourceRef`
2. Interpolates variables into queries via `replaceVariables()`
3. Applies time range (dashboard default + per-panel override)
4. Dispatches queries via TanStack React Query
5. Supports AbortController for cancellation
6. Returns `{ data, isLoading, error, refetch }`

#### Panel Options Editor

Each panel type registers an `optionsBuilder` function that returns a `PanelOptionsBuilder` instance. The builder uses a fluent API to define options (similar to Grafana's `PanelOptionsBuilder`), which auto-generates the options UI in the panel's edit sidebar. This provides a consistent UX across all panel types while allowing custom option layouts.

```typescript
// Example: Stat panel options builder
function statOptionsBuilder(): PanelOptionsBuilder {
  return new PanelOptionsBuilder()
    .addSelect("valueDisplay", { label: "Value Display", options: ["Actual", "Percent"], defaultValue: "Actual" })
    .addNumberInput("decimals", { label: "Decimals", min: 0, max: 10, defaultValue: 2 })
    .addToggle("sparkline", { label: "Show Sparkline", defaultValue: false })
    .addToggle("trendIndicator", { label: "Show Trend Indicator", defaultValue: true })
    .addColorPicker("thresholdColor", { label: "Threshold Color" });
}
```

---

### Subsystem 3: Datasource & Query System

#### Description

Defines how data is fetched from different sources. Each datasource type implements a common interface for query execution, health checking, and variable resolution.

#### Datasource Interface

```typescript
/** Frontend datasource interface — handles query dispatch and response handling */
interface DataSourceApi<TQuery, TOptions> {
  /** Execute queries and return results */
  query(request: DataQueryRequest<TQuery>): Promise<DataQueryResponse>;

  /** Test connectivity */
  testDataSource(): Promise<{ status: "ok" | "error"; message: string }>;

  /** Get variable options (for query-type variables) */
  metricFindQuery?(query: string, options?: { range?: TimeRange }): Promise<VariableOption[]>;

  /** Interpolate variables into queries */
  interpolateVariablesInQueries?(queries: TQuery[], scopedVars: Record<string, unknown>): TQuery[];
}

/** Server-side datasource interface — executes queries against the actual data source */
interface ServerDataSource<TConfig> {
  /** Initialize the datasource */
  init(config: TConfig): Promise<void>;

  /** Execute a query */
  executeQuery(query: unknown, timeRange: { from: number; to: number }): Promise<QueryResult>;

  /** Test the connection */
  testConnection(): Promise<boolean>;
}

/** Standard query request/response types */
interface DataQueryRequest<TQuery> {
  requestId: string;
  queries: TQuery[];
  range: { from: number; to: number };  // Epoch ms
  maxDataPoints?: number;
  interval?: string;
  scopedVars?: Record<string, unknown>;
}

interface DataQueryResponse {
  data: DataFrame[];
  errors?: { message: string; refId?: string }[];
}

/** Tabular data format (inspired by Grafana's DataFrame) */
interface DataFrame {
  name?: string;
  refId?: string;
  fields: DataField[];
  length: number;                       // Number of rows
}

interface DataField {
  name: string;
  type: "string" | "number" | "time" | "boolean";
  values: unknown[];                    // Array of values, one per row
  config?: {
    displayName?: string;
    unit?: string;
    decimals?: number;
    filterable?: boolean;
  };
}
```

#### Datasource Types

**1. MySQL Datasource**

Queries are SQL strings. The server executes them against the CLP MySQL database. This replaces the current `/api/archive-metadata/sql` endpoint.

```typescript
interface MySQLQuery {
  refId: string;
  sql: string;                          // The SQL query with $variable interpolation
}

// Server route: POST /api/datasource/mysql/query (Hono)
// The server validates and executes the SQL, returning DataFrame[]
```

Security: The server must validate SQL queries to prevent destructive operations (no `DROP`, `DELETE`, `UPDATE`, `INSERT` unless explicitly allowed by config). Parameterized queries are preferred.

**2. CLP Query Datasource**

Queries use the KQL syntax. The server dispatches queries to the CLP query engine (native or Presto) and returns results.

```typescript
interface CLPQuery {
  refId: string;
  queryString: string;                  // KQL expression
  datasets?: string[];                  // Target datasets
  ignoreCase?: boolean;
  queryType: "search" | "aggregate";   // Search returns logs; aggregate returns stats
}

// Server route: POST /api/datasource/clp/query (Hono)
// Uses SSE (Hono c.streamSSE()) for streaming query results
// Replaces Socket.IO for consistent datasource interface
```

**3. Infinity Datasource**

Queries specify a URL, HTTP method, headers, and parsing rules. The server fetches the remote data and parses it into `DataFrame[]`.

```typescript
interface InfinityQuery {
  refId: string;
  type: "json" | "csv" | "xml" | "html" | "graphql";
  source: "url" | "inline";
  url?: string;                         // For URL source
  data?: string;                        // For inline source
  urlOptions?: {
    method: "GET" | "POST";
    headers?: Record<string, string>;
    params?: Record<string, string>;
    body?: string;
    bodyType?: "json" | "form" | "graphql";
  };
  parser: "simple" | "backend";
  rootSelector?: string;                // JSONPath for JSON, CSS selector for HTML
  columns?: InfinityColumn[];           // Column definitions with type annotations
  pagination?: {
    mode: "none" | "offset" | "page" | "cursor";
    // ... mode-specific params
  };
  transformations?: InfinityTransformation[];   // Deferred to post-v1; let datasource queries handle transformations
}

interface InfinityColumn {
  selector: string;                      // Property path / CSS selector
  text: string;                         // Display name
  type: "string" | "number" | "time";   // Type annotation
  timestampFormat?: string;             // For time type: dayjs format string
}

/** Deferred to post-v1 — data transformations are not processed server-side in v1 */
interface InfinityTransformation {
  type: "filter" | "limit" | "rename" | "computed";
  // ... transformation-specific config
}
```

Server route: `POST /api/datasource/infinity/query` (Hono)

The server fetches the URL, applies the parser, and returns `DataFrame[]`. Security: URLs must match an allowed-hosts whitelist. No server-side code execution.

#### Datasource Configuration

Datasource instances are stored in MySQL:

```sql
CREATE TABLE datasources (
  id         VARCHAR(32)  NOT NULL PRIMARY KEY,
  uid        VARCHAR(32)  NOT NULL UNIQUE,
  name       VARCHAR(255) NOT NULL,
  type       VARCHAR(32)  NOT NULL,       -- "mysql" | "clp" | "infinity"
  config     JSON NOT NULL,               -- Type-specific config (connection details, auth, etc.)
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (type)
);
```

Default datasources are created on first startup:
- A MySQL datasource pointing to the CLP metadata database (configured from existing `settings.json`)
- A CLP datasource pointing to the query engine (native or Presto)
- An Infinity datasource with empty allowed-hosts (must be configured by user)

#### Query Execution Flow

```
1. Panel's usePanelQueries hook fires
2. Interpolate variables: replaceVariables(queries)
3. Apply time range: merge dashboard range + panel override
4. POST /api/datasource/{type}/query with DataQueryRequest
5. Server validates, executes, returns DataQueryResponse
6. React Query caches the response
7. Panel component receives DataFrame[] via props
8. Panel plugin renders the visualization
```

---

### Subsystem 4: Layout & Grid System

#### Description

Defines how panels are positioned on a 12-column CSS Grid and how drag-and-drop reordering and resizing work.

#### Grid Layout

The dashboard uses a **12-column CSS Grid** (following Superset's approach). Each panel occupies a rectangular region defined by `GridPos { x, y, w, h }`:

- `x`: Column position (0–11)
- `y`: Row position (0-based, grows downward)
- `w`: Width in columns (1–12)
- `h`: Height in grid units (minimum row height 60px, rows expand to tallest panel)

The grid is rendered using CSS Grid:

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-auto-rows: minmax(60px, auto);  /* Variable-height rows: 60px minimum, expands to tallest panel */
  gap: 8px;                            /* GRID_GUTTER_SIZE */
  padding: 8px;
}

.dashboard-panel {
  grid-column-start: calc(var(--x) + 1);
  grid-column-end: calc(var(--x) + var(--w) + 1);
  grid-row-start: calc(var(--y) + 1);
  grid-row-end: calc(var(--y) + var(--h) + 1);
}
```

#### Drag-and-Drop with @dnd-kit/react

The new `@dnd-kit/react` API (v0.4.x) provides:

- **`DragDropProvider`** — wraps the dashboard to enable DnD
- **`useSortable`** — per-panel hook combining draggable + droppable
- **`DragOverlay`** — renders a custom preview during drag (function-as-child pattern)
- **Optimistic sorting** — DOM elements move physically during drag without React re-renders
- **Per-item `collisionDetector`** — `closestCenter` for grid layouts

Key implementation details:

```typescript
// Dashboard grid with DnD
function DashboardGrid({ panels, onLayoutChange }: DashboardGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },  // 5px before drag starts
    }),
    useSensor(KeyboardSensor),
  );

  return (
    <DragDropProvider
      sensors={sensors}
      onDragEnd={(event) => handleDragEnd(event, panels, onLayoutChange)}
    >
      <div className="dashboard-grid">
        {panels.map((panel, index) => (
          <SortablePanel
            key={panel.id}
            panel={panel}
            index={index}
            isEditing={isEditing}
          />
        ))}
      </div>
      <DragOverlay>
        {(source) => <PanelDragPreview id={source.id} />}
      </DragOverlay>
    </DragDropProvider>
  );
}

function SortablePanel({ panel, index, isEditing }: SortablePanelProps) {
  const { ref, handleRef, isDragging } = useSortable({
    id: panel.id,
    index,
    handle: true,   // Entire panel header is the drag handle (more discoverable)
  });

  return (
    <div
      ref={ref}
      className="dashboard-panel"
      style={{
        '--x': panel.gridPos.x,
        '--y': panel.gridPos.y,
        '--w': panel.gridPos.w,
        '--h': panel.gridPos.h,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <DashboardPanel
        panel={panel}
        dragHandleRef={handleRef}   /* handleRef attached to panel header */
      />
    </div>
  );
}
```

#### Panel Resizing

Panel resizing uses custom drag handles at the bottom-right corner. During the drag, the panel resizes smoothly (CSS transform for instant feedback). When the drag ends, the new dimensions are snapped to the nearest grid column/row unit and the `GridPos` is updated. This provides a fluid UX while maintaining grid alignment.

#### Layout Auto-placement

When a new panel is added, an auto-placement algorithm finds the first available position:

```
1. Sort existing panels by y, then x
2. Walk row-by-row, column-by-column
3. For each cell, check if it's occupied (considering all panel spans)
4. Place the new panel at the first unoccupied position that fits its default size
```

---

### Subsystem 5: Time Range System

#### Description

Defines how time range selection works at the dashboard level and propagates to individual panels.

#### Architecture

```
┌─────────────────────────────────────┐
│        Dashboard TimePicker         │
│  [Last 6h ▼] [from] ─── [to]       │
│  Refresh: [Off ▼] [5s][1m][5m]     │
└──────────────────┬──────────────────┘
                   │
          useDashboardTimeStore
          (timeRange: { from, to })
                   │
        ┌──────────┼──────────┐
        │          │          │
   Panel A     Panel B    Panel C
   (default)   (default)  (override: last 1h)
```

#### Time Range Model

```typescript
/** Relative time shortcuts */
const TIME_RANGE_OPTIONS = [
  { label: "Last 5 minutes", value: "now-5m" },
  { label: "Last 15 minutes", value: "now-15m" },
  { label: "Last 1 hour", value: "now-1h" },
  { label: "Last 6 hours", value: "now-6h" },
  { label: "Last 24 hours", value: "now-24h" },
  { label: "Last 7 days", value: "now-7d" },
  { label: "Last 30 days", value: "now-30d" },
  { label: "All time", value: "now-100y" },
] as const;

/** Resolved (absolute) time range for query execution */
interface ResolvedTimeRange {
  from: number;      // Epoch milliseconds
  to: number;        // Epoch milliseconds
  raw: {
    from: string;    // Original expression, e.g., "now-6h"
    to: string;      // Original expression, e.g., "now"
  };
}
```

#### Resolution

1. `dayjs` parses relative expressions (`now-6h`) into absolute timestamps
2. Panel-level overrides (`timeFrom`) are applied on top of the dashboard range
3. The resolved range is passed to `usePanelQueries` which includes it in the `DataQueryRequest`
4. Auto-refresh uses `setInterval` based on `refreshInterval` and re-dispatches all panel queries
5. **Auto-refresh pauses when tab is hidden** (Page Visibility API) to prevent wasted API calls
6. **Share URL**: Time range is encoded as `?from=&to=` URL parameters for bookmarking and sharing

#### Timezone

By default, the time picker uses the browser's timezone. Users can switch to a different timezone (including UTC) via a timezone selector in the time picker. The dayjs timezone plugin handles conversion. All timestamps sent to the server are in epoch milliseconds (timezone-agnostic).

#### Zoom-to-Range

On time-series panels, users can click-and-drag on the chart to zoom into that time range. This updates the dashboard-level time range (stored in `useDashboardTimeStore`) and triggers re-queries for all time-aware panels.

#### Time Picker Component

Built with shadcn/ui `Popover` + `Calendar` + `Select` components. The picker supports:
- Quick range selection (dropdown of presets)
- Absolute range selection (two date-time pickers)
- Custom relative range input

---

### Subsystem 6: Variable / Filter System

#### Description

Defines how dashboard variables work — their types, resolution, UI, and propagation to panel queries.

#### Variable Types

| Type | Description | Example | UI Component |
|------|-------------|---------|---------------|
| `query` | Values from a datasource query | `SELECT DISTINCT dataset FROM ...` | Multi-select dropdown |
| `custom` | Manually defined values | `dev, staging, prod` | Dropdown |
| `textbox` | Free-form text input | `error_count > 100` | Text input |
| `interval` | Time bucket size | `1m`, `5m`, `1h` | Dropdown |
| `datasource` | Select a datasource instance | All configured MySQL datasources | Dropdown |

#### Variable Resolution Flow

```
1. User changes variable value in the dashboard header
2. Dashboard store updates variableValues[varName]
3. All panels that reference $varName in their queries are identified
4. Those panels' queries are invalidated in React Query
5. usePanelQueries re-dispatches with interpolated values
6. Updated data flows to panel components
```

**Cascading variables**: If Variable B's query references `$A`, changing Variable A triggers B's query to re-execute, updating B's options. Resolution proceeds in dependency order.

**Debounce**: Variable changes are debounced at 300ms — panel re-queries wait 300ms after the last variable change before firing, preventing rapid consecutive queries.

**"All" value**: Multi-select variables support an "All" option that selects all values at once. When `$variable` is interpolated with "All" selected, it expands to a comma-separated list of all values.

**Async search**: For query-type variables with large option sets, a Combobox component with server-side search allows typing to filter options, rather than loading all options upfront.

#### Variable Editor

In dashboard edit mode, variables are managed in a sidebar with:
- Add/remove variables
- Change type, name, label
- Configure query (for `query` type)
- Set default value
- Toggle multi-select (for `query` and `custom`)

---

### Subsystem 7: State Management

#### Description

Defines how dashboard state is managed on the frontend using zustand and TanStack React Query.

#### zustand Stores

Per the resolved decision, the dashboard state is split into **three separate stores** for granular subscriptions and less re-rendering:

**Dashboard Layout Store** (`useDashboardLayoutStore`) — manages panel layout and edit state:

```typescript
interface DashboardLayoutStore {
  // Dashboard data
  dashboard: Dashboard | null;
  isLoading: boolean;
  error: string | null;

  // Edit state
  isEditing: boolean;
  isDirty: boolean;                    // Unsaved changes?
  selectedPanelId: string | null;

  // Actions
  setDashboard: (dashboard: Dashboard) => void;
  updatePanel: (panelId: string, updates: Partial<DashboardPanel>) => void;
  updatePanelGridPos: (panelId: string, gridPos: GridPos) => void;
  addPanel: (type: PanelType) => void;
  removePanel: (panelId: string) => void;
  setEditing: (isEditing: boolean) => void;
  saveDashboard: () => Promise<void>;
  undo: () => void;
  redo: () => void;
}
```

**Dashboard Time Store** (`useDashboardTimeStore`) — manages time range and refresh:

```typescript
interface DashboardTimeStore {
  timeRange: { from: string; to: string };
  refreshInterval: string | null;

  setTimeRange: (from: string, to: string) => void;
  setRefreshInterval: (interval: string | null) => void;
}
```

**Dashboard Variable Store** (`useDashboardVariableStore`) — manages variable values:

```typescript
interface DashboardVariableStore {
  variableValues: Record<string, unknown>;

  setVariableValue: (name: string, value: unknown) => void;
}
```

**Dashboard List Store** — manages the list of dashboards:

```typescript
interface DashboardListStore {
  dashboards: DashboardSummary[];
  isLoading: boolean;
  searchQuery: string;
  // Actions
  fetchDashboards: () => Promise<void>;
  deleteDashboard: (uid: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
}
```

#### Undo/Redo

All changes (layout moves/resizes, panel option edits, variable value changes) are tracked in an undo stack. We implement this using zustand middleware that stores a history of state snapshots:

```typescript
// Simplified undo middleware for zustand
const useDashboardLayoutStore = create<DashboardLayoutStore>()(
  temporal(          // zustand-temporal middleware for undo/redo
    (set, get) => ({
      // ... store definition
    }),
    {
      limit: 50,                 // Max undo steps
      equality: (past, present) =>
        past.panels === present.panels &&
        past.variableValues === present.variableValues,  // Track all changes: layout + options + variables
    }
  )
);
```

#### TanStack React Query

Each panel's data is fetched via React Query. The query key incorporates:
- Panel ID
- Datasource type + UID
- Interpolated query
- Resolved time range

```typescript
const queryKey = [
  "panel-data",
  panelId,
  datasourceRef.type,
  datasourceRef.uid,
  interpolatedQuery,
  resolvedTimeRange,
];

const { data, isLoading, error } = useQuery({
  queryKey,
  queryFn: () => executePanelQuery(panel),
  refetchInterval: refreshIntervalMs,
  enabled: !panel.isCollapsed,
});
```

---

### Subsystem 8: API & Backend

#### Description

Defines the server-side API endpoints and query execution infrastructure. Dashboard and datasource routes are implemented in **Hono 4** for end-to-end type safety via RPC. Existing routes remain in Fastify during a gradual transition.

#### Hono + Fastify Coexistence

The Hono app is mounted on specific path prefixes within the same Node.js process:

```typescript
// packages/server/src/index.ts
import { Hono } from "hono";
import fastify from "fastify";

// Hono handles dashboard + datasource routes
const honoApp = new Hono()
  .route("/api/dashboards", dashboardRoutes)
  .route("/api/datasource", datasourceRoutes);

// Export AppType for client-side typed RPC
export type AppType = typeof honoApp;

// Fastify handles existing routes
const fastifyApp = fastify();
// ... register existing plugins and routes

// Mount Hono on its prefixes; Fastify handles everything else
// Same-port approach: Fastify delegates matching requests to Hono
fastifyApp.all("/api/dashboards/*", async (req, reply) => {
  const res = await honoApp.fetch(req.raw);
  reply.code(res.status);
  reply.send(await res.text());
});
fastifyApp.all("/api/datasource/*", async (req, reply) => {
  const res = await honoApp.fetch(req.raw);
  reply.code(res.status);
  reply.send(await res.text());
});
```

**Why Hono for new routes:**
1. **Typed RPC**: `hc<AppType>()` gives the client fully typed request params, query, headers, and response bodies — no separate type definitions needed
2. **TypeBox reuse**: `@hono/typebox-validator` plugs directly into the existing `@sinclair/typebox` schemas used in `@webui/common`
3. **SSE support**: Hono's built-in `c.streamSSE()` handles streaming query results, replacing Socket.IO for dashboard datasource queries
4. **Lightweight**: Hono adds ~14KB gzipped vs Fastify's larger footprint
5. **Incremental migration**: Other teams keep using Fastify; dashboard routes are isolated in Hono

**Key constraint — chained route definitions:** Hono routes must use the chained syntax for `AppType` type inference:

```typescript
// ✅ Correct: chained definition (produces AppType union)
const dashboardRoutes = new Hono()
  .post("/", typeBoxValidator("json", CreateDashboardSchema), async (c) => {
    const body = c.req.valid("json");  // Fully typed from TypeBox schema
    const dashboard = await createDashboard(body);
    return c.json(dashboard, 201);      // Return type inferred by RPC
  })
  .get("/:uid", async (c) => {
    const { uid } = c.req.param();      // Typed as { uid: string }
    const dashboard = await getDashboard(uid);
    return c.json(dashboard);
  });

// ❌ Wrong: flat handler (breaks AppType inference)
app.post("/dashboards", handler);  // Client loses type safety
```

**Pre-compiled RPC types for IDE performance** (Turborepo pattern):

```typescript
// packages/common/src/rpc.ts
import { hc } from "hono/client";
import type { AppType } from "@webui/server/app";
// Pre-compile to avoid IDE lag with many routes
const client = hc<AppType>("/");
export const hcWithType = () => client;
```

#### Dashboard CRUD API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/dashboards` | List all dashboards (returns summaries: id, uid, title, tags, updatedAt) |
| `POST` | `/api/dashboards` | Create a new dashboard |
| `GET` | `/api/dashboards/:uid` | Get a dashboard by UID (full: panels, variables, etc.) |
| `PUT` | `/api/dashboards/:uid` | Update a dashboard (with optimistic concurrency via `version`) |
| `DELETE` | `/api/dashboards/:uid` | Delete a dashboard |
| `GET` | `/api/dashboards/:uid/panels/:panelId` | Get a single panel (for lazy loading) |

All endpoints use `@hono/typebox-validator` for request/response validation. TypeBox schemas are shared from `@webui/common`.

#### Datasource Query API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/datasources` | List configured datasources |
| `POST` | `/api/datasource/:type/query` | Execute a query against a datasource |
| `POST` | `/api/datasource/:type/test` | Test a datasource connection |

#### Infinity Datasource Server Implementation

```
POST /api/datasource/infinity/query
├── Validate request (URL against allowed-hosts whitelist)
├── Fetch remote URL (with configured auth, headers, timeout)
├── Parse response based on type:
│   ├── JSON: Apply rootSelector (JSONPath), extract columns
│   ├── CSV: Parse rows, map to DataFrame fields
│   ├── XML: Apply rootSelector (dot-notation), extract columns
│   └── HTML: Apply rootSelector (CSS), extract columns via CSS selectors
└── Return DataFrame[]
```

**Note**: Data transformations (filter, limit, computed columns) are not included in v1. Let the datasource query handle transformations (SQL GROUP BY, KQL aggregation).

Security considerations:
- URL must match allowed-hosts whitelist (configured per datasource instance)
- No JavaScript evaluation on the server
- HTTP method restricted to GET/POST by default
- Response size limit (default 10MB)
- Request timeout (default 30s)

#### Existing API Compatibility

The Hono dashboard/datasource routes coexist with the existing Fastify routes. The existing `/api/search/query`, `/api/presto-search/query`, and `/api/archive-metadata/sql` endpoints remain in Fastify for the existing SearchPage and IngestPage. Over time, these can be migrated to Hono routes following the same chained definition pattern.

---

### Subsystem 9: Build & Monorepo

#### Description

Defines how the project is restructured from npm workspaces to pnpm workspaces with Turborepo, and how dependencies are managed.

#### Migration Plan (npm → pnpm + turbo)

**Step 1**: Enable corepack and pin pnpm version:

```bash
corepack enable pnpm
corepack use pnpm@latest-10
```

This adds `"packageManager": "pnpm@10.33.1"` to the root `package.json`.

**Step 2**: Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Step 3**: Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint:check": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

**Step 4**: Convert `package.json` workspaces to pnpm format:

- Root `package.json` removes `"workspaces"` field, adds turbo scripts
- `apps/webui/package.json` (formerly `client/`) — the Vite app
- `packages/common/package.json` — unchanged
- `packages/ui/package.json` — new shared UI package
- `packages/datasource/package.json` — new datasource package
- `packages/server/package.json` — the Fastify + Hono server

**Step 5**: Use pnpm catalogs for synchronized dependency versions:

```yaml
# pnpm-workspace.yaml
catalog:
  react: "^19.2.0"
  react-dom: "^19.2.0"
  typescript: "^6.0.0"
  dayjs: "^1.11.20"
  "@sinclair/typebox": "^0.34.41"
  vite: "^8.0.0"
  "@vitejs/plugin-react": "^6.0.0"
  tailwindcss: "^4.2.0"
  "@tailwindcss/vite": "^4.2.0"
  zustand: "^5.0.0"
  "@tanstack/react-query": "^5.90.0"
  recharts: "^3.8.0"
  "@dnd-kit/react": "^0.4.0"
  "@dnd-kit/collision": "^0.4.0"
  "@dnd-kit/dom": "^0.4.0"
  "@dnd-kit/helpers": "^0.4.0"
  hono: "^4.8.0"
  "@hono/node-server": "^1.14.0"
  "@hono/typebox-validator": "^0.1.0"
```

Usage in package.json: `"react": "catalog:"`

**Step 6**: Initialize shadcn/ui in the webui app:

```bash
cd apps/webui
pnpm dlx shadcn@latest init --preset b0 --base base --template vite
```

This creates `components.json`, `src/components/ui/button.tsx`, `src/lib/utils.ts`, and updates `src/index.css` with Tailwind + shadcn theme variables.

Adding new components:

```bash
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add tabs
pnpm dlx shadcn@latest add popover
pnpm dlx shadcn@latest add select
pnpm dlx shadcn@latest add input
pnpm dlx shadcn@latest add dropdown-menu
pnpm dlx shadcn@latest add sheet
pnpm dlx shadcn@latest add skeleton
pnpm dlx shadcn@latest add tooltip
```

**Step 7**: Configure Vite for the monorepo:

```typescript
// apps/webui/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react-is"],
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
```

#### Key Dependencies & Versions

| Dependency | Version | Purpose |
|-----------|---------|---------|
| `react` | `^19.2.0` | UI framework |
| `react-dom` | `^19.2.0` | DOM rendering |
| `react-router` | `^7.12.0` | Routing (existing) |
| `@dnd-kit/react` | `^0.4.0` | Drag-and-drop (new API) |
| `@dnd-kit/collision` | `^0.4.0` | Collision detection strategies |
| `@dnd-kit/dom` | `^0.4.0` | DOM-specific utilities |
| `@dnd-kit/helpers` | `^0.4.0` | arrayMove, etc. |
| `recharts` | `^3.8.0` | Charts |
| `dayjs` | `^1.11.20` | Date/time |
| `@base-ui/react` | `^1.4.0` | Headless UI primitives (shadcn base) |
| `class-variance-authority` | `^0.7.0` | Variant styling (shadcn) |
| `clsx` | `^2.1.0` | Class merging (shadcn) |
| `tailwind-merge` | `^3.5.0` | Tailwind class merging (shadcn) |
| `tw-animate-css` | `^1.4.0` | Tailwind animations (shadcn) |
| `lucide-react` | `^1.14.0` | Icons (shadcn default) |
| `shadcn` | `^4.7.0` | Component CLI |
| `tailwindcss` | `^4.2.0` | CSS framework |
| `@tailwindcss/vite` | `^4.2.0` | Tailwind Vite plugin |
| `zustand` | `^5.0.0` | UI state management |
| `@tanstack/react-query` | `^5.90.0` | Server state management |
| `axios` | `^1.13.0` | HTTP client (existing) |
| `@sinclair/typebox` | `^0.34.0` | JSON Schema / validation (existing) |
| `monaco-editor` | `^0.54.0` | Code editor for SQL/KQL (existing) |
| `@monaco-editor/react` | `^4.7.0` | React wrapper (existing) |
| `vite` | `^8.0.0` | Build tool |
| `@vitejs/plugin-react` | `^6.0.0` | React Fast Refresh |
| `turbo` | `^2.9.0` | Monorepo orchestration |
| `typescript` | `^6.0.0` | Type system |
| `fastify` | `^5.7.0` | Server framework (existing routes, will be migrated to Hono) |
| `hono` | `^4.8.0` | Server framework for dashboard routes (RPC type safety) |
| `@hono/node-server` | `^1.14.0` | Node.js adapter for Hono |
| `@hono/typebox-validator` | `^0.1.0` | TypeBox validation middleware for Hono |

#### Removals / Replacements

| Existing Dependency | Replacement | Reason |
|---------------------|-------------|--------|
| `chart.js` | Recharts | React-native, composable, better dashboard fit |
| `react-chartjs-2` | Recharts | Follows chart.js removal |
| `chartjs-plugin-zoom` | Recharts `<Brush>` + custom handlers | Follows chart.js removal |
| `chartjs-adapter-dayjs-4` | dayjs (direct) | No longer needed as chart.js adapter |
| `antd` (dashboard UI only) | shadcn/ui + Tailwind | Consistent with new design system |
| `@mui/joy` (dashboard UI only) | shadcn/ui + Tailwind | Consistent with new design system |
| `@emotion/react` | Tailwind CSS | Remove if no MUI components remain |
| `@emotion/styled` | Tailwind CSS | Remove if no MUI components remain |

**Note**: `antd` and `@mui/joy` are retained for existing pages (SearchPage, IngestPage) during a gradual migration. New dashboard pages use shadcn/ui exclusively.

---

## Performance & Reliability

This section addresses how the dashboard system handles large queries, prevents server crashes, and maintains responsiveness. The analysis is informed by investigating Grafana, Metabase, Superset, and the existing CLP server.

### Current CLP Server Vulnerabilities

The existing CLP server has **critical** performance gaps that the dashboard system must address:

| Area | Risk | Current State |
|------|------|---------------|
| `/api/archive-metadata/sql` result size | **Critical** | No row limit, no timeout, no streaming — OOM possible from arbitrary SQL |
| MySQL query timeout | **High** | No timeout configured — queries can run forever |
| Presto query timeout | **High** | Explicitly set to `null` (disabled) |
| MongoDB Socket.IO queries | **Medium** | Client-controlled options with no server limit; `.toArray()` materializes all results |
| Memory protection | **Critical** | No response size limits, no backpressure, no streaming anywhere |
| Query cancellation (SQL) | **None** | No abort mechanism for MySQL queries; no AbortController usage |
| Error handling (SQL) | **Medium** | No try/catch on SQL endpoint; generic 500 errors; no abort mechanism |
| Rate limiting | **Medium** | 1000/min global limit is generous; no per-route differentiation |

### Lessons from Reference Systems

**Result Size Limits**

| System | Unaggregated | Aggregated | Absolute Max | Display Max |
|--------|-------------|-----------|-------------|------------|
| Grafana | N/A | N/A | 1,000,000 rows (SQL) | N/A |
| Metabase | 2,000 rows | 10,000 rows | 1,048,575 rows | N/A |
| Superset | 1,000 (SQL Lab default) | 50,000 (chart default) | 100,000 (hard cap) | 10,000 (browser display) |

Key patterns:
- **Metabase** uses a two-tier limit: a lower default for bare/unaggregated queries (2,000) vs aggregated queries (10,000). The JDBC driver's `Statement.setMaxRows()` is set at the driver level, preventing the database from ever sending more rows than the limit.
- **Superset** uses `SQL_MAX_ROW` (100K) as a hard ceiling, but `DISPLAY_MAX_ROW` (10K) limits what's sent to the browser. For server-paginated tables, `TABLE_VIZ_MAX_ROW_SERVER` (500K) allows more.
- **Grafana** sets `DataProxyRowLimit = 1,000,000` but also uses `maxDataPoints = 100` as a hint to reduce time-series resolution.

**Query Timeouts**

| System | Sync Queries | Async Queries | JDBC Network Timeout |
|--------|-------------|--------------|---------------------|
| Grafana | 30s (proxy) | N/A | N/A (Go context-based) |
| Metabase | 20 min (prod) | N/A | max(query_timeout + 5min, 30min) |
| Superset | 30s | 6h (Celery) | N/A (Python DBAPI) |

Key patterns:
- **Metabase** sets three timeouts: query timeout (20min), JDBC network timeout (socket-level read timeout), and c3p0 unreturned connection timeout (kills connections checked out too long). The JDBC `Connection.setNetworkTimeout()` is critical — it releases threads stuck in native socket reads.
- **Superset** uses `SIGALRM` (POSIX) for sync queries and Celery's `soft_time_limit` for async. On timeout, queries are marked `TIMED_OUT` (distinct from `FAILED`).
- **Grafana** relies on HTTP request context cancellation. When the client disconnects, the context is cancelled and propagates to datasource plugins.

**Concurrent Query Limits**

| System | Strategy | Limit |
|--------|----------|-------|
| Grafana | `errgroup.SetLimit` per query request | NumCPU |
| Metabase | Frontend worker pool per dashboard | 5 (HTTP/1.1), unlimited (HTTP/2+) |
| Superset | Celery rate limiting | 100/s per worker |

Key pattern: **Metabase's frontend concurrency control** is the most relevant — it limits concurrent HTTP requests to 5 per dashboard (leaving 1 free for interactive requests, since browsers limit HTTP/1.1 to 6 per host). For HTTP/2+, multiplexing removes this constraint.

**Query Cancellation**

| System | Mechanism | Effectiveness |
|--------|-----------|---------------|
| Grafana | RxJS unsubscribe → HTTP abort + context cancellation | Cancelled at HTTP level; datasource must support it |
| Metabase | core.async canceled-chan → JDBC `Statement.cancel()` + streaming disconnect detection | Cancels the actual database statement; polls TCP socket for disconnect |
| Superset | `Query.status = STOPPED` → open new DB connection + engine-specific cancel command | Opens a second connection to kill the query |

Key pattern: **Metabase's cancellation is the most robust**. It checks for cancellation at every row during result reduction (not just at query start). When the browser disconnects, it detects this via TCP socket polling every 1000ms, then sends a message to the canceled channel, which triggers `Statement.cancel()`. Even after query completion, the Statement is always `.cancel()`-ed in the `finally` block to prevent blocking `.close()` when the full result set hasn't been consumed.

**Memory Protection**

| System | Mechanism | Details |
|--------|-----------|---------|
| Grafana | `ResponseLimitMiddleware` (byte-level) + `DataProxyRowLimit` | Byte limit disabled by default; row limit 1M |
| Metabase | `Statement.setMaxRows()` + `(take max-rows)` transducer + fetch size 500 + cache serialization limit (2MB) | Rows are discarded lazily via transducer; never loaded beyond limit |
| Superset | `SQLLAB_PAYLOAD_MAX_MB` (post-serialization check) + Arrow IPC + msgpack + zlib | No pre-serialization DataFrame size check; protection is after the fact |

Key pattern: **Metabase's multi-layer approach is the most thorough**. The JDBC `setMaxRows()` prevents the database from sending more rows. The Clojure transducer `(take max-rows)` stops reducing after the limit. The fetch size (500) prevents the JDBC driver from loading all rows into memory. And the cache serialization limit (2MB) prevents caching extremely large results.

**Streaming for Large Results**

| System | When | Mechanism |
|--------|------|-----------|
| Grafana | Non-streaming: full result in memory; Streaming datasources (Loki, Tempo): WebSocket/gRPC | `jsoniter.NewEncoder` for JSON streaming, but full response object in memory |
| Metabase | CSV/JSON/XLSX downloads | `streaming-rff` writes rows one at a time to output stream; only one row in memory |
| Superset | CSV export | SQLAlchemy `stream_results=True` + `fetchmany(chunk_size)`; 64KB output buffer |

Key pattern: **Streaming is only used for exports**, not for dashboard panel queries. For panel queries, all three systems materialize the full result in memory (bounded by row limits). This is acceptable because row limits keep the result set manageable.

**Slow Query Detection**

| System | Threshold | Action |
|--------|-----------|--------|
| Metabase | 15 seconds | Mark panel as "slow"; offer browser notification when loading completes |
| Superset | N/A (per-query timeout) | N/A |

**Error Isolation**

All three systems isolate errors per panel/card — a failure in one panel does not prevent others from loading. This is the correct pattern for our dashboard system.

### Proposed Performance Architecture

Based on the reference system analysis and the existing CLP server's vulnerabilities, the dashboard system implements a **defense-in-depth** approach with multiple layers of protection:

#### Layer 1: Query Result Size Limits

```typescript
// Configuration constants (server-side)
const QUERY_LIMITS = {
  /** Maximum rows for unaggregated queries (no GROUP BY) */
  MAX_UNAGGREGATED_QUERY_ROWS: 2_000,

  /** Maximum rows for aggregated queries (with GROUP BY) */
  MAX_AGGREGATED_QUERY_ROWS: 10_000,

  /** Maximum rows sent to the browser for display */
  MAX_DISPLAY_ROWS: 5_000,

  /** Maximum rows for server-paginated table panels */
  MAX_TABLE_SERVER_PAGINATION_ROWS: 100_000,

  /** Maximum bytes for Infinity datasource response body */
  MAX_INFINITY_RESPONSE_BYTES: 10 * 1024 * 1024,  // 10MB

  /** Maximum bytes for query result cache entry */
  MAX_CACHE_ENTRY_BYTES: 2 * 1024 * 1024,  // 2MB
} as const;
```

**Enforcement strategy** (inspired by Metabase):
1. **Server detects aggregation**: For MySQL queries, the server parses the SQL to detect `GROUP BY`. If present, the aggregated limit (10K) is used; otherwise the unaggregated limit (2K).
2. **SQL-level LIMIT injection**: For MySQL queries, the server appends `LIMIT N+1` if the query doesn't already have one. If the result has N+1 rows, the response includes `rowsTruncated: true` to inform the frontend.
3. **MySQL driver `maxRows`**: Set on the `@fastify/mysql` connection, telling the driver to stop fetching after the limit.
4. **Post-processing truncation**: After receiving results, the server caps rows to the applicable limit and adds `rowsTruncated` metadata.
5. **Frontend display truncation**: Even if the server returns 10K rows, the browser only renders 5K for non-table panels. Table panels use virtual scrolling.

#### Layer 2: Query Timeouts

```typescript
const QUERY_TIMEOUTS = {
  /** Default timeout for MySQL queries */
  MYSQL_QUERY_TIMEOUT_MS: 30_000,          // 30 seconds

  /** Default timeout for CLP/KQL queries */
  CLP_QUERY_TIMEOUT_MS: 60_000,            // 60 seconds

  /** Default timeout for Presto queries */
  PRESTO_QUERY_TIMEOUT_MS: 300_000,        // 5 minutes

  /** Default timeout for Infinity HTTP fetch */
  INFINITY_FETCH_TIMEOUT_MS: 30_000,       // 30 seconds

  /** Maximum timeout a user can configure per panel */
  MAX_PANEL_QUERY_TIMEOUT_MS: 600_000,     // 10 minutes

  /** Node.js HTTP server request timeout (hard ceiling for all routes) */
  SERVER_REQUEST_TIMEOUT_MS: 120_000,      // 2 minutes
} as const;
```

**Enforcement strategy** (inspired by Grafana + Metabase):
1. **Hono request timeout**: Set `conn.setNoDelay(true)` and use `AbortController` with `setTimeout` for per-query timeouts. The Hono handler wraps each query in `Promise.race([query, timeout(timeoutMs)])`. On timeout, the query is cancelled (see Layer 4).
2. **Per-datasource timeout**: Each datasource query is wrapped in `Promise.race([query, timeout(timeoutMs)])`. On timeout, the query is cancelled (see Layer 4).
3. **MySQL connection timeout**: Configure `connectTimeout` and `queryTimeout` on the `@fastify/mysql` connection pool (shared between Hono and Fastify routes).
4. **Presto timeout**: Override the current `timeout: null` to use `PRESTO_QUERY_TIMEOUT_MS`.
5. **Infinity fetch timeout**: The HTTP client uses `AbortController.signal` with `setTimeout(abort, INFINITY_FETCH_TIMEOUT_MS)`.
6. **Server-level timeout**: The Node.js HTTP server (shared by both Hono and Fastify) sets `server.requestTimeout = 120_000` as the hard ceiling.

#### Layer 3: Concurrent Query Limits

**Server-side** (inspired by Grafana):
- A per-request semaphore limits concurrent datasource queries per dashboard request to `NumCPU` (matching Grafana's `concurrent_query_limit`).
- When a dashboard has 20 panels querying the same datasource, their queries are batched into a single request to the datasource endpoint and fanned out concurrently within the semaphore.

**Client-side** (inspired by Metabase):
- A worker pool limits concurrent dashboard panel queries to **5 for HTTP/1.1** (leaving 1 free for interactive requests), or **unlimited for HTTP/2+** (multiplexing handles this).
- Implemented as a custom hook `useDashboardQueryPool` that wraps TanStack React Query with concurrency control.

```typescript
// Frontend concurrency control (Metabase-inspired)
const HTTP1_CONCURRENT_PANEL_FETCH_LIMIT = 5;

function getConcurrentPanelFetchLimit(): number {
  // Detect HTTP/2+ via Performance API or assume HTTP/1.1
  if (isHttp2OrHigher()) return Infinity;
  return HTTP1_CONCURRENT_PANEL_FETCH_LIMIT;
}
```

#### Layer 4: Query Cancellation

**Server-side** (inspired by Metabase + Superset):
1. Every Hono datasource query handler receives `c.env` and uses `AbortSignal` for cancellation. The signal is derived from the Node.js `IncomingMessage`'s abort event.
2. For MySQL: On abort, call `connection.destroy()` to kill the in-flight query. Unlike `connection.release()`, `destroy()` forcibly closes the connection and kills the running statement.
3. For CLP/Presto: On abort, call the existing cancel endpoint (`/api/search/cancel` or Presto `kill`), then destroy the MongoDB write stream.
4. For Infinity: On abort, the `AbortController` aborts the HTTP fetch.

**Client-side** (inspired by Grafana):
1. Each panel's `usePanelQueries` hook returns an `AbortController` that is aborted when the panel unmounts, the query changes, or the time range changes.
2. When a variable value changes, all dependent panels' in-flight queries are cancelled before new queries are dispatched.
3. TanStack React Query's built-in cancellation support (`queryClient.cancelQueries`) is leveraged.

**Disconnect detection** (inspired by Metabase):
- The Node.js server detects when the browser disconnects (via the `IncomingMessage`'s `close` event on `c.env.request`) and cancels all in-flight queries for that request. This prevents orphaned queries from consuming database resources after the user navigates away.

#### Layer 5: Memory Protection

**Row-level streaming** (for large results):
- For MySQL queries that may return many rows, use the `mysql2` driver's streaming API instead of materializing all rows:
  ```typescript
  // Instead of:
  const [rows] = await connection.query(sql);
  // Use streaming for large queries:
  const stream = connection.queryStream(sql);
  let rowCount = 0;
  const rows: Row[] = [];
  for await (const row of stream) {
    rows.push(row);
    if (++rowCount >= maxQueryRows) {
      rowsTruncated = true;
      stream.destroy(); // Stop fetching
      break;
    }
  }
  ```

**Response payload size limit**:
- Add a Hono middleware that checks response payload size before sending. If the serialized JSON exceeds a configurable limit (e.g., 50MB), truncate or error.
- For the Infinity datasource, the HTTP response body size is checked against `MAX_INFINITY_RESPONSE_BYTES` during fetch.

**Cache entry size limit** (inspired by Metabase):
- If query result caching is implemented, each cache entry is limited to `MAX_CACHE_ENTRY_BYTES` (2MB, matching Metabase). Results exceeding this are not cached.

#### Layer 6: Error Isolation

- Each panel's query is independent. A failure in one panel does not prevent others from loading.
- Failed panels display an error state with the error message and a "Retry" button.
- The dashboard header shows a summary: "3 of 20 panels failed to load" with a "Retry all" option.
- Server-side: Each datasource query within a multi-query request is wrapped in its own try/catch. If one query fails, the others still return successfully (inspired by Grafana's per-query isolation).

#### Layer 7: Slow Query Detection

(Insired by Metabase's 15-second threshold):
- Panels loading for more than 15 seconds are visually marked as "slow" (subtle indicator in the panel header).
- The dashboard-level loading indicator differentiates between "fast panels loaded" and "some panels still loading."
- A "Cancel slow queries" action is available to abort long-running queries.

#### Layer 8: SQL Injection Prevention

For the MySQL datasource:
- **Read-only mode**: Set the MySQL connection to read-only mode (`SET TRANSACTION READ ONLY`) for dashboard queries. This prevents INSERT/UPDATE/DELETE even if a user writes them.
- **Query validation**: Parse the SQL to detect destructive statements (`DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`, `TRUNCATE`). Reject such queries with a clear error message.
- **Parameterized queries**: For variable interpolation, use parameterized queries instead of string concatenation to prevent SQL injection via variable values.

#### Layer 9: Frontend Performance

**DnD performance** (via @dnd-kit/react's optimistic sorting):
- The new `@dnd-kit/react` API provides optimistic sorting — DOM elements move physically during drag without React re-renders. This eliminates the main performance bottleneck in drag-and-drop dashboards.
- Use `useSortable` with `index` for each panel, which enables the optimistic sorting plugin.
- The `PointerSensor` activation constraint (`distance: 5`) prevents accidental drags from click events.

**Chart rendering** (via Recharts):
- Use `isAnimationActive={false}` for panels with >1000 data points to skip animation overhead.
- Use `useMemo` for data arrays to prevent unnecessary re-renders.
- Use `responsive` prop (new in Recharts 3) or `ResponsiveContainer` for efficient resize handling.
- Use `throttleDelay="raf"` (default) for smooth mouse interactions.
- For time-series with >10K points, consider downsampling on the server side before sending to the client.

**Virtual scrolling for tables**:
- Use `@tanstack/react-virtual` for table panels with many rows to avoid rendering off-screen rows.

**Panel lazy rendering**:
- Use `IntersectionObserver` to only render panel content when the panel is in the viewport. Off-screen panels show a lightweight placeholder.

#### Summary: Defense-in-Depth Layers

```
User query → [Layer 1: Row limit] → [Layer 2: Timeout] → [Layer 3: Concurrency]
    → [Layer 4: Cancellation] → [Layer 5: Memory protection]
    → Response → [Layer 6: Error isolation] → [Layer 7: Slow detection]
    → [Layer 8: SQL injection prevention] → [Layer 9: Frontend perf]
```

| Layer | What it prevents | Failure mode if missing |
|-------|-----------------|----------------------|
| Row limits | OOM from large results | Server crashes on big queries |
| Timeouts | Indefinite query execution | Server resources exhausted by stuck queries |
| Concurrency | Overwhelming database | Database connection pool exhaustion |
| Cancellation | Wasted resources on abandoned queries | Orphaned queries consuming DB resources |
| Memory protection | OOM from response payloads | Node.js process killed by OS |
| Error isolation | One panel failure cascades | Entire dashboard fails to load |
| Slow detection | Users unaware of issues | Poor UX with no feedback |
| SQL injection | Data destruction / leakage | Database compromised |
| Frontend perf | Browser OOM / lag | Dashboard unusable with many panels |

---

## Testing

### Unit Tests

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Data model (dashboard, panel, gridPos) | Vitest + Testing Library | 90% |
| Variable interpolation service | Vitest | 90% |
| Datasource query builders (MySQL, CLP, Infinity) | Vitest | 85% |
| Panel plugins (rendering, options) | Vitest + Testing Library | 80% |
| zustand stores (actions, undo/redo) | Vitest | 85% |
| Server routes (CRUD, query execution) | Vitest + Hono `app.request()` test helper | 80% |
| Infinity parser (JSON, CSV, HTML) | Vitest | 90% |

### Integration Tests

| Scenario | Tool | Description |
|----------|------|-------------|
| Dashboard CRUD roundtrip | Vitest + Hono `app.request()` | Create → Read → Update → Delete |
| Query execution end-to-end | Vitest + Hono `app.request()` | Panel query → server → database → DataFrame |
| DnD layout persistence | Playwright | Drag panel → verify layout saved → reload → verify restored |
| Variable propagation | Playwright | Change variable → verify panel re-queries |
| Infinity datasource | Vitest + MSW | Mock HTTP → parse JSON/HTML → verify DataFrame |
| Time range sync | Playwright | Change time range → verify all panels update |

### End-to-End Tests

| Scenario | Tool | Description |
|----------|------|-------------|
| Full dashboard creation flow | Playwright | Create dashboard → add panel → configure → save → reload |
| Dashboard import/export | Playwright | Export → verify JSON → import into new instance |
| Multi-panel refresh | Playwright | Set auto-refresh → verify all panels re-query |
| Responsive layout | Playwright | Resize viewport → verify grid reflows |
| Keyboard accessibility | Playwright | Tab through panels → drag with keyboard → verify |

### Performance Tests

| Scenario | Target |
|----------|--------|
| Dashboard with 20 panels initial load | < 2s |
| Dashboard with 100+ panels initial load (lazy rendering) | < 5s |
| Panel drag latency | < 16ms per frame (60fps) |
| Panel re-render on variable change | < 500ms for all panels |
| Infinity datasource query (1MB JSON) | < 3s parse time |
| Dashboard with 20 panels, all querying simultaneously | Server memory < 200MB |
| MySQL query returning 2K rows (unaggregated limit) | < 3s, no OOM |
| MySQL query returning 10K rows (aggregated limit) | < 5s, no OOM |
| MySQL query returning 1M rows (over limit) | Truncated at applicable limit, < 5s, no OOM |
| Cancel a running MySQL query mid-execution | Query killed within 1s of cancel request |
| Browser disconnect during query | Server detects and cancels within 2s |
| 5 dashboards loading concurrently on same server | No connection pool exhaustion |

---

## Resolved Decisions

All open questions have been resolved through interactive review. Below is a consolidated summary of decisions per subsystem.

### Subsystem 1: Dashboard Data Model & Storage

| # | Question | Decision |
|---|---------|----------|
| 1 | Panel storage | **JSON column** in dashboards table (as proposed). Simpler CRUD, follows Grafana's approach. |
| 2 | Row panels | **Yes, include in v1**. Collapsible row panels (like Grafana's RowPanel) for organizing dashboards with 100+ panels. |
| 3 | Max panels per dashboard | **~100+ panels**. Requires IntersectionObserver for off-screen panel lazy rendering, virtualized grid, and complex auto-placement. |
| 4 | UID editability | **User-editable** (like Grafana). Predictable URLs, easier sharing. Requires uniqueness validation. |
| 5 | Version history | **Version field only (v1)**. Optimistic concurrency prevents lost updates. No audit/rollback history. |
| 6 | Tags model | **Flat string array**. Simple, filterable. Structured taxonomy can be added later. |
| 7 | Folders | **Flat list with tags (v1)**. Tag-based filtering is sufficient. Folders can be added later. |
| 8 | JSON schema migration | **Lazy migration on read**. Dashboard read code applies migrations on the fly (like Grafana's panelMigrationHandler). No DB migration needed for new panel fields. |
| 9 | createdBy/updatedBy | **Not for v1**. Add later when the auth system is fully implemented. |
| 10 | Dashboard snapshots | **Not for v1**. Export/import covers backup. Snapshots (frozen copies with embedded data) can be added later. |
| 11 | Concurrent edits | **Optimistic concurrency only**. Last write wins with version check. No real-time collaboration. |

### Subsystem 2: Panel Plugin System

| # | Question | Decision |
|---|---------|----------|
| 1 | Plugin loading | **Lazy-loaded (code-split)**. Each panel type is a dynamic import. Reduces initial bundle size. |
| 2 | Plugin generator CLI | **Not for v1**. Manual registration is sufficient for the initial panel types. |
| 3 | Options definition | **Grafana builder pattern**. Use a `PanelOptionsBuilder` with fluent API (addField, addSelect, etc.) that generates the options UI. Supports both simple and complex option layouts. |
| 4 | Data transformations | **Not for v1**. Let the datasource query handle transformations (SQL GROUP BY, KQL aggregation). |
| 5 | Library panels | **Not for v1**. Import/export covers reuse. Library panels can be added later. |
| 6 | Panel chrome | **Framework-provided chrome**. Consistent UX, simpler plugin interface. Plugins only render content. |
| 7 | Panel-type migration | **Migration handler on read**. Each stored panel has a `schemaVersion` field. `migrationHandler` on PanelPlugin runs on read. |
| 8 | Annotation overlays | **Yes, include in v1**. Horizontal regions marking events on time-series panels. Requires annotation storage model and overlay rendering. |
| 9 | Additional viz types | **Gauge, Heatmap, and Pie chart** are P0 beyond the initial set. |
| 10 | Trend indicators | **Yes, include in v1**. Stat panel shows up/down arrow + % change from previous period. |
| 11 | Cross-panel interactions | **Yes, include in v1**. Clicking a bar in a chart filters a logs panel. Requires a shared event bus between panels. |

### Subsystem 3: Datasource & Query System

| # | Question | Decision |
|---|---------|----------|
| 1 | MySQL write access | **Read-only by default**. Connection-level enforcement (`SET TRANSACTION READ ONLY`) + SQL parsing for clear error messages. |
| 2 | CLP streaming | **Consistently use SSE**. Replace Socket.IO with SSE for all datasource query results. Uniform interface, simpler code. |
| 3 | Infinity parsing | **Frontend-only parsing**. Simpler, no server-side caching of Infinity results. |
| 4 | Datasource config | **Both (YAML provisioning + API)**. YAML for provisioning defaults on startup, API for runtime changes. Grafana's pattern. |
| 5 | Templating | **Simple interpolation only (v1)**. `$variable_name` / `${variable_name}` syntax. No conditionals. |
| 6 | Connection errors | **Circuit breaker pattern**. Stop sending requests to a failing datasource for a cooldown period. Prevents cascading failures. |
| 7 | OAuth2 for Infinity | **Not for v1**. Basic auth + API keys for initial implementation. |
| 8 | Server-side query cache | **Not for v1 (client cache only)**. React Query caches on the client. No server-side cache. |
| 9 | Nested data | **Flat tabular only (v1)**. Nested JSON must be flattened via column selectors (Infinity) or SQL (MySQL). |
| 10 | Health checks | **On demand only**. Check when user opens a dashboard or clicks 'Test'. No background scheduler. |
| 11 | GraphQL support | **Not for v1**. Raw GraphQL strings in POST body. UI builder can be added later. |
| 12 | Row limit approach | **Two-tier (Metabase approach)**. Lower for unaggregated queries (2K), higher for aggregated (10K). Server detects GROUP BY. |
| 13 | MySQL streaming | **Stream all queries**. Use `mysql2`'s `queryStream()` for all dashboard queries. Prevents OOM. |
| 14 | Timeout scope | **Datasource query routes only**. Only datasource query routes get the 2-minute timeout. Other routes (compression jobs, etc.) are unaffected. |
| 15 | Read-only enforcement | **Both (connection-level + SQL parsing)**. Belt and suspenders. Connection-level for safety, SQL parsing for clear error messages. |

### Subsystem 4: Layout & Grid System

| # | Question | Decision |
|---|---------|----------|
| 1 | Row height | **Variable-height rows**. Each row is as tall as its tallest panel. More space-efficient. |
| 2 | Fixed-width mode | **Always full-width responsive**. No fixed-width mode with horizontal scroll. |
| 3 | Resize UX | **Smooth resize with grid snap**. Panel resizes smoothly (CSS resize), snaps to grid on release. |
| 4 | Panel overlapping | **Strict non-overlapping**. Panels never overlap. Simpler collision detection. |
| 5 | Auto-compact | **Auto-compact (like react-grid-layout)**. Gaps are filled automatically after move/delete. |
| 6 | Responsive breakpoints | **Single layout (v1)**. One layout that scales with viewport. |
| 7 | Drag handle | **Entire panel header**. More discoverable. Menu items use click, not drag. |
| 8 | Panel tabbing | **Not for v1**. One panel per grid position. Tabs can be added later as a container panel type. |
| 9 | Min sizes | **Per panel type minimums**. Each panel type defines its own min width/height. |
| 10 | Save timing | **Explicit Save action**. Layout changes are batched and saved on explicit "Save" click. |
| 11 | Full-screen mode | **Yes, include in v1**. Click to expand a panel to full viewport. Esc to exit. |

### Subsystem 5: Time Range System

| # | Question | Decision |
|---|---------|----------|
| 1 | Timezone | **Default to browser timezone, allow changing**. UTC is one of the selectable options. dayjs timezone plugin. |
| 2 | Zoom-to-range | **Yes, include in v1**. Click-and-drag on time-series charts to zoom to that range. |
| 3 | Auto-refresh pause | **Yes, pause when tab is hidden**. Page Visibility API prevents wasted API calls. |
| 4 | Per-panel refresh | **Dashboard-level only (v1)**. All panels share the dashboard refresh interval. |
| 5 | Absolute time inputs | **Simple date+time inputs (v1)**. In the selected timezone. dayjs handles parsing. |
| 6 | Share URL | **Yes, include in v1**. `?from=&to=` URL params for bookmarking and sharing. |
| 7 | Time shift/compare | **Not for v1**. Overlay data from N days ago can be added later. |
| 8 | Maximum time range | **No maximum enforced**. Server-side row limits and timeouts protect against accidental full-table scans. |

### Subsystem 6: Variable / Filter System

| # | Question | Decision |
|---|---------|----------|
| 1 | Cascading variables | **Yes, include in v1**. Selecting Variable A filters Variable B's options. Common in Grafana dashboards. |
| 2 | Ad-hoc filters | **Not for v1**. Free-form key-value filters from clicking chart data. Add later with cross-panel interactions. |
| 3 | Variable persistence | **Saved defaults + URL params override**. Default values saved with dashboard, current values in URL params. URL sharing preserves selections. |
| 4 | Variable groups | **Not for v1 (flat list)**. Flat list of variables. Groups can be added later. |
| 5 | Async search | **Yes, include in v1**. Typing to filter options from a large dataset. Combobox with server-side search. |
| 6 | Global variables | **Not for v1 (dashboard-scoped)**. Variables are scoped to their dashboard. |
| 7 | "All" value | **Yes, include in v1**. "All" selects all options at once for multi-select variables. |
| 8 | Debounce | **Debounced (300ms)**. Wait 300ms after last variable change before re-querying panels. |
| 9 | Variables in Infinity URLs | Yes, dashboard variables are interpolated into Infinity URL paths and headers (already in the spec). |

### Subsystem 7: State Management

| # | Question | Decision |
|---|---------|----------|
| 1 | Undo scope | **All changes (layout + options + variables)**. Track layout, panel option, and variable value changes. Higher memory usage but more useful. |
| 2 | Store structure | **Multiple stores**. Split into `useDashboardLayoutStore`, `useDashboardTimeStore`, `useDashboardVariableStore`. More granular subscriptions, less re-rendering. |
| 3 | Query results storage | **Both zustand and React Query**. React Query for caching/dedup, zustand for cross-panel access and derived state. |
| 4 | localStorage persistence | **No, don't persist**. Unsaved changes are lost on reload. Simpler, no stale state issues. |
| 5 | Optimistic updates | **Optimistic + revert on failure**. Grid updates immediately, syncs to server in background. If save fails, revert + show error. |
| 6 | Query management | **Centralized per dashboard**. One query manager coordinates all queries. Enables batch operations, global cancellation. |
| 7 | Request dedup | **React Query dedup only (v1)**. Same query key = same request. Explicit sharing can be added later. |
| 8 | Undo persistence | **In memory only (v1)**. Undo stack is in memory. Page close loses the stack. |

### Subsystem 8: API & Backend

| # | Question | Decision |
|---|---------|----------|
| 1 | API style | **REST conventions** (as proposed). Standard CRUD + RESTful datasource query routes. |
| 2 | Infinity proxy location | **Same server (Hono)**. Infinity proxy runs on the Hono server, not a separate microservice. |
| 3 | Pagination | **No pagination (v1)**. Return all dashboards (expected <100). Add later if needed. |
| 4 | WebSocket push | **Not for v1**. Users refresh to see changes. WebSocket push can be added later. |
| 5 | SSE streaming | **Yes, SSE streaming (v1)**. Long-running datasource queries stream partial results via SSE. Hono `c.streamSSE()`. |
| 6 | Client-side Infinity fetch | **Server-side only**. All Infinity URL fetching goes through the server. Secure, no CORS issues. |
| 7 | Per-datasource rate limiting | **Same rate limit for all (v1)**. One rate limit for all datasource types. |
| 8 | Dashboard deletion | **Hard-delete**. Permanent deletion. Export/import handles backup. |
| 9 | Bulk operations | **Yes, include in v1**. Delete multiple dashboards, duplicate dashboard. |
| 10 | Query validation | Yes, server validates SQL queries before execution (SQL parsing for destructive statements). |
| 11 | Query timeout | Yes, per-query timeout (already in the Performance section). |
| 12 | MySQL cancel | **destroy() in finally (Metabase pattern)**. Always kill the running statement in the finally block. Connection is discarded; pool auto-creates new ones. |
| 13 | Infinity HTTP pooling | **New connection per request**. Simpler, no resource holding. Acceptable for low-frequency Infinity queries. |
| 14 | Disconnect detection | **Event-driven (close event)**. Use Node.js `IncomingMessage` 'close' event. Zero-overhead, no polling. |
| 15 | Memory budget | **<200MB server memory**. Conservative target for 20 panels loading simultaneously. Requires streaming results and strict row limits. |
| 16 | Hono + Fastify port | **Same port (Fastify delegation)**. Fastify delegates matching requests to Hono. Client only needs one base URL. |
| 17 | hcWithType pattern | **Yes, use hcWithType pattern**. Pre-compile RPC types to avoid IDE lag as route count grows. |
| 18 | AppType export | **Directly from server package**. Client directly imports `AppType` from the server package. Simpler, despite the dependency. |

### Subsystem 9: Build & Monorepo

| # | Question | Decision |
|---|---------|----------|
| 1 | npm → pnpm migration | **Single PR**. Clean break, following [PR #2262](https://github.com/y-scope/clp/pull/2262) as reference. |
| 2 | common/ package | **Merge into packages/common/**. Consistent monorepo layout. |
| 3 | Server location | **Move to packages/server**. Consistent with the package-centric layout. |
| 4 | pnpm catalogs | **Use catalogs from the start**. Synchronized versions from day one. |
| 5 | Recharts in @webui/ui | **In feature module (dashboard-specific)**. Chart wrappers live in the dashboard feature module. @webui/ui only has shared grid/panel chrome components. |
| 6 | Turborepo remote cache | **Local caching only (v1)**. No Vercel remote cache initially. |
| 7 | @webui/datasource scope | **Include server implementations**. Both interfaces and server implementations in @webui/datasource. Shared dependency between client and server packages. |
| 8 | ESLint config | **Per-package config (v1)**. Each package has its own config. Shared config can be added later. |
| 9 | UI library migration | **Both simultaneously (gradual)**. Dashboard pages use shadcn/ui; existing pages keep antd/MUI. Both loaded during gradual migration. |
| 10 | TypeScript project refs | **Turborepo task graph only (v1)**. Simpler tsconfig. No project references. |

### Subsystem 10: Auth, RBAC & Reverse-Proxy Architecture

| # | Question | Decision |
|---|---------|----------|
| 1 | Auth method | **JWT now, pluggable for IdP later**. API server self-issues JWTs for v1. Pluggable auth interface to swap in external IdP (OAuth2/OIDC, LDAP) later. |
| 2 | Proxy implementation | **Rust (extend existing api-server)**. Extend the Axum-based API server with a reverse-proxy module. One less component. |
| 3 | Auth-proxy support | **Not for v1 (API server handles auth)**. API server validates JWT directly. Grafana-style auth-proxy (trusting fronting LB headers) can be added later. |
| 4 | Dashboard-level ACLs | **Role-based only (v1)**. 3 roles (Viewer/Editor/Admin). Dashboard-level ACLs can be added later for multi-tenant use cases. |
| 5 | MCP permissions | **Header-based (API server passes permissions)**. API server passes permitted datasets as a comma-separated X-CLP-Permissions header. MCP server trusts it. |
| 6 | Auth modes | **Same build, env-var switch**. `NODE_ENV=development` disables auth, `NODE_ENV=production` enables gateway mode. |
| 7 | Body size limit | **1MB**. Default Node.js limit is sufficient for dashboard JSON payloads. |
| 8 | Audit logging | **Not for v1**. Add later when compliance requirements arise. |
| 9 | Infinity allowed-hosts enforcement | **WebUI server level (proxied then checked)**. WebUI server checks allowed-hosts after receiving the proxied request. Closer to datasource logic, simpler API server. |
| 10 | Service-to-service auth | **Network-level trust only (v1)**. Docker network / K8s pod network isolation. No mTLS. |
| 11 | Teams/groups | **Not for v1 (individual users only)**. Permissions assigned to individual users only. Teams can be added later. |
| 12 | Per-user rate limiting | **Per-IP only (v1)**. Current approach. Per-user limiting requires auth context, add later. |
| 13 | Token revocation | **Server-side sessions (immediate revocation)**. Session store allows immediate revocation when roles/permissions change. Requires Redis or DB. |
