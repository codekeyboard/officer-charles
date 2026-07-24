export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  role: string;
};

export type AuthSession = {
  user: AuthUser;
  accessToken?: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  errorCode?: string;
  data: T;
};

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api/v1";

export const DASHBOARD_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:8080";

export function dashboardPath(role: string) {
  return role === "admin" || role === "development"
    ? `${DASHBOARD_URL}/admin/dashboard`
    : `${DASHBOARD_URL}/user/dashboard`;
}

export function googleUrl() {
  return `${API_BASE_URL}/auth/google`;
}

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : "Request failed";
}

export const authClient = {
  login: (data: { email: string; password: string }) =>
    request<AuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  refresh: () =>
    request<AuthSession>("/auth/refresh", {
      method: "POST",
    }),
  register: (data: { name: string; email: string; password: string }) =>
    request<{
      verificationRequired: boolean;
      email: string;
      expiresInMinutes: number;
      devCode?: string;
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  verifyRegistration: (data: { email: string; code: string }) =>
    request<AuthSession>("/auth/register/verify", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  resendRegistrationCode: (data: { email: string }) =>
    request<{
      verificationRequired: boolean;
      email: string;
      expiresInMinutes: number;
      devCode?: string;
    }>("/auth/register/resend", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

class ApiError extends Error {
  status: number;
  errorCode?: string;

  constructor(message: string, status: number, errorCode?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

async function request<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | null;

  if (!response.ok) {
    throw new ApiError(
      payload?.message || response.statusText || "Request failed",
      response.status,
      payload?.errorCode,
    );
  }

  if (!payload || !("data" in payload)) {
    throw new ApiError("Invalid server response.", response.status);
  }

  return payload.data;
}
