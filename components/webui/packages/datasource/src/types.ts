/** Tabular data format (inspired by Grafana's DataFrame) */
export interface DataFrame {
  name: string;
  refId?: string;
  fields: DataField[];
  length: number;
  rowsTruncated?: boolean;
}

export interface DataField {
  name: string;
  type: "string" | "number" | "time" | "boolean";
  values: unknown[];
  config?: {
    displayName?: string;
    unit?: string;
    decimals?: number;
    filterable?: boolean;
  };
}

/** Standard query request */
export interface DataQueryRequest<TQuery> {
  requestId: string;
  queries: TQuery[];
  range: {from: number; to: number};
  maxDataPoints?: number;
  interval?: string;
  scopedVars?: Record<string, unknown>;
}

/** Standard query response */
export interface DataQueryResponse {
  data: DataFrame[];
  errors?: {message: string; refId?: string}[];
}

/** Resolved (absolute) time range for query execution */
export interface ResolvedTimeRange {
  from: number;
  to: number;
  raw: {
    from: string;
    to: string;
  };
}

/** MySQL query model */
export interface MySQLQuery {
  refId: string;
  sql: string;
}

/** CLP query model */
export interface CLPQuery {
  refId: string;
  queryString: string;
  datasets?: string[];
  ignoreCase?: boolean;
  queryType: "search" | "aggregate";
}

/** Auth configuration for Infinity datasource */
export type InfinityAuth =
  | {type: "none"}
  | {type: "basic"; username: string; password: string}
  | {type: "apikey"; key: string; value: string};

/** Infinity query model */
export interface InfinityQuery {
  refId: string;
  type: "json" | "csv" | "xml" | "html" | "graphql";
  source: "url" | "inline";
  url?: string;
  data?: string;
  auth?: InfinityAuth;
  urlOptions?: {
    method: "GET" | "POST";
    headers?: Record<string, string>;
    params?: Record<string, string>;
    body?: string;
    bodyType?: "json" | "form" | "graphql";
  };
  parser: "simple" | "backend";
  rootSelector?: string;
  columns?: InfinityColumn[];
  pagination?: {
    mode: "none" | "offset" | "page" | "cursor";
    pageSize?: number;
    maxPages?: number;
    offsetParam?: string;
    limitParam?: string;
    pageParam?: string;
    cursorField?: string;
  };
}

export interface InfinityColumn {
  selector: string;
  text: string;
  type: "string" | "number" | "time";
  timestampFormat?: string;
}

/** Variable option for dropdown population */
export interface VariableOption {
  value: unknown;
  text: string;
}

/** Frontend datasource interface */
export interface DataSourceApi<TQuery> {
  query(request: DataQueryRequest<TQuery>): Promise<DataQueryResponse>;
  testDataSource(): Promise<{status: "ok" | "error"; message: string}>;
  metricFindQuery?(query: string, options?: {range?: ResolvedTimeRange}): Promise<VariableOption[]>;
  interpolateVariablesInQueries?(queries: TQuery[], scopedVars: Record<string, unknown>): TQuery[];
}

/** Server-side datasource interface */
export interface ServerDataSource<TConfig> {
  init(config: TConfig): Promise<void>;
  executeQuery(query: unknown, timeRange: {from: number; to: number}): Promise<QueryResult>;
  testConnection(): Promise<boolean>;
}

/** Server query result */
export interface QueryResult {
  data: DataFrame[];
  rowsTruncated?: boolean;
  error?: string;
}

/** Query limit constants */
export const QUERY_LIMITS = {
  MAX_UNAGGREGATED_QUERY_ROWS: 2_000,
  MAX_AGGREGATED_QUERY_ROWS: 10_000,
  MAX_DISPLAY_ROWS: 5_000,
  MAX_TABLE_SERVER_PAGINATION_ROWS: 100_000,
  MAX_INFINITY_RESPONSE_BYTES: 10 * 1024 * 1024,
  MAX_CACHE_ENTRY_BYTES: 2 * 1024 * 1024,
} as const;

/** Query timeout constants */
export const QUERY_TIMEOUTS = {
  MYSQL_QUERY_TIMEOUT_MS: 30_000,
  CLP_QUERY_TIMEOUT_MS: 60_000,
  PRESTO_QUERY_TIMEOUT_MS: 300_000,
  INFINITY_FETCH_TIMEOUT_MS: 30_000,
  MAX_PANEL_QUERY_TIMEOUT_MS: 600_000,
  SERVER_REQUEST_TIMEOUT_MS: 120_000,
} as const;
