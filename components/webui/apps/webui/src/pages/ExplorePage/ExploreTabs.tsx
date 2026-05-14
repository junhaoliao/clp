import {
    useEffect,
    useState,
} from "react";

import {cn} from "@/lib/utils";
import {useHeaderActions} from "@/hooks/use-header-actions";
import {PatternsTab} from "@/features/clpp/components/patterns-tab";
import {SchemaTab} from "@/features/clpp/components/schema-tab";
import {StatsTab} from "@/features/clpp/components/stats-tab";


const TAB_ITEMS = [
    {value: "logs", label: "Logs"},
    {value: "patterns", label: "Patterns"},
    {value: "schema", label: "Schema"},
    {value: "stats", label: "Stats"},
] as const;

type TabValue = (typeof TAB_ITEMS)[number]["value"];

interface ExploreTabsProps {
    children: React.ReactNode;
}

const ExploreTabs = ({children}: ExploreTabsProps) => {
    const [activeTab, setActiveTab] = useState<TabValue>("logs");
    const {setActions} = useHeaderActions();

    useEffect(() => {
        setActions(
            <nav
                className={"flex items-center gap-0.5 rounded-lg bg-muted p-[3px]"}
                role={"tablist"}
                aria-label={"Explore tabs"}
            >
                {TAB_ITEMS.map((tab) => (
                    <button
                        key={tab.value}
                        role={"tab"}
                        aria-selected={activeTab === tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={cn(
                            "inline-flex h-7 items-center justify-center rounded-md px-3 text-sm font-medium transition-all",
                            activeTab === tab.value
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>
        );

        return () => setActions(null);
    }, [activeTab, setActions]);

    return (
        <div className={"flex min-h-0 flex-1 flex-col"}>
            {activeTab === "logs" &&
                <div className={"flex-1 min-h-0"}>
                    {children}
                </div>}
            {activeTab === "patterns" &&
                <div className={"flex-1 min-h-0"}>
                    <PatternsTab/>
                </div>}
            {activeTab === "schema" &&
                <div className={"flex-1 min-h-0"}>
                    <SchemaTab/>
                </div>}
            {activeTab === "stats" &&
                <div className={"flex-1 min-h-0"}>
                    <StatsTab/>
                </div>}
        </div>
    );
};

export default ExploreTabs;
