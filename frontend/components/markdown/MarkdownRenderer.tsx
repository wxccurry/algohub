"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import "katex/dist/katex.min.css";

interface Props {
  content: string;
}

export default function MarkdownRenderer({ content }: Props) {
  return (
    <div className="prose prose-zinc dark:prose-invert max-w-none prose-pre:bg-zinc-900 prose-pre:text-zinc-100 prose-code:text-[0.875em] prose-code:bg-muted prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:font-normal prose-pre:border prose-pre:border-border prose-headings:scroll-mt-20 prose-p:leading-relaxed prose-li:my-0.5 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:rounded-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
