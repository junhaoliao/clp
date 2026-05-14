import type {FC} from "react";

import {Tag} from "antd";

import {DashboardCard} from "../../../components/DashboardCard";
import Stat from "../../../components/Stat";


interface SchemaProps {
    hasSchema: boolean;
    isLoading: boolean;
}

const CLPP_TAG = <Tag color={"purple"}>CLPP</Tag>;

/**
 * Renders the schema indicator with a [CLPP] badge.
 *
 * @param props
 * @param props.hasSchema
 * @param props.isLoading
 * @return
 */
const Schema: FC<SchemaProps> = ({hasSchema, isLoading}) => {
    return (
        <DashboardCard
            isLoading={isLoading}
            title={"Schema"}
            titleExtra={CLPP_TAG}
        >
            <Stat
                text={hasSchema ?
                    "Yes" :
                    "No"}/>
        </DashboardCard>
    );
};

export default Schema;
