import type {CLP_QUERY_ENGINES} from "@webui/common/config";
import type {Db} from "mongodb";

export interface ClpQueryService {
  queryJobDbManager: {
    submitJob(jobConfig: object, jobType: import("@webui/common/query").QUERY_JOB_TYPE): Promise<number>;
    cancelJob(jobId: number): Promise<void>;
    awaitJobCompletion(jobId: number): Promise<void>;
  };
  mongoDb: Db;
  queryEngine: CLP_QUERY_ENGINES;
  metadataCollectionName: string;
}

let _service: ClpQueryService | null = null;

export function setClpQueryService(service: ClpQueryService): void {
  _service = service;
}

export function getClpQueryService(): ClpQueryService {
  if (!_service) {
    throw new Error("ClpQueryService not initialized. Call setClpQueryService first.");
  }
  return _service;
}
