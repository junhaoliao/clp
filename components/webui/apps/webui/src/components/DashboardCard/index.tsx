import {
    Card,
    Typography,
} from "antd";

import styles from "./index.module.css";


const {Text} = Typography;

interface DashboardCardProps {
    title: string;
    titleExtra?: React.ReactNode;
    titleColor?: string;
    backgroundColor?: string;
    children?: React.ReactNode;
    isLoading?: boolean;
}

/**
 * Renders a card for dashboard.
 *
 * @param props
 * @param props.title
 * @param props.titleColor
 * @param props.backgroundColor
 * @param props.children
 * @param props.isLoading
 * @param props.titleExtra
 * @return
 */
const DashboardCard = ({
    title,
    titleExtra,
    titleColor,
    backgroundColor,
    children,
    isLoading = false,
}: DashboardCardProps) => {
    return (
        <Card
            className={styles["card"] || ""}
            hoverable={true}
            loading={isLoading}
            style={{backgroundColor}}
        >
            <div className={styles["cardContent"]}>
                <Text
                    className={styles["title"] || ""}
                    style={{color: titleColor}}
                >
                    {title}
                    {titleExtra}
                </Text>
                {children}
            </div>
        </Card>
    );
};

export {DashboardCard};

export type {DashboardCardProps};
