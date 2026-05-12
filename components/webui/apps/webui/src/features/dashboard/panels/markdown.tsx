import type {PanelComponentProps} from "../plugins/registry";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownPanel({options}: PanelComponentProps) {
  const content = (options["content"] as string) ?? "# Dashboard\n\nAdd markdown content in panel options.";

  return (
    <div className="overflow-auto h-full prose prose-sm dark:prose-invert max-w-none p-2">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
