import {useMemo} from "react";
import ReactMarkdown from "react-markdown";

import remarkGfm from "remark-gfm";

import {interpolateQueryData} from "../hooks/query-data-interpolation";
import type {PanelComponentProps} from "../plugins/registry";


/**
 *
 * @param root0
 * @param root0.options
 * @param root0.data
 * @param root0.replaceVariables
 */
export const MarkdownPanel = ({options, data, replaceVariables}: PanelComponentProps) => {
    const rawContent = (options["content"] as string) ?? "# Dashboard\n\nAdd markdown content in panel options.";

    const content = useMemo(() => {
        let result = replaceVariables(rawContent);
        result = interpolateQueryData(result, data);

        return result;
    }, [rawContent,
        replaceVariables,
        data]);

    return (
        <div className={"overflow-auto h-full prose prose-sm dark:prose-invert max-w-none p-2"}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
            </ReactMarkdown>
        </div>
    );
};
