import {useEffect} from "react";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {CLP_STORAGE_ENGINES, STORAGE_TYPE} from "@webui/common/config";
import {RefreshCw} from "lucide-react";

import {Button} from "@/components/ui/button";
import {DashboardGrid} from "@/features/dashboard/components/dashboard-grid";
import {useDashboardLayoutStore} from "@/features/dashboard/stores/layout-store";
import {SETTINGS_LOGS_INPUT_TYPE, SETTINGS_STORAGE_ENGINE} from "../../config";
import Compress from "../IngestPage/Compress";
import Jobs from "../IngestPage/Jobs";
import {fetchDatasetNames} from "../SearchPage/SearchControls/Dataset/sql";
import {buildIngestDashboardPanels} from "./sql";


const VIRTUAL_DASHBOARD = {
    id: "ingest-virtual",
    uid: "ingest-virtual",
    title: "Ingest Overview",
    tags: [] as string[],
    variables: [],
    timeRange: {from: "now-6h", to: "now"},
    version: 1,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
};

const IngestNewPage = () => {
    const setDashboard = useDashboardLayoutStore((s) => s.setDashboard);
    const reset = useDashboardLayoutStore((s) => s.reset);
    const dashboard = useDashboardLayoutStore((s) => s.dashboard);
    const queryClient = useQueryClient();

    const isClpS = CLP_STORAGE_ENGINES.CLP_S === SETTINGS_STORAGE_ENGINE;

    const {data: datasetNames = [], isSuccess: isSuccessDatasetNames} = useQuery({
        queryKey: ["datasets"],
        queryFn: fetchDatasetNames,
        enabled: isClpS,
    });

    const panelsReady = !isClpS || isSuccessDatasetNames;

    useEffect(() => {
        if (!panelsReady) {
            return;
        }

        const names = isClpS ? datasetNames : [];
        const panels = buildIngestDashboardPanels(SETTINGS_STORAGE_ENGINE, names);

        setDashboard({...VIRTUAL_DASHBOARD, panels});

        return () => {
            reset();
        };
    }, [panelsReady, datasetNames, isClpS, setDashboard, reset]);

    if (!dashboard) {
        return (
            <div className={"flex items-center justify-center h-full text-muted-foreground"}>
                Loading...
            </div>
        );
    }

    return (
        <div className={"flex flex-col h-full"}>
            <div className={"flex items-center justify-between border-b px-4 py-2 bg-background"}>
                <h1 className={"text-lg font-semibold"}>Ingest Overview</h1>
                <Button
                    size={"sm"}
                    variant={"outline"}
                    onClick={() => {
                        queryClient.invalidateQueries({queryKey: ["panelQuery"]});
                    }}
                >
                    <RefreshCw className={"size-4"}/>
                    {" "}
                    Refresh
                </Button>
            </div>

            <div className={"flex-1 overflow-auto bg-muted/30"}>
                <DashboardGrid
                    isEditing={false}
                    panels={dashboard.panels}/>
            </div>

            <div>
                {STORAGE_TYPE.FS === SETTINGS_LOGS_INPUT_TYPE && <Compress/>}
                <Jobs/>
            </div>
        </div>
    );
};


export default IngestNewPage;
