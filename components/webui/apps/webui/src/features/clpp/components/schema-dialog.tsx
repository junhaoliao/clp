import {
    useCallback,
    useState,
} from "react";

import {
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";
import type {AppType} from "@webui/server/hono-app";
import {hc} from "hono/client";

import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import SchemaMonacoEditor from "@/features/clpp/components/schema-monaco-editor";


type SchemaRecord = {
    id: string;
    name: string;
    content: string;
    createdAt: string;
    updatedAt: string;
};

const api = hc<AppType>("/");

/**
 * Dialog for adding or editing a schema record.
 *
 * @param root0
 * @param root0.mode
 * @param root0.schema
 * @return The schema dialog component.
 */
const SchemaDialog = ({mode, schema}: {
    mode: "add" | "edit";
    schema?: SchemaRecord;
}) => {
    const queryClient = useQueryClient();
    const isEdit = "edit" === mode;

    const [content, setContent] = useState(isEdit ?
        (schema?.content ?? "") :
        "");

    const mutation = useMutation({
        mutationFn: async (data: {name: string; content: string}) => {
            if (isEdit && schema) {
                await api.api.schemas[":id"].$put({
                    param: {id: schema.id},
                    json: data,
                });
            } else {
                await api.api.schemas.$post({json: data});
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({queryKey: ["schemas"]});
        },
    });

    const handleSubmit = useCallback((e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        mutation.mutate({
            name: formData.get("name") as string,
            content,
        });
    }, [mutation, content]);

    return (
        <Dialog>
            <DialogTrigger render={<Button size="sm" />}>
                {isEdit ?
                    "Edit" :
                    "Add Schema"}
            </DialogTrigger>
            <DialogContent className={"sm:max-w-lg"}>
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ?
                            "Edit Schema" :
                            "Add Schema"}
                    </DialogTitle>
                </DialogHeader>
                <form
                    className={"space-y-4"}
                    onSubmit={handleSubmit}
                >
                    <div className={"space-y-2"}>
                        <Label htmlFor={"name"}>Name</Label>
                        <Input
                            id={"name"}
                            name={"name"}
                            placeholder={"hive-24hr-schema"}
                            required={true}
                            defaultValue={isEdit ?
                                schema?.name :
                                ""}/>
                    </div>
                    <div className={"space-y-2"}>
                        <Label>Schema Content</Label>
                        <SchemaMonacoEditor
                            height={"200px"}
                            onChange={setContent}
                            value={content}
                        />
                    </div>
                    <div className={"flex justify-end"}>
                        <Button
                            disabled={mutation.isPending}
                            type={"submit"}
                        >
                            {mutation.isPending ?
                                "Saving..." :
                                "Save"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default SchemaDialog;
