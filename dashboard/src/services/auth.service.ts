import api, { unwrap } from "./api";
import type { AuthSession } from "./types";

export const authService = {
  register: (data: { name: string; email: string; password: string }) =>
    api
      .post("/auth/register", data)
      .then(unwrap<{ verificationRequired: boolean; email: string; expiresInMinutes: number; devCode?: string }>),
  verifyRegistration: (data: { email: string; code: string }) =>
    api.post("/auth/register/verify", data).then(unwrap<AuthSession>),
  resendRegistrationCode: (data: { email: string }) =>
    api
      .post("/auth/register/resend", data)
      .then(unwrap<{ verificationRequired: boolean; email: string; expiresInMinutes: number; devCode?: string }>),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data).then(unwrap<AuthSession>),
  logout: () => api.post("/auth/logout").then(unwrap<{ loggedOut: boolean }>),
  getMe: () => api.get("/auth/me").then(unwrap<{ user: AuthSession["user"] }>),
  refreshToken: () => api.post("/auth/refresh").then(unwrap<AuthSession>),
  googleUrl: () => `${api.defaults.baseURL}/auth/google`,
};
