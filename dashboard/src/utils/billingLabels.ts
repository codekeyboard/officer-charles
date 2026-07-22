import type { Subscription } from "@/services/types";

const PACK_NAMES: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  premium: "Premium",
};

export function getPackLabel(subscription?: Subscription | null) {
  if (subscription?.plan?.name) return subscription.plan.name;
  if (subscription?.planKey && PACK_NAMES[subscription.planKey])
    return PACK_NAMES[subscription.planKey];

  const purchased = Number(subscription?.lifetimePurchasedCredits || 0);
  if (purchased >= 500) return "Premium";
  if (purchased >= 300) return "Pro";
  if (purchased >= 100) return "Starter";

  return "Free";
}

export function getCreditLabel(subscription?: Subscription | null, fallback = "Credits") {
  return typeof subscription?.availableCredits === "number"
    ? `${subscription.availableCredits} credits`
    : fallback;
}
