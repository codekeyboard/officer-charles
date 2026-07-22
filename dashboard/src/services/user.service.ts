import api, { unwrap } from "./api";
import type { InterviewSummary, Notification, Paginated, UsageSummary, UserProfile } from "./types";

export const userService = {
  getProfile: () => api.get("/users/me").then(unwrap<UserProfile>),
  updateProfile: (data: unknown) => api.patch("/users/me", data).then(unwrap<UserProfile>),
  getUsage: () => api.get("/users/me/usage").then(unwrap<UsageSummary>),
  getInterviews: (params?: Record<string, unknown>) =>
    api.get("/users/me/interviews", { params }).then(unwrap<Paginated<InterviewSummary>>),
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    api.post("/users/me/change-password", data).then(unwrap<{ changed: boolean }>),
  getNotifications: () =>
    api.get("/users/me/notifications").then(unwrap<{ notifications: Notification[] }>),
  markNotificationRead: (notificationId: string) =>
    api.patch(`/users/me/notifications/${notificationId}/read`).then(unwrap<Notification>),
  markAllNotificationsRead: () =>
    api.patch("/users/me/notifications/read-all").then(unwrap<{ updatedCount: number }>),
};
