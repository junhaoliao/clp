import type {FC} from "react";

import type {Nullable} from "@webui/common/utility-types";
import {Tag} from "antd";

import {DashboardCard} from "../../../components/DashboardCard";
import Stat from "../../../components/Stat";


interface LogtypesProps {
    numLogtypes: Nullable<number>;
    isLoading: boolean;
}

const CLPP_TAG = <Tag color={"purple"}>CLPP</Tag>;

/**
 * Renders the logtypes statistic with a [CLPP] badge.
 *
 * @param props
 * @param props.numLogtypes
 * @param props.isLoading
 * @return
 */
const Logtypes: FC<LogtypesProps> = ({numLogtypes, isLoading}) => {
    return (
        <DashboardCard
            isLoading={isLoading}
            title={"Logtypes"}
            titleExtra={CLPP_TAG}
        >
            <Stat text={(numLogtypes ?? 0).toString()}/>
        </DashboardCard>
    );
};

export default Logtypes;
