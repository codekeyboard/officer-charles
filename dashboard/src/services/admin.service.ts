import api, { unwrap } from "./api";
import type { InterviewSummary, Paginated, Payment, Subscription, UserProfile } from "./types";

export interface AdminDashboard {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  chatInterviews: number;
  liveInterviews: number;
  completedInterviews: number;
  aiUsage: {
    inputTokens: number;
    outputTokens: number;
    audioSeconds: number;
    byModel: unknown[];
  };
}

export interface Question {
  id: string;
  visaType: string;
  questionText: string;
  category: string;
  difficulty: string;
  isActive: boolean;
}

export const adminService = {
  getDashboard: () => api.get("/admin/dashboard").then(unwrap<AdminDashboard>),
  getUsers: (params?: Record<string, unknown>) =>
    api.get("/admin/users", { params }).then(unwrap<Paginated<UserProfile>>),
  getUserDetails: (userId: string) => api.get(`/admin/users/${userId}`).then(unwrap<any>),
  updateUserStatus: (userId: string, status: string) =>
    api.patch(`/admin/users/${userId}/status`, { status }).then(unwrap<UserProfile>),
  getInterviews: (params?: Record<string, unknown>) =>
    api.get("/admin/interviews", { params }).then(unwrap<Paginated<InterviewSummary>>),
  getInterviewDetails: (interviewId: string) =>
    api.get(`/admin/interviews/${interviewId}`).then(unwrap<any>),
  getSubscriptions: () => api.get("/admin/subscriptions").then(unwrap<{ subscriptions: Subscription[]; payments: Payment[] }>),
  getPayments: () => api.get("/admin/payments").then(unwrap<{ payments: Payment[] }>),
  getRevenue: () => api.get("/admin/revenue").then(unwrap<any>),
  getAIUsage: () => api.get("/admin/ai-usage").then(unwrap<any>),
  getSettings: () => api.get("/admin/settings").then(unwrap<Record<string, unknown>>),
  updateSettings: (data: unknown) => api.patch("/admin/settings", data).then(unwrap<Record<string, unknown>>),
  getQuestionBank: () => api.get("/admin/question-bank").then(unwrap<{ questions: Question[] }>),
  createQuestion: (data: unknown) => api.post("/admin/question-bank", data).then(unwrap<Question>),
  updateQuestion: (id: string, data: unknown) => api.patch(`/admin/question-bank/${id}`, data).then(unwrap<Question>),
  deleteQuestion: (id: string) => api.delete(`/admin/question-bank/${id}`).then(unwrap<Question>),
};
