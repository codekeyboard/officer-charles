import axios from "axios";

const baseURL =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE_URL) ||
  "/api/v1";

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      console.warn("[api] Unauthorized");
    }
    return Promise.reject(error);
  },
);

export function unwrap<T>(response: { data: { data: T } }): T {
  return response.data.data;
}

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errorCode?: string } | undefined;
    if (data?.errorCode === "ACTIVE_INTERVIEW_EXISTS") {
      return "We found an unfinished interview. Please try starting again.";
    }
    return (
      data?.message ||
      error.message ||
      "Request failed"
    );
  }
  return error instanceof Error ? error.message : "Request failed";
}

export default api;
