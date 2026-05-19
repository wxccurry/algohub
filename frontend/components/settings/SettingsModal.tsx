"use client";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Camera, Loader2, Save, X } from "lucide-react";

interface ProfileData {
  nickname: string | null; avatar: string | null; gender: number; gender_label: string;
  bio: string | null; preferred_languages: string | null; github_url: string | null;
  blog_url: string | null; current_status: number; current_status_label: string;
  school: string | null; major: string | null; organization: string | null;
  region_code: string | null; solved_count: number; rating: number; streak_days: number;
  privacy_settings: Record<string, boolean>;
}

interface Props { open: boolean; onClose: () => void }

const GENDERS = [{ v: "0", label: "未知" }, { v: "1", label: "男" }, { v: "2", label: "女" }];
const STATUSES = [{ v: "1", label: "在校生" }, { v: "2", label: "在职-看机会" }, { v: "3", label: "在职-不看机会" }];
const LANGUAGES = ["Python", "C++", "Java", "JavaScript", "Go", "Rust", "TypeScript", "C", "Kotlin", "Swift"];
const REGIONS = ["CN", "US", "JP", "KR", "SG", "GB", "DE", "CA", "AU", "IN"];

export default function SettingsModal({ open, onClose }: Props) {
  const { user, fetchUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState("basic");
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nickname: "", gender: "0", bio: "",
    preferred_languages: "", github_url: "", blog_url: "",
    current_status: "1", school: "", major: "", organization: "", region_code: "",
  });

  const [privacy, setPrivacy] = useState({
    show_submissions: true, show_solutions: true,
    show_checkin_calendar: true, show_ranking: true,
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [langInput, setLangInput] = useState("");
  const [langList, setLangList] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.profile) return;
    const p = user.profile as ProfileData;
    setForm({
      nickname: p.nickname || "", gender: String(p.gender || 0), bio: p.bio || "",
      preferred_languages: p.preferred_languages || "", github_url: p.github_url || "",
      blog_url: p.blog_url || "", current_status: String(p.current_status || 1),
      school: p.school || "", major: p.major || "", organization: p.organization || "",
      region_code: p.region_code || "",
    });
    setLangList(p.preferred_languages ? p.preferred_languages.split(",").map((s) => s.trim()).filter(Boolean) : []);
    if (p.privacy_settings) setPrivacy({
      show_submissions: p.privacy_settings.show_submissions ?? true,
      show_solutions: p.privacy_settings.show_solutions ?? true,
      show_checkin_calendar: p.privacy_settings.show_checkin_calendar ?? true,
      show_ranking: p.privacy_settings.show_ranking ?? true,
    });
    setDirty(false);
  }, [user?.profile, open]);

  if (!open) return null;

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [k]: e.target.value }));
    setDirty(true);
  };

  const addLang = (lang: string) => {
    if (!langList.includes(lang)) {
      const next = [...langList, lang];
      setLangList(next);
      setForm((prev) => ({ ...prev, preferred_languages: next.join(",") }));
      setDirty(true);
    }
    setLangInput("");
  };

  const removeLang = (lang: string) => {
    const next = langList.filter((l) => l !== lang);
    setLangList(next);
    setForm((prev) => ({ ...prev, preferred_languages: next.join(",") }));
    setDirty(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("头像不能超过 2MB"); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("仅支持 JPG / PNG / WebP"); return;
    }
    const reader = new FileReader();
    reader.onload = () => { setAvatarPreview(reader.result as string); setDirty(true); };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        nickname: form.nickname || null, gender: Number(form.gender),
        bio: form.bio || null, preferred_languages: form.preferred_languages || null,
        github_url: form.github_url || null, blog_url: form.blog_url || null,
        current_status: Number(form.current_status), school: form.school || null,
        major: form.major || null, organization: form.organization || null,
        region_code: form.region_code || null, privacy_settings: privacy,
      };
      if (avatarPreview) payload.avatar = avatarPreview;
      await api.put("/auth/me", payload);
      await fetchUser();
      toast.success("资料已保存");
      setDirty(false);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      const msg = typeof detail === "string" ? detail
        : Array.isArray(detail) ? detail.map((d: { msg?: string }) => d.msg).join(", ") : "保存失败";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (dirty && !confirm("有未保存的修改，确定要关闭吗？")) return;
    onClose();
  };

  const profile = user?.profile as ProfileData | undefined;

  const Switch = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button type="button" role="switch" aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        checked ? "bg-primary" : "bg-input"}`}
    >
      <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
        checked ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Panel */}
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl bg-popover p-6 shadow-2xl ring-1 ring-foreground/10">
        {/* Close button */}
        <button onClick={handleClose} className="absolute top-3 right-3 p-1 rounded hover:bg-muted">
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-bold mb-1">账号设置</h2>
        <p className="text-sm text-muted-foreground mb-4">完善你的个人资料，让社区更好地认识你</p>

        {/* Avatar row */}
        <div className="flex items-center gap-4 py-2 mb-4">
          <div className="relative cursor-pointer" onClick={() => fileRef.current?.click()}>
            <Avatar className="h-20 w-20 border-2 border-primary/20">
              <AvatarImage src={avatarPreview || profile?.avatar || undefined} />
              <AvatarFallback className="text-2xl">
                {user?.username?.slice(0, 2).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 bg-primary rounded-full p-1">
              <Camera className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>
          <div>
            <p className="font-medium">{user?.username}</p>
            <p className="text-sm text-muted-foreground">{profile?.solved_count || 0} 题已解 · Rating {profile?.rating || 1500}</p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v ?? "basic")}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="basic">基础资料</TabsTrigger>
            <TabsTrigger value="tech">技术履历</TabsTrigger>
            <TabsTrigger value="privacy">隐私设置</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>昵称</Label>
                <Input value={form.nickname} onChange={update("nickname")} placeholder="2-32 字符" maxLength={32} />
              </div>
              <div className="space-y-2">
                <Label>性别</Label>
                <Select value={form.gender} onValueChange={(v) => { setForm((p) => ({ ...p, gender: v ?? "0" })); setDirty(true); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GENDERS.map((g) => <SelectItem key={g.v} value={g.v}>{g.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>个人简介</Label>
              <Textarea value={form.bio} onChange={update("bio")} placeholder="简单介绍一下自己…" rows={3} maxLength={160} />
              <span className="text-xs text-muted-foreground">{form.bio.length}/160</span>
            </div>
            <div className="space-y-2">
              <Label>所在地</Label>
              <Select value={form.region_code} onValueChange={(v) => { setForm((p) => ({ ...p, region_code: v ?? "" })); setDirty(true); }}>
                <SelectTrigger><SelectValue placeholder="选择地区" /></SelectTrigger>
                <SelectContent>{REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="tech" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>常用编程语言</Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {langList.map((l) => (
                  <Badge key={l} variant="secondary" className="gap-1">
                    {l} <X className="h-3 w-3 cursor-pointer" onClick={() => removeLang(l)} />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={langInput} onChange={(e) => setLangInput(e.target.value)}
                  placeholder="输入语言名称后点击添加" onKeyDown={(e) => e.key === "Enter" && addLang(langInput)} />
                <Button variant="outline" size="sm" onClick={() => addLang(langInput)}>添加</Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {LANGUAGES.filter((l) => !langList.includes(l)).slice(0, 8).map((l) => (
                  <Badge key={l} variant="outline" className="cursor-pointer hover:bg-primary/10"
                    onClick={() => addLang(l)}>+ {l}</Badge>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>学校</Label><Input value={form.school} onChange={update("school")} placeholder="如：清华大学" /></div>
              <div className="space-y-2"><Label>专业</Label><Input value={form.major} onChange={update("major")} placeholder="如：计算机科学" /></div>
            </div>
            <div className="space-y-2"><Label>现就职企业</Label><Input value={form.organization} onChange={update("organization")} placeholder="如：阿里巴巴" /></div>
            <div className="space-y-2">
              <Label>当前状态</Label>
              <Select value={form.current_status} onValueChange={(v) => { setForm((p) => ({ ...p, current_status: v ?? "1" })); setDirty(true); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>GitHub 主页</Label><Input value={form.github_url} onChange={update("github_url")} placeholder="https://github.com/yourname" /></div>
            <div className="space-y-2"><Label>博客/技术网站</Label><Input value={form.blog_url} onChange={update("blog_url")} placeholder="https://yourblog.com" /></div>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4 pt-4">
            <div className="flex items-center justify-between py-2">
              <div><p className="font-medium">公开提交记录</p><p className="text-sm text-muted-foreground">允许其他用户查看你的提交记录</p></div>
              <Switch checked={privacy.show_submissions} onChange={(v) => { setPrivacy((p) => ({ ...p, show_submissions: v })); setDirty(true); }} />
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div><p className="font-medium">公开解题报告</p><p className="text-sm text-muted-foreground">允许其他用户查看你发布的题解</p></div>
              <Switch checked={privacy.show_solutions} onChange={(v) => { setPrivacy((p) => ({ ...p, show_solutions: v })); setDirty(true); }} />
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div><p className="font-medium">显示打卡日历</p><p className="text-sm text-muted-foreground">在你的个人主页展示刷题热力图</p></div>
              <Switch checked={privacy.show_checkin_calendar} onChange={(v) => { setPrivacy((p) => ({ ...p, show_checkin_calendar: v })); setDirty(true); }} />
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div><p className="font-medium">显示排行榜排名</p><p className="text-sm text-muted-foreground">在平台排行榜中展示你的 Rating 和排名</p></div>
              <Switch checked={privacy.show_ranking} onChange={(v) => { setPrivacy((p) => ({ ...p, show_ranking: v })); setDirty(true); }} />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>取消</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}
