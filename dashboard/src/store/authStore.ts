import { create } from "zustand";
import { authService } from "@/services/auth.service";
import type { AuthUser, Role } from "@/services/types";

export type User = AuthUser & { plan?: string };

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  accessTokenExpiresAt: string | null;
  refreshTokenExpiresAt: string | null;
  hydrate: () => Promise<User | null>;
  loginWithPassword: (email: string, password: string) => Promise<User>;
  registerWithPassword: (data: { name: string; email: string; password: string }) => Promise<{ verificationRequired: boolean; email: string; expiresInMinutes: number; devCode?: string }>;
  verifyRegistration: (email: string, code: string) => Promise<User>;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  setRole: (role: Role) => void;
}

function normalizeUser(user: AuthUser): User {
  return {
    ...user,
    role: user.role === "development" ? "admin" : user.role,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  hasHydrated: false,
  accessTokenExpiresAt: null,
  refreshTokenExpiresAt: null,

  setUser: (user) =>
    set({
      user: user ? normalizeUser(user) : null,
      isAuthenticated: Boolean(user),
      hasHydrated: true,
      accessTokenExpiresAt: user ? get().accessTokenExpiresAt : null,
      refreshTokenExpiresAt: user ? get().refreshTokenExpiresAt : null,
    }),

  hydrate: async () => {
    if (get().isLoading) return get().user;
    set({ isLoading: true });
    try {
      const session = await authService.refreshToken();
      const user = normalizeUser(session.user);
      set({
        user,
        isAuthenticated: true,
        hasHydrated: true,
        isLoading: false,
        accessTokenExpiresAt: session.accessTokenExpiresAt || null,
        refreshTokenExpiresAt: session.refreshTokenExpiresAt || null,
      });
      return user;
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        hasHydrated: true,
        isLoading: false,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
      });
      return null;
    }
  },

  loginWithPassword: async (email, password) => {
    set({ isLoading: true });
    try {
      const session = await authService.login({ email, password });
      const user = normalizeUser(session.user);
      set({
        user,
        isAuthenticated: true,
        hasHydrated: true,
        isLoading: false,
        accessTokenExpiresAt: session.accessTokenExpiresAt || null,
        refreshTokenExpiresAt: session.refreshTokenExpiresAt || null,
      });
      return user;
    } catch (error) {
      set({ isLoading: false, hasHydrated: true });
      throw error;
    }
  },

  registerWithPassword: async (data) => {
    set({ isLoading: true });
    try {
      const result = await authService.register(data);
      set({ user: null, isAuthenticated: false, hasHydrated: true, isLoading: false });
      return result;
    } catch (error) {
      set({ isLoading: false, hasHydrated: true });
      throw error;
    }
  },

  verifyRegistration: async (email, code) => {
    set({ isLoading: true });
    try {
      const session = await authService.verifyRegistration({ email, code });
      const user = normalizeUser(session.user);
      set({
        user,
        isAuthenticated: true,
        hasHydrated: true,
        isLoading: false,
        accessTokenExpiresAt: session.accessTokenExpiresAt || null,
        refreshTokenExpiresAt: session.refreshTokenExpiresAt || null,
      });
      return user;
    } catch (error) {
      set({ isLoading: false, hasHydrated: true });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authService.logout();
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        hasHydrated: true,
        isLoading: false,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
      });
    }
  },

  setRole: (role) => set((state) => (state.user ? { user: { ...state.user, role } } : state)),
}));
