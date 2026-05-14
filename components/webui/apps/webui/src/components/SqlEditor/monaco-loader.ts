/* eslint-disable import/default */
import {loader} from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";

import "monaco-editor/esm/vs/basic-languages/sql/sql.contribution.js";
import "monaco-editor/esm/vs/editor/contrib/hover/browser/hoverContribution.js";
import "monaco-editor/esm/vs/editor/contrib/hover/browser/markerHoverParticipant.js";


/* eslint-enable import/default */


self.MonacoEnvironment = {
    /**
     * Creates a web worker for Monaco Editor.
     *
     * @return
     */
    getWorker () {
        return new EditorWorker();
    },
};

const SQL_KEYWORDS = [
    "SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "IN", "BETWEEN",
    "LIKE", "IS", "NULL", "AS", "ON", "JOIN", "LEFT", "RIGHT", "INNER",
    "OUTER", "CROSS", "GROUP", "BY", "ORDER", "ASC", "DESC", "HAVING",
    "LIMIT", "OFFSET", "UNION", "ALL", "DISTINCT", "INSERT", "INTO",
    "VALUES", "UPDATE", "SET", "DELETE", "CREATE", "TABLE", "DROP",
    "ALTER", "ADD", "COLUMN", "INDEX", "VIEW", "IF", "EXISTS", "CASE",
    "WHEN", "THEN", "ELSE", "END", "COUNT", "SUM", "AVG", "MIN", "MAX",
    "CAST", "COALESCE", "NULLIF", "TRUE", "FALSE", "WITH", "RECURSIVE",
    "OVER", "PARTITION", "ROWS", "RANGE", "FETCH", "NEXT", "ONLY",
    "EXCEPT", "INTERSECT", "ANY", "SOME", "USING", "NATURAL", "FULL",
];

const SQL_FUNCTIONS = [
    "NOW()", "DATE()", "TIME()", "YEAR()", "MONTH()", "DAY()",
    "HOUR()", "MINUTE()", "SECOND()", "DATEDIFF()",
    "CONCAT()", "SUBSTRING()", "TRIM()", "LENGTH()", "UPPER()", "LOWER()",
    "ROUND()", "FLOOR()", "CEIL()", "ABS()", "MOD()",
    "IFNULL()", "ISNULL()", "COALESCE()",
    "ROW_NUMBER()", "RANK()", "DENSE_RANK()", "LAG()", "LEAD()",
];

let completionRegistered = false;

/**
 * Registers a SQL completion provider on the given monaco instance.
 * Guarded by a module-level flag so it only runs once even if called
 * from multiple editors.
 */
function registerSqlCompletion (m: typeof monaco) {
    if (completionRegistered) {
        return;
    }
    completionRegistered = true;

    m.languages.registerCompletionItemProvider("sql", {
        triggerCharacters: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ._".split(""),
        provideCompletionItems (model, position) {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };

            const keywordSuggestions = SQL_KEYWORDS.map((kw) => ({
                label: kw,
                kind: m.languages.CompletionItemKind.Keyword,
                insertText: kw,
                range,
            }));

            const functionSuggestions = SQL_FUNCTIONS.map((fn) => ({
                label: fn,
                kind: m.languages.CompletionItemKind.Function,
                insertText: fn,
                range,
            }));

            return {suggestions: [...keywordSuggestions, ...functionSuggestions]};
        },
    });
}

loader.config({monaco});
registerSqlCompletion(monaco);
