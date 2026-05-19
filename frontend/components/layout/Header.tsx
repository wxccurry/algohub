"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Code2, Menu, Settings, X } from "lucide-react";
import { useState } from "react";
import { AvatarImage } from "@/components/ui/avatar";
import SettingsModal from "@/components/settings/SettingsModal";

const NAV_LINKS = [
  { href: "/problems", label: "题库" },
  { href: "/contests", label: "比赛" },
  { href: "/posts", label: "广场" },
  { href: "/notes", label: "笔记" },
  { href: "/visualize", label: "可视化" },
];

export default function Header() {
  const { user, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const activeClass = "bg-secondary text-secondary-foreground font-semibold";
  const inactiveClass = "text-foreground/70 hover:text-foreground hover:bg-muted/50";

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="bg-primary/10 rounded-xl p-2 group-hover:bg-primary/20 transition-colors">
            <Code2 className="h-7 w-7 text-primary" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight">
            Algo<span className="text-primary">Hub</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1.5">
          {NAV_LINKS.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  isActive
                    ? "bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium shadow-sm transition-colors"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User / Auth */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] font-semibold hover:bg-muted transition-colors">
                <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                  <AvatarImage src={user.profile?.avatar || undefined} />
                  <AvatarFallback className="text-sm font-bold">
                    {user.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden lg:inline">{user.username}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-2">
                  <div className="text-[15px] font-semibold">{user.username}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {user.role === "admin" ? "管理员" : user.role === "author" ? "作者" : "用户"}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setSettingsOpen(true); }} className="text-[14px] py-2">
                  <Settings className="mr-2 h-4 w-4" /> 账号设置
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push(`/user/${user.username}`)} className="text-[14px] py-2">
                  个人主页
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/dashboard")} className="text-[14px] py-2">
                  我的后台
                </DropdownMenuItem>
                {user.role === "admin" && (
                  <DropdownMenuItem onClick={() => router.push("/admin")} className="text-[14px] py-2">
                    管理看板
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-[14px] py-2">退出登录</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="lg" className="text-[15px] font-medium px-5">登录</Button>
              </Link>
              <Link href="/register">
                <Button size="lg" className="text-[15px] font-semibold px-6 shadow-sm">注册</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-10 w-10"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t p-5 flex flex-col gap-3 bg-background">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
              <Button variant="ghost" size="lg" className="w-full justify-start text-[16px] font-medium">
                {link.label}
              </Button>
            </Link>
          ))}
          {user ? (
            <>
              <div className="border-t pt-3 mt-1" />
              <Link href={`/user/${user.username}`} onClick={() => setMenuOpen(false)}>
                <Button variant="ghost" size="lg" className="w-full justify-start text-[16px]">个人主页</Button>
              </Link>
              <Button variant="ghost" size="lg" className="w-full justify-start text-[16px]" onClick={() => { handleLogout(); setMenuOpen(false); }}>
                退出登录
              </Button>
            </>
          ) : (
            <div className="flex gap-3 pt-2 border-t">
              <Link href="/login" className="flex-1" onClick={() => setMenuOpen(false)}>
                <Button variant="outline" size="lg" className="w-full text-[16px]">登录</Button>
              </Link>
              <Link href="/register" className="flex-1" onClick={() => setMenuOpen(false)}>
                <Button size="lg" className="w-full text-[16px] font-semibold">注册</Button>
              </Link>
            </div>
          )}
        </div>
      )}

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}
