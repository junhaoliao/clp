import {useCallback} from "react";

import {Editor} from "@monaco-editor/react";

import styles from "./index.module.css";

import "./monaco-loader";

import {cn} from "@/lib/utils";


type SchemaMonacoEditorProps = {
    className?: string;

    /** Editor height (CSS value). Default "160px". */
    height?: string;

    /** Whether the editor is read-only. */
    isReadOnly?: boolean;

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
 *
 * @param root0
 * @param root0.className
 * @param root0.height
 * @param root0.isReadOnly
 * @param root0.onChange
 * @param root0.value
 */
const SchemaMonacoEditor = ({
    className,
    height = DEFAULT_HEIGHT,
    isReadOnly = false,
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
                theme={"vs"}
                value={value ?? ""}
                loading={
                    <div
                        style={{
                            backgroundColor: "hsl(var(--muted))",
                            height: "100%",
                            width: "100%",
                        }}/>
                }
                options={{
                    fontSize: 13,
                    lineNumbers: "on",
                    minimap: {enabled: false},
                    readOnly: isReadOnly,
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                }}
                onChange={handleChange}/>
        </div>
    );
};

export default SchemaMonacoEditor;
export type {SchemaMonacoEditorProps};
