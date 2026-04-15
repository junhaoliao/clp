import {
    useEffect,
    useState,
} from "react";
import {useSearchParams} from "react-router";

import {QUERY_JOB_TYPE} from "@clp/webui-shared";

import {useExtractStreamFile} from "../../api";
import {DashboardCard} from "../../components/dashboard/DashboardCard";


/**
 * Mapping from stream type to extract job type.
 */
const STREAM_TYPE_TO_JOB_TYPE: Record<string, QUERY_JOB_TYPE> = {
    ir: QUERY_JOB_TYPE.EXTRACT_IR,
    json: QUERY_JOB_TYPE.EXTRACT_JSON,
};


/**
 * Loading page displayed while a stream file is being extracted for the log viewer.
 *
 * Validates query parameters, calls the stream-files extract API, then redirects
 * to the log viewer iframe with the extracted file path.
 */
const LogViewerLoadingPage = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [filePath, setFilePath] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const type = searchParams.get("type");
    const streamId = searchParams.get("streamId");
    const logEventIdxStr = searchParams.get("logEventIdx");
    const dataset = searchParams.get("dataset");

    const extractStreamFile = useExtractStreamFile();

    useEffect(() => {
        if (!streamId || !logEventIdxStr || !type) {
            setStatus("error");
            setErrorMsg("Missing required parameters: type, streamId, or logEventIdx.");

            return;
        }

        const logEventIdx = parseInt(logEventIdxStr, 10);
        if (isNaN(logEventIdx)) {
            setStatus("error");
            setErrorMsg("Invalid logEventIdx parameter.");

            return;
        }

        const extractJobType = STREAM_TYPE_TO_JOB_TYPE[type];
        if (undefined === extractJobType) {
            setStatus("error");
            setErrorMsg(`Unknown stream type: ${type}`);

            return;
        }

        extractStreamFile.mutate({
            dataset,
            extractJobType,
            logEventIdx,
            streamId,
        }, {
            onSuccess: (data) => {
                setFilePath(data.path);
                setStatus("ready");
            },
            onError: (error: Error) => {
                setErrorMsg(error.message);
                setStatus("error");
            },
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if ("error" === status) {
        return (
            <div className={"flex items-center justify-center h-screen"}>
                <DashboardCard title={"Error"}>
                    <p className={"text-sm text-destructive"}>
                        {errorMsg ?? "An unknown error occurred."}
                    </p>
                </DashboardCard>
            </div>
        );
    }

    if ("loading" === status) {
        return (
            <div className={"flex items-center justify-center h-screen"}>
                <DashboardCard title={"Loading"}>
                    <div className={"space-y-3"}>
                        <p className={"text-sm text-muted-foreground"}>
                            Extracting stream file for log viewer...
                        </p>
                        <div className={"h-2 w-48 rounded-full bg-muted overflow-hidden"}>
                            <div className={"h-full bg-primary animate-pulse rounded-full"}/>
                        </div>
                    </div>
                </DashboardCard>
            </div>
        );
    }

    return (
        <div className={"h-screen w-full"}>
            <iframe
                src={`/log-viewer/index.html?filePath=${encodeURIComponent(filePath ?? "")}#logEventNum=${logEventIdxStr}`}
                style={{width: "100%", height: "100%", border: "none"}}
                title={"Log Viewer"}/>
        </div>
    );
};


export default LogViewerLoadingPage;
