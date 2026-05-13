import {useMemo} from "react";

import type {PanelComponentProps} from "../plugins/registry";
import {interpolateQueryData} from "../hooks/query-data-interpolation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownPanel({options, data, replaceVariables}: PanelComponentProps) {
  const rawContent = (options["content"] as string) ?? "# Dashboard\n\nAdd markdown content in panel options.";

  const content = useMemo(() => {
    let result = replaceVariables(rawContent);
    result = interpolateQueryData(result, data);
    return result;
  }, [rawContent, replaceVariables, data]);

  return (
    <div className="overflow-auto h-full prose prose-sm dark:prose-invert max-w-none p-2">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
