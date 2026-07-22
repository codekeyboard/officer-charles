import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Check, CreditCard, Landmark, Sparkles } from "lucide-react";
import { Topbar } from "@/components/topbar/Topbar";
import { PageHeader } from "@/components/common/PageHeader";
import { GradientButton } from "@/components/common/GradientButton";
import { SmartNotice } from "@/components/common/SmartNotice";
import { billingService } from "@/services/billing.service";
import { errorMessage } from "@/services/api";
import type { Plan } from "@/services/types";

export const Route = createFileRoute("/user/billing")({
  head: () => ({ meta: [{ title: "Billing · Officer Charles" }] }),
  component: Billing,
});

function Billing() {
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState<"stripe" | "paystack">("stripe");
  const plans = useQuery({ queryKey: ["plans"], queryFn: billingService.getPlans });
  const subscription = useQuery({
    queryKey: ["subscription"],
    queryFn: billingService.getBillingStatus,
  });
  const history = useQuery({
    queryKey: ["billing-history"],
    queryFn: billingService.getBillingHistory,
  });
  const checkout = useMutation({
    mutationFn: billingService.createCheckout,
    onSuccess: (data) => {
      window.location.href = data.checkoutUrl;
    },
  });
  const syncCheckout = useMutation({
    mutationFn: billingService.syncCheckout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["billing-history"] });
    },
  });
  const syncPaystack = useMutation({
    mutationFn: billingService.verifyPaystack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["billing-history"] });
    },
  });
  const stripeUnavailable = Boolean(subscription.data?.stripeConfigured === false);
  const paystackUnavailable = Boolean(subscription.data?.paystackConfigured === false);
  const providerUnavailable = provider === "stripe" ? stripeUnavailable : paystackUnavailable;
  const providerLabel = provider === "stripe" ? "Stripe" : "Mobile Money";
  const pendingCheckoutPlan = checkout.isPending ? checkout.variables?.planKey : null;
  const visiblePayments = (history.data?.payments || []).filter((payment) =>
    ["paid", "failed"].includes(String(payment.status || "").toLowerCase()),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (
      params.get("stripe") !== "success" ||
      !sessionId ||
      syncCheckout.isPending ||
      syncCheckout.isSuccess
    )
      return;
    syncCheckout.mutate(sessionId);
  }, [syncCheckout]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");
    if (
      params.get("paystack") !== "success" ||
      !reference ||
      syncPaystack.isPending ||
      syncPaystack.isSuccess
    )
      return;
    syncPaystack.mutate(reference);
  }, [syncPaystack]);

  return (
    <>
      <Topbar title="Billing" />
      <PageHeader
        title="Credits"
        subtitle="Buy credits and spend them on chat interview practice."
      />
      {(plans.isError || subscription.isError || history.isError || checkout.isError || syncPaystack.isError || syncCheckout.isError) && (
        <State
          text={friendlyBillingError(
            plans.error || subscription.error || history.error || checkout.error || syncPaystack.error || syncCheckout.error,
          )}
        />
      )}
      {providerUnavailable && (
        <State text={`${providerLabel} is not configured yet. Credit packs are visible, but checkout is disabled for this payment method.`} />
      )}
      {syncCheckout.isPending && <State text="Confirming your Stripe payment..." />}
      {syncCheckout.isSuccess && (
        <State text="Stripe payment confirmed. Credits and billing history are refreshed." />
      )}
      {syncPaystack.isPending && <State text="Confirming your Mobile Money payment..." />}
      {syncPaystack.isSuccess && (
        <State text="Mobile Money payment confirmed. Credits and billing history are refreshed." />
      )}
      {plans.isLoading && <State text="Loading plans..." />}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <PaymentMethodButton
          active={provider === "stripe"}
          icon={<CreditCard className="h-4 w-4" />}
          label="Stripe"
          onClick={() => setProvider("stripe")}
        />
        <PaymentMethodButton
          active={provider === "paystack"}
          icon={<Landmark className="h-4 w-4" />}
          label="Mobile Money"
          onClick={() => setProvider("paystack")}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.data?.map((plan) => {
          const planKey = plan.key || plan.id;
          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              pending={pendingCheckoutPlan === planKey}
              disabled={checkout.isPending && pendingCheckoutPlan !== planKey}
              providerUnavailable={providerUnavailable}
              providerLabel={providerLabel}
              provider={provider}
              onCheckout={() => checkout.mutate({ planKey, provider })}
            />
          );
        })}
      </div>

      <div className="mt-6 dashboard-card p-5">
        <div className="text-sm font-semibold">Billing history</div>
        {history.isLoading && (
          <div className="mt-3 text-xs text-muted-foreground">Loading payments...</div>
        )}
        {visiblePayments.length === 0 && !history.isLoading && (
          <div className="mt-3 text-xs text-muted-foreground">No payments yet.</div>
        )}
        {Boolean(visiblePayments.length) && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-widest text-muted-foreground">
                  {["Date", "Provider", "Amount", "Status"].map((header) => (
                    <th key={header} className="pb-3 text-left font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visiblePayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="py-3">
                      {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3">{payment.provider}</td>
                    <td className="py-3">{formatMoney(payment.amount, payment.currency)}</td>
                    <td className="py-3">{payment.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function PlanCard({
  plan,
  pending,
  disabled,
  providerUnavailable,
  providerLabel,
  provider,
  onCheckout,
}: {
  plan: Plan;
  pending: boolean;
  disabled: boolean;
  providerUnavailable: boolean;
  providerLabel: string;
  provider: "stripe" | "paystack";
  onCheckout: () => void;
}) {
  const recommended = plan.name.toLowerCase() === "pro";
  const label = pending ? "Creating checkout..." : "Buy credits";
  const displayPrice = provider === "paystack"
    ? plan.paystackFormattedPrice || formatMoney(plan.paystackPrice ?? plan.price, plan.paystackCurrency || plan.currency)
    : plan.formattedPrice || formatMoney(plan.price, plan.currency);
  return (
    <div
      className={`dashboard-card relative overflow-hidden p-6 ${recommended ? "border-primary/40 purple-glow" : ""}`}
    >
      {recommended && (
        <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full purple-gradient px-2 py-0.5 text-[10px] font-semibold text-white">
          <Sparkles className="h-3 w-3" /> Popular
        </div>
      )}
      <div className="text-sm text-muted-foreground">{plan.name}</div>
      <div className="mt-2 text-4xl font-semibold">
        {displayPrice}
      </div>
      <ul className="mt-5 space-y-2 text-sm">
        {(plan.features?.length
          ? plan.features
          : [`${plan.creditAmount ?? plan.chatLimit} credits`]
        ).map((feature) => (
          <Feature key={feature}>{feature}</Feature>
        ))}
      </ul>
      <GradientButton
        className="mt-6 w-full"
        variant={recommended ? "primary" : "outline"}
        disabled={pending || disabled || providerUnavailable}
        onClick={onCheckout}
      >
        {providerUnavailable ? `${providerLabel} not configured` : label}
      </GradientButton>
    </div>
  );
}

function PaymentMethodButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-primary/50 bg-primary/15 text-foreground"
          : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Feature({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-muted-foreground">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>{children}</span>
    </li>
  );
}

function State({ text, tone = "default" }: { text: string; tone?: "default" | "warning" }) {
  return <SmartNotice text={text} tone={tone === "warning" ? "warning" : "info"} />;
}

function formatMoney(amount: number | string, currency = "usd") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(Number(amount || 0));
}

function friendlyBillingError(error: unknown) {
  const message = errorMessage(error);
  if (
    message.toLowerCase().includes("stripe is not configured") ||
    message.toLowerCase().includes("stripe price") ||
    message.toLowerCase().includes("paystack is not configured")
  ) {
    return "That payment method is not configured yet. Add the provider keys on the backend to enable checkout.";
  }
  return message;
}
