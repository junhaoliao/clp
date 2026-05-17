import {
    useCallback,
    useState,
} from "react";

import {useQuery} from "@tanstack/react-query";
import {type AppType} from "@webui/server/hono-app";
import {
    Form,
    Select,
} from "antd";
import {hc} from "hono/client";

import SchemaMonacoEditor from "@/features/clpp/components/schema-monaco-editor";


type SchemaRecord = {
    id: string;
    name: string;
    content: string;
    createdAt: string;
    updatedAt: string;
};

type SchemaOption = {
    label: string;
    value: string;
};

const DEFAULT_OPTION: SchemaOption = {label: "Default", value: "__default__"};
const CUSTOM_OPTION: SchemaOption = {label: "Custom", value: "__custom__"};

const api = hc<AppType>("/");

const SCHEMA_TOOLTIP =
    "Choose a log-surgeon schema for JSON log compression. " +
    "\"Default\" uses the built-in schema. " +
    "A saved schema or a custom schema tells clp-s how to parse and type JSON fields.";

/**
 * Renders a "Schema" form item for JSON-mode compression: a Select dropdown
 * to pick a schema (Default, Custom, or a saved schema), and a Monaco editor
 * that appears when "Custom" or a saved schema is selected.
 */
const ClppSchemaFormItems = () => {
    const form = Form.useFormInstance();
    const [selectedValue, setSelectedValue] = useState<string>(DEFAULT_OPTION.value);

    const {data: schemas = []} = useQuery({
        queryKey: ["schemas"],
        queryFn: async () => {
            const res = await api.api.schemas.$get();
            return res.json() as Promise<SchemaRecord[]>;
        },
    });

    const options: SchemaOption[] = [
        DEFAULT_OPTION,
        CUSTOM_OPTION,
        ...schemas.map((s) => ({label: s.name, value: s.id})),
    ];

    const handleChange = useCallback((value: string) => {
        setSelectedValue(value);

        if (DEFAULT_OPTION.value === value) {
            form.setFieldValue("schemaContent", void 0); // eslint-disable-line no-void
        } else if (CUSTOM_OPTION.value === value) {
            form.setFieldValue("schemaContent", "");
        } else {
            const schema = schemas.find((s) => s.id === value);
            if (schema) {
                form.setFieldValue("schemaContent", schema.content);
            }
        }
    }, [schemas,
        form]);

    const showEditor = DEFAULT_OPTION.value !== selectedValue;

    return (
        <>
            <Form.Item
                label={"Schema"}
                tooltip={SCHEMA_TOOLTIP}
            >
                <Select
                    options={options}
                    value={selectedValue}
                    onChange={handleChange}/>
            </Form.Item>
            {showEditor && (
                <Form.Item
                    name={"schemaContent"}
                >
                    <SchemaMonacoEditor height={"160px"}/>
                </Form.Item>
            )}
        </>
    );
};


export default ClppSchemaFormItems;
