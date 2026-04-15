import {
    CLP_STORAGE_ENGINES,
    STORAGE_TYPE,
} from "@clp/webui-shared";

import {useCompressionJobs} from "../../../api";
import {DashboardCard} from "../../../components/dashboard/DashboardCard";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../../components/ui/table";
import {
    SETTINGS_LOGS_INPUT_TYPE,
    SETTINGS_STORAGE_ENGINE,
} from "../../../config";
import {formatSizeInBytes} from "../../../lib/format";


const MILLISECONDS_PER_SECOND = 1000;


// eslint-disable-next-line no-magic-numbers
enum CompressionJobStatus {
    PENDING = 0,
    RUNNING = 1,
    SUCCEEDED = 2,
    FAILED = 3,
    KILLED = 4,
}


interface JobData {
    key: string;
    jobId: string;
    status: CompressionJobStatus;
    statusMsg: string;
    speed: string;
    dataIngested: string;
    compressedSize: string;
    dataset: string | null;
    paths: string[];
}


const STATUS_LABELS: Record<CompressionJobStatus, string> = {
    [CompressionJobStatus.PENDING]: "Submitted",
    [CompressionJobStatus.RUNNING]: "Running",
    [CompressionJobStatus.SUCCEEDED]: "Succeeded",
    [CompressionJobStatus.FAILED]: "Failed",
    [CompressionJobStatus.KILLED]: "Killed",
};

const STATUS_COLORS: Record<CompressionJobStatus, string> = {
    [CompressionJobStatus.PENDING]: "bg-yellow-100 text-yellow-800",
    [CompressionJobStatus.RUNNING]: "bg-blue-100 text-blue-800",
    [CompressionJobStatus.SUCCEEDED]: "bg-green-100 text-green-800",
    [CompressionJobStatus.FAILED]: "bg-red-100 text-red-800",
    [CompressionJobStatus.KILLED]: "bg-gray-200 text-gray-800",
};


/**
 * Renders the body content of the compression jobs table.
 *
 * @param isLoading
 * @param jobs
 * @param isClpS
 * @param isFs
 */
const renderTableContent = (
    isLoading: boolean,
    jobs: JobData[],
    isClpS: boolean,
    isFs: boolean,
) => {
    if (isLoading) {
        return (
            <div className={"py-4 text-center text-sm text-muted-foreground"}>
                Loading jobs...
            </div>
        );
    }

    if (0 === jobs.length) {
        return (
            <div className={"py-4 text-center text-sm text-muted-foreground"}>
                No compression jobs found.
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Status</TableHead>
                    {isClpS && (
                        <TableHead>Dataset</TableHead>
                    )}
                    {isFs && (
                        <TableHead>Paths</TableHead>
                    )}
                    <TableHead>Speed</TableHead>
                    <TableHead>Data Ingested</TableHead>
                    <TableHead>Compressed Size</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {jobs.map((job) => (
                    <TableRow key={job.key}>
                        <TableCell>
                            {job.jobId}
                        </TableCell>
                        <TableCell>
                            {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[job.status] ?? ""}`}>
                                {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
                                {STATUS_LABELS[job.status] ?? "Unknown"}
                            </span>
                        </TableCell>
                        {isClpS && (
                            <TableCell>
                                {job.dataset ?? "--"}
                            </TableCell>
                        )}
                        {isFs && (
                            <TableCell
                                className={"max-w-[360px] truncate"}
                                title={job.paths.join(", ")}
                            >
                                {job.paths.join(", ") || "--"}
                            </TableCell>
                        )}
                        <TableCell>
                            {job.speed}
                        </TableCell>
                        <TableCell>
                            {job.dataIngested}
                        </TableCell>
                        <TableCell>
                            {job.compressedSize}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};


/**
 *
 * @param jobs
 * @param isClpS
 * @param isFs
 */
const mapJobResponseToTableData = (
    jobs: Record<string, unknown>[],
    isClpS: boolean,
    isFs: boolean,
): JobData[] => {
    return jobs.map((job) => {
        const status = (job.status ?? 0) as number;
        const uncompressedSize = (job.uncompressed_size ?? 0) as number;
        const compressedSize = (job.compressed_size ?? 0) as number;
        const duration = job.duration as number | null;
        const startTime = job.start_time as string | null;

        // Compute speed
        let speed = "N/A";
        if (null !== duration && 0 < duration) {
            speed = `${formatSizeInBytes(uncompressedSize / duration)}/s`;
        } else if (startTime) {
            const elapsed = (Date.now() - new Date(startTime).getTime()) / MILLISECONDS_PER_SECOND;
            if (0 < elapsed) {
                speed = `${formatSizeInBytes(uncompressedSize / elapsed)}/s`;
            }
        }

        // Extract paths and dataset from clp_config
        const clpConfig = job.clp_config as Record<string, unknown> | undefined;
        const input = clpConfig?.input as Record<string, unknown> | undefined;
        const rawPaths = (input?.paths_to_compress ?? []) as string[];
        const pathPrefixToRemove = input?.path_prefix_to_remove as string | undefined;
        const paths = pathPrefixToRemove ?
            rawPaths.map((p: string) => (p.startsWith(pathPrefixToRemove) ?
                p.slice(pathPrefixToRemove.length) :
                p)) :
            rawPaths;
        const dataset = isClpS ?
            (input?.dataset ?? null) as string | null :
            null;

        const jobIdStr = String(job._id ?? job.id);

        return {
            key: jobIdStr,
            jobId: jobIdStr,
            status: status,
            statusMsg: (job.status_msg ?? "") as string,
            speed: speed,
            dataIngested: formatSizeInBytes(uncompressedSize),
            compressedSize: formatSizeInBytes(compressedSize),
            dataset: dataset,
            paths: isFs ?
                paths :
                [],
        };
    });
};


/**
 * Table displaying compression job history.
 */
const CompressionJobsTable = () => {
    const {data: rawJobs, isLoading} = useCompressionJobs();
    const isClpS = CLP_STORAGE_ENGINES.CLP_S === SETTINGS_STORAGE_ENGINE;
    const isFs = STORAGE_TYPE.FS === SETTINGS_LOGS_INPUT_TYPE;

    const jobs = rawJobs ?
        mapJobResponseToTableData(rawJobs, isClpS, isFs) :
        [];

    return (
        <DashboardCard title={"Compression Jobs"}>
            {renderTableContent(isLoading, jobs, isClpS, isFs)}
        </DashboardCard>
    );
};


export {
    CompressionJobsTable, CompressionJobStatus, mapJobResponseToTableData,
};
