export default function Footer() {
  return (
    <footer className="border-t py-6 mt-auto">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        <p>AlgoHub — 大学生算法学习与开源社区平台</p>
        <p className="mt-1">© {new Date().getFullYear()} AlgoHub. Built with Next.js + FastAPI.</p>
      </div>
    </footer>
  );
}
