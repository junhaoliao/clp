import {useCallback} from "react";

import {Editor} from "@monaco-editor/react";

import {cn} from "@/lib/utils";

import styles from "./index.module.css";

import "./monaco-loader";


type SchemaMonacoEditorProps = {
    className?: string;

    /** Editor height (CSS value). Default "160px". */
    height?: string;

    /** Whether the editor is read-only. */
    readOnly?: boolean;

    /** Fired when the editor content changes. */
    onChange?: (value: string) => void;

    /** Controlled editor content. */
    value?: string;
};

const DEFAULT_HEIGHT = "160px";

/**
 * Shared Monaco editor for CLPP log-surgeon schema text.
 *
 * Framework-agnostic — no Ant Design or shadcn/ui theming dependency.
 * Uses the local Monaco bundle (not CDN) via the sibling monaco-loader.
 * Intended for use in both the Compress form and the Settings SchemaDialog.
 */
const SchemaMonacoEditor = ({
    className,
    height = DEFAULT_HEIGHT,
    readOnly = false,
    onChange,
    value,
}: SchemaMonacoEditorProps) => {
    const handleChange = useCallback(
        (newValue: string | undefined) => {
            onChange?.(newValue ?? "");
        },
        [onChange],
    );

    return (
        <div className={cn(styles["editor"], className)}>
            <Editor
                height={height}
                language={"plaintext"}
                loading={
                    <div
                        style={{
                            backgroundColor: "hsl(var(--muted))",
                            height: "100%",
                            width: "100%",
                        }}
                    />
                }
                options={{
                    fontSize: 13,
                    lineNumbers: "on",
                    minimap: {enabled: false},
                    readOnly,
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                }}
                theme={"vs"}
                value={value ?? ""}
                onChange={handleChange}
            />
        </div>
    );
};

export default SchemaMonacoEditor;
export type {SchemaMonacoEditorProps};
