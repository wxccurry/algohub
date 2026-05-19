"use client";
import dynamic from "next/dynamic";
import { useCallback } from "react";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface Props {
  language: string;
  value: string;
  onChange: (value: string) => void;
  height?: string;
  fontSize?: number;
}

const LANGUAGE_MAP: Record<string, string> = {
  python: "python",
  cpp: "cpp",
  java: "java",
};

export default function MonacoEditor({ language, value, onChange, height = "500px", fontSize = 14 }: Props) {
  const handleChange = useCallback(
    (val: string | undefined) => onChange(val || ""),
    [onChange]
  );

  return (
    <Editor
      height={height}
      language={LANGUAGE_MAP[language] || language}
      value={value}
      onChange={handleChange}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        wordWrap: "on",
      }}
    />
  );
}
