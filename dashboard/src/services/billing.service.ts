import api, { unwrap } from "./api";
import type { Payment, Plan, Subscription } from "./types";

export const billingService = {
  getPlans: () => api.get("/plans").then(unwrap<Plan[]>),
  getSubscription: () => api.get("/billing/subscription").then(unwrap<Subscription>),
  getBillingStatus: () => api.get("/billing/status").then(unwrap<Subscription>),
  createCheckout: ({ planKey, provider = "stripe" }: { planKey: string; provider?: "stripe" | "paystack" }) =>
    api
      .post(
        "/billing/checkout",
        { planKey, provider },
        { headers: { "Idempotency-Key": makeIdempotencyKey(`checkout:${provider}`, planKey) } },
      )
      .then(
        unwrap<{
          checkoutUrl: string;
          sessionId?: string;
          reference?: string;
          paymentId: string;
          planKey: string;
          provider: "stripe" | "paystack";
        }>,
      ),
  syncCheckout: (sessionId: string) =>
    api
      .post("/billing/checkout/sync", { sessionId })
      .then(
        unwrap<{
          synced: boolean;
          sessionId: string;
          status: string;
          paymentStatus?: string | null;
        }>,
      ),
  verifyPaystack: (reference: string) =>
    api
      .post("/billing/paystack/verify", { reference })
      .then(
        unwrap<{
          synced: boolean;
          reference: string;
          status: string;
          paymentStatus?: string | null;
        }>,
      ),
  changePlan: (planKey: string) =>
    api
      .post(
        "/billing/change-plan",
        { planKey },
        { headers: { "Idempotency-Key": makeIdempotencyKey("change", planKey) } },
      )
      .then(unwrap<{ requested: boolean; planKey: string; mode: "upgrade" | "downgrade" }>),
  createPortal: () => api.post("/billing/portal").then(unwrap<{ portalUrl: string }>),
  getBillingHistory: () => api.get("/billing/history").then(unwrap<{ payments: Payment[] }>),
  cancelSubscription: () => api.post("/billing/cancel").then(unwrap<Subscription>),
};

function makeIdempotencyKey(action: string, key: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  return `${action}:${key}:${random}`;
}
