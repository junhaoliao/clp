import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import type {AppType} from "@webui/server/hono-app";
import {hc} from "hono/client";

import SchemaDialog from "./schema-dialog";

import {Button} from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {ScrollArea} from "@/components/ui/scroll-area";


type SchemaRecord = {
    id: string;
    name: string;
    content: string;
    createdAt: string;
    updatedAt: string;
};

const api = hc<AppType>("/");

const SCHEMA_PREVIEW_LEN = 80;

/**
 * Card component displaying the list of saved schemas with add/edit/delete actions.
 *
 * @return The schema library card component.
 */
const SchemaLibrary = () => {
    const queryClient = useQueryClient();
    const {data: schemas = [], isLoading} = useQuery({
        queryKey: ["schemas"],
        queryFn: async () => {
            const res = await api.api.schemas.$get();
            return res.json() as Promise<SchemaRecord[]>;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.api.schemas[":id"].$delete({param: {id}});
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({queryKey: ["schemas"]});
        },
    });

    return (
        <Card>
            <CardHeader className={"flex flex-row items-center justify-between"}>
                <CardTitle className={"text-base"}>Saved Schemas</CardTitle>
                <SchemaDialog mode={"add"}/>
            </CardHeader>
            <CardContent>
                {isLoading && <p className={"text-sm text-muted-foreground"}>Loading...</p>}
                {0 === schemas.length && !isLoading && (
                    <p className={"text-sm text-muted-foreground"}>
                        No schemas saved yet. Click &ldquo;Add
                        Schema&rdquo; to create one.
                    </p>
                )}
                <ScrollArea className={"max-h-64"}>
                    <div className={"space-y-2"}>
                        {schemas.map((schema) => (
                            <div
                                className={"flex items-center justify-between rounded-md border p-3"}
                                key={schema.id}
                            >
                                <div className={"min-w-0 flex-1"}>
                                    <p className={"truncate text-sm font-medium"}>
                                        {schema.name}
                                    </p>
                                    <p className={"truncate text-xs text-muted-foreground"}>
                                        {schema.content.slice(0, SCHEMA_PREVIEW_LEN)}
                                        {SCHEMA_PREVIEW_LEN < schema.content.length ?
                                            "..." :
                                            ""}
                                    </p>
                                </div>
                                <div className={"flex gap-2"}>
                                    <SchemaDialog
                                        mode={"edit"}
                                        schema={schema}/>
                                    <Button
                                        size={"sm"}
                                        variant={"ghost"}
                                        onClick={() => {
                                            deleteMutation.mutate(schema.id);
                                        }}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export {SchemaLibrary};
export default SchemaLibrary;
