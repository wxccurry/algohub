const TEMPLATES: Record<string, string> = {
  python: `def solve():\n    # 读取输入\n    pass\n\nif __name__ == "__main__":\n    solve()\n`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // 读取输入\n    return 0;\n}\n`,
  java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // 读取输入\n    }\n}\n`,
};

export function getTemplate(language: string): string {
  return TEMPLATES[language] || "";
}
