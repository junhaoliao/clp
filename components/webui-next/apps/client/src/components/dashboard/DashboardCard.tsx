import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {cn} from "@/lib/utils";


interface DashboardCardProps {
    title: string;
    titleColor?: string;
    backgroundColor?: string;
    children?: React.ReactNode;
    isLoading?: boolean;
    className?: string;
}

/**
 * Renders a card for the dashboard with a title and content area.
 *
 * @param props
 * @param props.title
 * @param props.titleColor
 * @param props.backgroundColor
 * @param props.children
 * @param props.isLoading
 * @param props.className
 * @return
 */
const DashboardCard = ({
    title,
    titleColor,
    backgroundColor,
    children,
    isLoading = false,
    className,
}: DashboardCardProps) => {
    return (
        <Card
            style={{backgroundColor}}
            className={cn(
                "gap-2 py-4 shadow-none transition-shadow hover:shadow-md",
                className,
            )}
        >
            <CardHeader className={"pb-0 pt-0"}>
                <CardTitle
                    className={"text-sm font-medium"}
                    style={{color: titleColor}}
                >
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className={"pb-0"}>
                {isLoading ?
                    <div className={"h-8 animate-pulse rounded bg-muted"}/> :
                    children}
            </CardContent>
        </Card>
    );
};

export {DashboardCard};

export type {DashboardCardProps};
