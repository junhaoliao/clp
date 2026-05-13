import type {CLP_QUERY_ENGINES} from "@webui/common/config";
import type {DataFrame, DataField} from "../types.js";
import type {QueryResult, CLPQuery} from "../types.js";
import {QUERY_TIMEOUTS} from "../types.js";

/** CLP-S search result document from MongoDB */
interface ClpSearchDocument {
  _id: unknown;
  message: string;
  timestamp: number;
  // CLP-S specific
  orig_file_path?: string;
  archive_id?: string;
  log_event_ix?: number;
  dataset?: string;
  // CLP specific
  orig_file_id?: string;
}

/** Aggregation/timeline result document from MongoDB */
interface ClpAggregationDocument {
  _id: unknown;
  timestamp: number;
  count: number;
}

/**
 * Converts CLP/CLP-S search result documents to a DataFrame.
 *
 * @param docs
 * @param refId
 * @param queryEngine
 * @param maxResults
 */
export function clpDocumentsToDataFrame(
  docs: ClpSearchDocument[],
  refId: string,
  queryEngine: CLP_QUERY_ENGINES,
  maxResults: number = 1000,
): DataFrame {
  if (0 === docs.length) {
    return {name: refId, fields: [], length: 0};
  }

  const truncated = docs.length > maxResults;
  const displayDocs = truncated ?
    docs.slice(0, maxResults) :
    docs;

  const fields: DataField[] = [
    {
      name: "timestamp",
      type: "time",
      values: displayDocs.map((d) => d.timestamp),
      config: {displayName: "Time"},
    },
    {
      name: "message",
      type: "string",
      values: displayDocs.map((d) => d.message),
      config: {displayName: "Message"},
    },
  ];

  if ("clp-s" === queryEngine) {
    fields.push(
      {
        name: "dataset",
        type: "string",
        values: displayDocs.map((d) => d.dataset ?? ""),
        config: {displayName: "Dataset"},
      },
      {
        name: "archive_id",
        type: "string",
        values: displayDocs.map((d) => d.archive_id ?? ""),
        config: {displayName: "Archive ID"},
      },
    );
  } else {
    fields.push(
      {
        name: "orig_file_path",
        type: "string",
        values: displayDocs.map((d) => d.orig_file_path ?? ""),
        config: {displayName: "File"},
      },
    );
  }

  return {
    name: refId,
    fields,
    length: displayDocs.length,
    ...(truncated ? {rowsTruncated: true} : {}),
  };
}

/**
 * Converts aggregation/timeline result documents to a DataFrame.
 *
 * @param docs
 * @param refId
 */
export function clpAggregationToDataFrame(
  docs: ClpAggregationDocument[],
  refId: string,
): DataFrame {
  if (0 === docs.length) {
    return {name: refId, fields: [], length: 0};
  }

  return {
    name: refId,
    fields: [
      {name: "timestamp", type: "time", values: docs.map((d) => d.timestamp)},
      {name: "count", type: "number", values: docs.map((d) => d.count)},
    ],
    length: docs.length,
  };
}

/** CLP query datasource implementation */
export async function executeCLPQuery(
  query: CLPQuery,
  timeRange: {from: number; to: number},
  baseUrl: string = "http://localhost:3000",
): Promise<QueryResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUTS.CLP_QUERY_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/api/datasource/clp/query`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        requestId: `clp-${Date.now()}`,
        queries: [query],
        range: timeRange,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {data: [], error: `CLP query failed: ${response.status}`};
    }

    const result = await response.json();
    return {data: result.data ?? []};
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {data: [], error: "CLP query timed out"};
    }
    return {data: [], error: error instanceof Error ? error.message : "Unknown error"};
  } finally {
    clearTimeout(timeout);
  }
}
