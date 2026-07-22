import api, { unwrap } from "./api";

export const aiService = {
  getUsageSummary: () => api.get("/admin/ai-usage").then(unwrap<any>),
  getUsageByModel: () => api.get("/admin/ai-usage").then(unwrap<any>),
  getTokenTrend: (_params?: Record<string, unknown>) =>
    api.get("/admin/ai-usage").then(unwrap<any>),
};
