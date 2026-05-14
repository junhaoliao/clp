import {
    useEffect,
    useState,
} from "react";

import {PatternsDataTable} from "@/features/clpp/components/patterns-data-table";
import {SchemaTab} from "@/features/clpp/components/schema-tab";
import {useHeaderActions} from "@/hooks/use-header-actions";
import {cn} from "@/lib/utils";


const TAB_ITEMS = [
    {label: "Logs", value: "logs"},
    {label: "Patterns", value: "patterns"},
    {label: "Schema", value: "schema"},
] as const;

type TabValue = (typeof TAB_ITEMS)[number]["value"];

interface ExploreTabsProps {
    children: React.ReactNode;
    dataset: string;
    logsDataTable?: React.ReactNode;
    patternsDataTable?: React.ReactNode;
}

/**
 * Tab navigation for Explore page (Logs, Patterns, Schema).
 *
 * Renders the active tab's content and manages tab state via
 * the header actions slot.
 *
 * @param root0
 * @param root0.children
 * @param root0.dataset
 * @param root0.logsDataTable
 * @param root0.patternsDataTable
 * @return JSX element
 */
const ExploreTabs = ({
    children,
    dataset,
    logsDataTable,
    patternsDataTable,
}: ExploreTabsProps) => {
    const [activeTab, setActiveTab] = useState<TabValue>("logs");
    const {setActions} = useHeaderActions();

    useEffect(() => {
        setActions(
            <nav
                aria-label={"Explore tabs"}
                role={"tablist"}
                className={
                    "flex items-center gap-0.5" +
                    " rounded-lg bg-muted p-[3px]"
                }
            >
                {TAB_ITEMS.map((tab) => (
                    <button
                        aria-selected={activeTab === tab.value}
                        key={tab.value}
                        role={"tab"}
                        className={cn(
                            "inline-flex h-7 items-center" +
                            " justify-center rounded-md" +
                            " px-3 text-sm font-medium" +
                            " transition-all",
                            activeTab === tab.value ?
                                "bg-background text-foreground" +
                                " shadow-sm" :
                                "text-muted-foreground" +
                                " hover:text-foreground",
                        )}
                        onClick={() => {
                            setActiveTab(tab.value);
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>,
        );

        return () => {
            setActions(null);
        };
    }, [activeTab,
        setActions]);

    return (
        <div className={"flex min-h-0 flex-1 flex-col"}>
            {"logs" === activeTab && (
                <div className={"flex-1 min-h-0 p-4"}>
                    {logsDataTable ?? children}
                </div>
            )}
            {"patterns" === activeTab && (
                <div className={"flex-1 min-h-0 p-4"}>
                    {patternsDataTable ?? (
                        <PatternsDataTable dataset={dataset}/>
                    )}
                </div>
            )}
            {"schema" === activeTab && (
                <div className={"flex-1 min-h-0 p-4"}>
                    <SchemaTab dataset={dataset}/>
                </div>
            )}
        </div>
    );
};

export default ExploreTabs;
