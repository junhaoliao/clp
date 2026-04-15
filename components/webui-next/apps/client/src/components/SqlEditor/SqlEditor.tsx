/* eslint-disable import/newline-after-import */
import {
    useCallback,
    useEffect,
    useState,
} from "react";

import Editor, {useMonaco} from "@monaco-editor/react";
// eslint-disable-next-line import/newline-after-import
// eslint-disable-next-line @stylistic/curly-newline
import * as monaco from "monaco-editor/esm/vs/editor/editor.api.js";
/* eslint-disable import/default */
// eslint-disable-next-line import/newline-after-import
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
/* eslint-enable import/default */
// eslint-disable-next-line import/newline-after-import
import "monaco-editor/esm/vs/basic-languages/sql/sql.contribution.js";


self.MonacoEnvironment = {
    /**
     *
     */
    getWorker () {
        return new EditorWorker();
    },
};


type SqlEditorType = monaco.editor.IStandaloneCodeEditor;

interface SqlEditorProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    height?: number;
    className?: string;
    placeholder?: string;
    onEditorReady?: (editor: SqlEditorType) => void;
}


/**
 * Monaco editor with SQL syntax highlighting.
 * Replaces the old Ant Design-themed SqlEditor with a Tailwind-compatible version.
 *
 * @param root0
 * @param root0.value
 * @param root0.onChange
 * @param root0.disabled
 * @param root0.height
 * @param root0.className
 * @param root0.onEditorReady
 */
const SqlEditor = ({
    value,
    onChange,
    disabled = false,
    height = 120,
    className,
    onEditorReady,
}: SqlEditorProps) => {
    const monacoInstance = useMonaco();
    const [isFocused, setIsFocused] = useState(false);

    const handleEditorDidMount = useCallback((editor: SqlEditorType) => {
        onEditorReady?.(editor);
    }, [onEditorReady]);

    // Define themes for light/dark mode
    useEffect(() => {
        if (null === monacoInstance) {
            return;
        }

        monacoInstance.editor.defineTheme("clp-light", {
            base: "vs",
            inherit: true,
            rules: [],
            colors: {
                "editor.background": "#ffffff",
                "editor.foreground": "#0a0a0a",
                "focusBorder": "#0000",
            },
        });

        monacoInstance.editor.defineTheme("clp-dark", {
            base: "vs-dark",
            inherit: true,
            rules: [],
            colors: {
                "editor.background": "#0a0a0a",
                "editor.foreground": "#fafafa",
                "focusBorder": "#0000",
            },
        });

        monacoInstance.editor.defineTheme("clp-disabled", {
            base: "vs",
            inherit: true,
            rules: [],
            colors: {
                "editor.background": "#f5f5f5",
                "editor.foreground": "#a3a3a3",
                "focusBorder": "#0000",
            },
        });

        // Apply theme based on current mode
        const isDark = document.documentElement.classList.contains("dark");
        monacoInstance.editor.setTheme(disabled ?
            "clp-disabled" :
            isDark ?
                "clp-dark" :
                "clp-light");
    }, [monacoInstance,
        disabled]);

    // Listen for theme changes
    useEffect(() => {
        if (null === monacoInstance) {
            return () => {
                // noop
            };
        }

        const observer = new MutationObserver(() => {
            const isDark = document.documentElement.classList.contains("dark");
            monacoInstance.editor.setTheme(disabled ?
                "clp-disabled" :
                isDark ?
                    "clp-dark" :
                    "clp-light");
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => {
            observer.disconnect();
        };
    }, [monacoInstance,
        disabled]);

    return (
        <div
            style={{height: `${height}px`}}
            className={[
                "rounded-md overflow-hidden transition-colors",
                isFocused ?
                    "ring-2 ring-ring ring-offset-1" :
                    "border border-input",
                disabled ?
                    "opacity-50 cursor-not-allowed" :
                    "",
                className ?? "",
            ].filter(Boolean).join(" ")}
            onBlur={() => {
                setIsFocused(false);
            }}
            onFocus={() => {
                setIsFocused(false);
            }}
        >
            <Editor
                language={"sql"}
                theme={"clp-light"}
                value={value}
                loading={
                    <div className={"flex items-center justify-center bg-background h-full w-full"}>
                        <span className={"text-sm text-muted-foreground"}>Loading editor...</span>
                    </div>
                }
                options={{
                    readOnly: disabled,
                    minimap: {enabled: false},
                    scrollBeyondLastLine: false,
                    lineNumbers: "off",
                    glyphMargin: false,
                    folding: false,
                    lineDecorationsWidth: 0,
                    lineNumbersMinChars: 0,
                    renderLineHighlight: "none",
                    overviewRulerLanes: 0,
                    hideCursorInOverviewRuler: true,
                    overviewRulerBorder: false,
                    scrollbar: {
                        vertical: "auto",
                        horizontal: "auto",
                        verticalScrollbarSize: 8,
                        horizontalScrollbarSize: 8,
                    },
                    padding: {top: 8},
                    wordWrap: "on",
                    fontSize: 13,
                    fontFamily: "monospace",
                }}
                onMount={handleEditorDidMount}
                onChange={(v) => {
                    onChange(v ?? "");
                }}/>
        </div>
    );
};


export default SqlEditor;
export type {
    SqlEditorProps, SqlEditorType,
};
