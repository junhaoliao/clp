import {STORAGE_TYPE} from "@clp/webui-shared";

import {SETTINGS_LOGS_INPUT_TYPE} from "../../config";
import {CompressForm} from "./components/CompressForm";
import {CompressionJobsTable} from "./components/CompressionJobsTable";
import {Details} from "./components/Details";
import {SpaceSavings} from "./components/SpaceSavings";


/**
 * Presents compression statistics, controls, and job history.
 */
const IngestPage = () => {
    const isFs = STORAGE_TYPE.FS === SETTINGS_LOGS_INPUT_TYPE;

    return (
        <div className={"grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-5 p-5 max-w-[1250px]"}>
            <div className={"col-span-full"}>
                <SpaceSavings/>
            </div>
            <div className={"col-span-full"}>
                <Details/>
            </div>
            {isFs && (
                <div className={"col-span-full"}>
                    <CompressForm/>
                </div>
            )}
            <div className={"col-span-full"}>
                <CompressionJobsTable/>
            </div>
        </div>
    );
};


export default IngestPage;
