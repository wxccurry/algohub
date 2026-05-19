"use client";

interface SampleCase {
  input: string;
  output: string;
}

interface Props {
  cases: SampleCase[];
}

export default function SampleCases({ cases }: Props) {
  if (!cases || cases.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base">示例</h3>
      {cases.map((tc, i) => (
        <div
          key={i}
          className="border rounded-lg overflow-hidden bg-muted/30"
        >
          <div className="bg-muted px-4 py-1.5 border-b">
            <span className="text-sm font-medium text-muted-foreground">
              示例 {i + 1}
            </span>
          </div>
          <div className="p-4 space-y-2 text-sm leading-relaxed">
            <div>
              <strong className="text-foreground">输入：</strong>
              <code className="font-mono text-[0.9em] bg-muted/50 px-1 py-0.5 rounded">
                {tc.input}
              </code>
            </div>
            <div>
              <strong className="text-foreground">输出：</strong>
              <code className="font-mono text-[0.9em] bg-muted/50 px-1 py-0.5 rounded">
                {tc.output}
              </code>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
