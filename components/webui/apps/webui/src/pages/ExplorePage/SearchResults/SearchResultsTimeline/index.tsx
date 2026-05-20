import {CLP_QUERY_ENGINES} from "@webui/common/config";
import {Card} from "antd";

import {SETTINGS_QUERY_ENGINE} from "../../../../config";
import NativeResultsTimeline from "./Native/NativeResultsTimeline";
import PrestoResultsTimeline from "./Presto/PrestoResultsTimeline";


interface SearchResultsTimelineProps {
    projection?: string[];
}

/**
 * Renders timeline visualization of search results.
 *
 * @param root0
 * @param root0.projection
 * @return
 */
const SearchResultsTimeline = ({projection = []}: SearchResultsTimelineProps) => {
    return (
        <Card>
            {CLP_QUERY_ENGINES.PRESTO === SETTINGS_QUERY_ENGINE ?
                <PrestoResultsTimeline/> :
                <NativeResultsTimeline projection={projection}/>}
        </Card>
    );
};

export default SearchResultsTimeline;
