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


/**
 * Query interpretation panel showing how a search query is decomposed.
 *
 * Requires the C++ search backend to support experimental decomposed
 * queries. Falls back to a placeholder when unavailable.
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
                                Pending backend support
                            </p>
                            <p>
                                <span className={"font-medium"}>Matched schemas:</span>
                                {" "}
                                Pending backend support
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
