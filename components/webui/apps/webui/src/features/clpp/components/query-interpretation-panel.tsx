import {Badge} from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {Separator} from "@/components/ui/separator";


/**
 * Query interpretation panel showing how a search query is decomposed.
 *
 * Stub: The C++ search backend crashes with --experimental, so this
 * panel shows a warning and placeholder content.
 *
 * @param root0
 * @param root0.query
 * @return The query interpretation panel component.
 */
const QueryInterpretationPanel = ({query}: {query?: string}) => {
    return (
        <Card>
            <Collapsible>
                <CardHeader className={"cursor-pointer py-2"}>
                    <CollapsibleTrigger render={<div className="flex items-center justify-between" />}>
                            <CardTitle className={"text-sm"}>Query Interpretation</CardTitle>
                            <Badge
                                className={"text-[10px]"}
                                variant={"outline"}
                            >
                                CLPP
                            </Badge>
                    </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent className={"pt-0"}>
                        <div className={"rounded-md border border-yellow-300 bg-yellow-50 p-3"}>
                            <p className={"text-xs text-yellow-800"}>
                                Query interpretation is not yet available. The search backend
                                crashes when experimental mode is enabled (std::out_of_range).
                                This feature will work once the C++ search path is fixed.
                            </p>
                        </div>
                        <Separator className={"my-3"}/>
                        <div className={"space-y-2 text-xs text-muted-foreground"}>
                            <p>
                                <span className={"font-medium"}>Query:</span>
                                {" "}
                                <code className={"text-foreground"}>
                                    {query ?? "(none)"}
                                </code>
                            </p>
                            <p>
                                <span className={"font-medium"}>Decomposed sub-queries:</span>
                                {" "}
                                Not available
                            </p>
                            <p>
                                <span className={"font-medium"}>Matched schemas:</span>
                                {" "}
                                Not available
                            </p>
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
};


export {QueryInterpretationPanel};
export default QueryInterpretationPanel;
