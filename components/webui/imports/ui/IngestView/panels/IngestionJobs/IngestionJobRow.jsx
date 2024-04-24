import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Placeholder from "react-bootstrap/Placeholder";
import Spinner from "react-bootstrap/Spinner";
import Tooltip from "react-bootstrap/Tooltip";

import dayjs from "dayjs";

import {
    faCheck,
    faClock,
    faExclamation,
} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

import {
    COMPRESSION_JOB_STATUS,
    COMPRESSION_JOB_STATUS_NAMES,
} from "/imports/api/ingestion/constants";
import {computeHumanSize} from "/imports/utils/misc";

import PlaceholderText from "./PlaceholderText";


/**
 * Icons corresponding to different compression job statuses.
 *
 * @type {{[key: CompressionJobStatus]: import("@fortawesome/react-fontawesome").IconProp}}
 */
const COMPRESSION_JOB_STATUS_ICONS = Object.freeze({
    [COMPRESSION_JOB_STATUS.PENDING]: faClock,
    [COMPRESSION_JOB_STATUS.SUCCEEDED]: faCheck,
    [COMPRESSION_JOB_STATUS.FAILED]: faExclamation,
});

/**
 * Renders an ingestion job.
 *
 * @param {import("/imports/api/ingestion/types").CompressionJob} job The job object containing
 * information about the compression job.
 * @return {React.ReactElement}
 */
const IngestionJobRow = ({job}) => {
    if (null === job.duration && null !== job.start_time) {
        job.duration = dayjs.duration(
            dayjs() - dayjs(job.start_time)
        ).asSeconds();
    }

    const uncompressedSize = Number(job.uncompressed_size);
    const uncompressedSizeText =
        (false === isNaN(uncompressedSize) && 0 !== uncompressedSize) ?
            computeHumanSize(uncompressedSize) :
            "";

    const speedText = (
        0 < job.duration &&
        false === isNaN(uncompressedSize) &&
        0 !== uncompressedSize
    ) ?
        `${computeHumanSize(job.uncompressed_size / job.duration)}/s` :
        "";

    const compressedSize = Number(job.compressed_size);
    const compressedSizeText =
        (false === isNaN(compressedSize) && 0 !== compressedSize) ?
            computeHumanSize(compressedSize) :
            "";

    return (
        <tr>
            <td className={"text-center"}>
                <OverlayTrigger
                    placement={"bottom-start"}
                    overlay={
                        <Tooltip>
                            {COMPRESSION_JOB_STATUS_NAMES[job.status]}
                            {job.status_msg && (` - ${job.status_msg}`)}
                        </Tooltip>
                    }
                >
                    {COMPRESSION_JOB_STATUS.RUNNING === job.status ?
                        <Spinner size={"sm"}/> :
                        <FontAwesomeIcon
                            fixedWidth={true}
                            icon={COMPRESSION_JOB_STATUS_ICONS[job.status]}/>}
                </OverlayTrigger>
            </td>
            <td className={"fw-bold text-end"}>
                {job._id}
            </td>
            <td className={"text-end"}>
                <PlaceholderText
                    isAlwaysVisible={job.status !== COMPRESSION_JOB_STATUS.FAILED}
                    text={speedText}/>
            </td>
            <td className={"text-end"}>
                <PlaceholderText
                    isAlwaysVisible={job.status !== COMPRESSION_JOB_STATUS.FAILED}
                    text={uncompressedSizeText}/>
            </td>
            <td className={"text-end"}>
                <PlaceholderText
                    isAlwaysVisible={job.status !== COMPRESSION_JOB_STATUS.FAILED}
                    text={compressedSizeText}/>
            </td>
        </tr>
    );
};

export default IngestionJobRow;
