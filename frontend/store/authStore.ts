import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import api from "@/lib/api";
import { setTokens, clearAuth, getAccessToken } from "@/lib/auth";

interface User {
  id: number; username: string; email: string; role: string;
  profile: {
    avatar: string | null; nickname: string | null;
    school: string | null; solved_count: number; rating: number;
  } | null;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  appLoading: boolean;
  setAppLoading: (v: boolean) => void;
  fetchUser: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        loading: true,
        appLoading: false,

        setAppLoading: (v) => set({ appLoading: v }),

        fetchUser: async () => {
          const token = getAccessToken();
          if (!token) { set({ user: null, loading: false }); return; }
          try {
            const resp = await api.get("/auth/me");
            set({ user: resp.data.data, loading: false });
          } catch {
            clearAuth();
            set({ user: null, loading: false });
          }
        },

        login: async (username, password) => {
          set({ appLoading: true });
          try {
            const resp = await api.post("/auth/login", { username, password });
            const { access_token, refresh_token } = resp.data.data;
            setTokens(access_token, refresh_token);
            const me = await api.get("/auth/me");
            set({ user: me.data.data });
          } finally {
            set({ appLoading: false });
          }
        },

        register: async (username, email, password) => {
          set({ appLoading: true });
          try {
            await api.post("/auth/register", { username, email, password });
          } finally {
            set({ appLoading: false });
          }
        },

        logout: () => {
          const rt = localStorage.getItem("refresh_token");
          if (rt) api.post("/auth/logout", { refresh_token: rt }).catch(() => {});
          clearAuth();
          set({ user: null });
        },
      }),
      { name: "algohub-auth", partialize: (state) => ({ user: state.user }) }
    ),
    { name: "auth-store" }
  )
);
