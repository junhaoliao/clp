import type {FC} from "react";

import type {Nullable} from "@webui/common/utility-types";
import {Tag} from "antd";

import {DashboardCard} from "../../../components/DashboardCard";
import Stat from "../../../components/Stat";


interface SharedNodesProps {
    numSharedNodes: Nullable<number>;
    isLoading: boolean;
}

const CLPP_TAG = <Tag color={"purple"}>CLPP</Tag>;

/**
 * Renders the shared nodes statistic with a [CLPP] badge.
 * Shows a warning tag when shared nodes are detected.
 *
 * @param props
 * @param props.numSharedNodes
 * @param props.isLoading
 * @return
 */
const SharedNodes: FC<SharedNodesProps> = ({numSharedNodes, isLoading}) => {
    const count = numSharedNodes ?? 0;

    return (
        <DashboardCard
            isLoading={isLoading}
            title={"Shared Nodes"}
            titleExtra={CLPP_TAG}
        >
            <Stat text={count.toString()}/>
            {0 < count && (
                <Tag
                    color={"warning"}
                    style={{marginTop: 4}}
                >
                    Warning
                </Tag>
            )}
        </DashboardCard>
    );
};

export default SharedNodes;
