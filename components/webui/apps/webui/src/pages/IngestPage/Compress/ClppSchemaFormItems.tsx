import {
    useCallback,
    useState,
} from "react";

import {useQuery} from "@tanstack/react-query";
import type {AppType} from "@webui/server/hono-app";
import {hc} from "hono/client";

import SchemaMonacoEditor from "@/features/clpp/components/schema-monaco-editor";

import {
    Form,
    Select,
} from "antd";


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

const LOG_CONVERTOR_OPTION: SchemaOption = {label: "Log Convertor", value: "__log_convertor__"};
const CUSTOM_OPTION: SchemaOption = {label: "Custom", value: "__custom__"};

const api = hc<AppType>("/");

const UNSTRUCTURED_LOGS_PROCESSOR_TOOLTIP =
    "Choose how unstructured (text) logs are processed. " +
    "\"Log Convertor\" converts text to structured KV-IR first, then clp-s compresses it. " +
    "A saved schema or a custom schema tells clp-s how to parse the text directly.";

/**
 * Renders a single "Unstructured logs processor" form item: a Select dropdown
 * to pick a processing mode (Log Convertor, a saved schema, or Custom), and a
 * Monaco editor that only appears when "Custom" is selected.
 */
const ClppSchemaFormItems = () => {
    const form = Form.useFormInstance();
    const [selectedValue, setSelectedValue] = useState<string>(LOG_CONVERTOR_OPTION.value);

    const {data: schemas = []} = useQuery({
        queryKey: ["schemas"],
        queryFn: async () => {
            const res = await api.api.schemas.$get();
            return res.json() as Promise<SchemaRecord[]>;
        },
    });

    const options: SchemaOption[] = [
        LOG_CONVERTOR_OPTION,
        CUSTOM_OPTION,
        ...schemas.map((s) => ({label: s.name, value: s.id})),
    ];

    const handleChange = useCallback((value: string) => {
        setSelectedValue(value);

        if (LOG_CONVERTOR_OPTION.value === value) {
            form.setFieldValue("schemaContent", undefined);
        } else if (CUSTOM_OPTION.value === value) {
            form.setFieldValue("schemaContent", "");
        } else {
            const schema = schemas.find((s) => s.id === value);
            if (schema) {
                form.setFieldValue("schemaContent", schema.content);
            }
        }
    }, [schemas, form]);

    const showEditor = CUSTOM_OPTION.value === selectedValue;

    return (
        <>
            <Form.Item
                label={"Unstructured logs processor"}
                tooltip={UNSTRUCTURED_LOGS_PROCESSOR_TOOLTIP}
            >
                <Select
                    onChange={handleChange}
                    options={options}
                    value={selectedValue}
                />
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
