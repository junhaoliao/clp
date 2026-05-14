import {useCallback, useEffect, useState} from "react";

import {
    Editor,
    type BeforeMount,
    useMonaco,
} from "@monaco-editor/react";

import "../../../components/SqlEditor/monaco-loader";


type SqlCodeEditorProps = {
    value: string;
    onChange: (value: string) => void;
    language?: string;
    placeholder?: string;
    height?: number;
    disabled?: boolean;
};

/**
 * Reads a CSS variable value and converts it to a hex color for Monaco.
 */
function cssVarToHex (varName: string, fallback: string): string {
    if ("undefined" === typeof document) {
        return fallback;
    }

    const el = document.documentElement;
    const raw = getComputedStyle(el).getPropertyValue(varName).trim();
    if (!raw) {
        return fallback;
    }

    const temp = document.createElement("div");
    temp.style.color = raw;
    document.body.appendChild(temp);
    const resolved = getComputedStyle(temp).color;
    document.body.removeChild(temp);

    const match = resolved.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
        const r = Number(match[1]).toString(16).padStart(2, "0");
        const g = Number(match[2]).toString(16).padStart(2, "0");
        const b = Number(match[3]).toString(16).padStart(2, "0");

        return `#${r}${g}${b}`;
    }

    return fallback;
}

let themeRegistered = false;

function buildTheme () {
    const bgColor = cssVarToHex("--color-background", "#ffffff");
    const fgColor = cssVarToHex("--color-foreground", "#0a0a0a");
    const mutedFg = cssVarToHex("--color-muted-foreground", "#737373");

    return {
        base: "vs" as const,
        inherit: true,
        rules: [
            {token: "keyword", foreground: "0070C1"},
            {token: "string", foreground: "A31515"},
            {token: "number", foreground: "098658"},
            {token: "comment", foreground: "6A9955", fontStyle: "italic"},
            {token: "delimiter", foreground: fgColor.slice(1)},
            {token: "type", foreground: "267F99"},
        ],
        colors: {
            "editor.background": bgColor,
            "editor.foreground": fgColor,
            "editor.lineHighlightBackground": "#00000008",
            "editorWidget.background": bgColor,
            "editorWidget.border": cssVarToHex("--color-border", "#e5e5e5"),
            "editorSuggestWidget.background": bgColor,
            "editorSuggestWidget.foreground": fgColor,
            "editorSuggestWidget.selectedBackground": cssVarToHex("--color-accent", "#f5f5f5"),
            "editorSuggestWidget.highlightForeground": "0070C1",
            "editorLineNumber.foreground": mutedFg,
            "editorCursor.foreground": fgColor,
        },
    };
}

const SqlCodeEditor = ({
    value,
    onChange,
    language = "sql",
    placeholder,
    height = 96,
    disabled = false,
}: SqlCodeEditorProps) => {
    const monacoInstance = useMonaco();
    const [isFocused, setIsFocused] = useState(false);
    const showPlaceholder = !value && !isFocused && !!placeholder;

    // Define theme before editor mounts so it's available on first render.
    const handleBeforeMount = useCallback<BeforeMount>((monaco) => {
        if (!themeRegistered) {
            monaco.editor.defineTheme("dashboard-sql", buildTheme());
            themeRegistered = true;
        }
    }, []);

    // Fallback: register via useMonaco() in case beforeMount was already
    // past when the component rendered (e.g., HMR).
    useEffect(() => {
        if (null === monacoInstance || themeRegistered) {
            return;
        }
        monacoInstance.editor.defineTheme("dashboard-sql", buildTheme());
        themeRegistered = true;
    }, [monacoInstance]);

    const borderColor = isFocused ?
        cssVarToHex("--color-ring", "#a3a3a3") :
        cssVarToHex("--color-input", "#e5e5e5");
    const boxShadow = isFocused ?
        `0 0 0 2px ${cssVarToHex("--color-ring", "#a3a3a3")}25` :
        "none";

    return (
        <div
            style={{
                border: `1px solid ${borderColor}`,
                borderRadius: "var(--radius-md, 0.375rem)",
                boxShadow,
                height,
                overflow: "hidden",
                position: "relative",
                transition: "border-color 0.15s, box-shadow 0.15s",
                opacity: disabled ?
                    0.5 :
                    1,
                pointerEvents: disabled ?
                    "none" :
                    "auto",
            }}
            onBlur={() => {
                setIsFocused(false);
            }}
            onFocus={() => {
                setIsFocused(true);
            }}
        >
            {showPlaceholder && (
                <div
                    style={{
                        position: "absolute",
                        top: 5,
                        left: 8,
                        color: cssVarToHex("--color-muted-foreground", "#737373"),
                        fontSize: 12,
                        fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)",
                        pointerEvents: "none",
                        zIndex: 1,
                    }}
                >
                    {placeholder}
                </div>
            )}
            <Editor
                defaultLanguage={language}
                value={value}
                height={height}
                theme="dashboard-sql"
                beforeMount={handleBeforeMount}
                onChange={(v) => {
                    onChange(v ?? "");
                }}
                options={{
                    automaticLayout: true,
                    fixedOverflowWidgets: true,
                    folding: false,
                    glyphMargin: false,
                    lineNumbers: "off",
                    lineNumbersMinChars: 0,
                    minimap: {enabled: false},
                    overviewRulerBorder: false,
                    overviewRulerLanes: 0,
                    padding: {top: 4, bottom: 4},
                    renderLineHighlight: "none",
                    scrollBeyondLastLine: false,
                    scrollbar: {
                        horizontal: "hidden",
                        vertical: "auto",
                        verticalScrollbarSize: 6,
                    },
                    wordWrap: "on",
                    fontSize: 12,
                    fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)",
                    tabSize: 2,
                    suggest: {
                        showKeywords: true,
                        showSnippets: true,
                    },
                    quickSuggestions: {
                        other: true,
                        comments: false,
                        strings: false,
                    },
                    suggestOnTriggerCharacters: true,
                    wordBasedSuggestions: "currentDocument",
                }}/>
        </div>
    );
};

export default SqlCodeEditor;
export type {SqlCodeEditorProps};
