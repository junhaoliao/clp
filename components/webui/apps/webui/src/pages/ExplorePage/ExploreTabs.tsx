import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {PatternsTab} from "@/features/clpp/components/patterns-tab";
import {SchemaTab} from "@/features/clpp/components/schema-tab";
import {StatsTab} from "@/features/clpp/components/stats-tab";


/**
 * Tab container for the Explore page, showing Logs and CLPP tabs.
 *
 * @param root0
 * @param root0.children
 * @return The explore tabs component with CLPP tabs.
 */
const ExploreTabs = ({children}: {children: React.ReactNode}) => {
    return (
        <Tabs defaultValue={"logs"}>
            <TabsList>
                <TabsTrigger value={"logs"}>Logs</TabsTrigger>
                <TabsTrigger value={"patterns"}>Patterns</TabsTrigger>
                <TabsTrigger value={"schema"}>Schema</TabsTrigger>
                <TabsTrigger value={"stats"}>Stats</TabsTrigger>
            </TabsList>
            <TabsContent value={"logs"}>
                {children}
            </TabsContent>
            <TabsContent value={"patterns"}>
                <PatternsTab/>
            </TabsContent>
            <TabsContent value={"schema"}>
                <SchemaTab/>
            </TabsContent>
            <TabsContent value={"stats"}>
                <StatsTab/>
            </TabsContent>
        </Tabs>
    );
};

export default ExploreTabs;
