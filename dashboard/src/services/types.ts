export type Role = "user" | "admin" | "development";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status?: string;
  plan?: string;
  country?: string | null;
  targetVisa?: string | null;
}

export interface AuthSession {
  user: AuthUser;
  accessToken?: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
}

export interface UserProfile extends AuthUser {
  country: string | null;
  targetVisa: string | null;
}

export interface UsageSummary {
  freeChatLimit: number;
  freeLiveLimit: number;
  usedChat: number;
  usedLive: number;
  remainingChat: number;
  remainingLive: number;
  subscription: {
    plan: string;
    chatRemaining: number;
    liveRemaining: number;
    availableCredits?: number;
    lifetimePurchasedCredits?: number;
    lifetimeUsedCredits?: number;
    creditCosts?: Record<string, number | null>;
  };
  buckets?: {
    chatTraining: UsageBucket;
    chatSimulation: UsageBucket;
    liveTraining: UsageBucket;
    liveSimulation: UsageBucket;
  };
}

export interface UsageBucket {
  limit: number;
  used: number;
  remaining: number;
}

export interface InterviewSummary {
  id: string;
  interviewId?: string;
  interviewType: "CHAT" | "LIVE";
  visaType: string;
  mode: string;
  status: string;
  currentQuestion?: string | null;
  finalScore?: number | null;
  finalFeedback?: string | null;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  finalEvaluation?: unknown;
  startedAt?: string;
  endedAt?: string | null;
  createdAt?: string | null;
}

export interface Paginated<T> {
  page: number;
  limit: number;
  total: number;
  items: T[];
}

export interface InterviewMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  question?: string | null;
  score?: number | null;
  feedback?: unknown;
  createdAt?: string;
}

export interface Plan {
  id: string;
  key?: string;
  name: string;
  price: number | string;
  formattedPrice?: string;
  priceCents?: number;
  currency?: string;
  paystackPrice?: number | string;
  paystackFormattedPrice?: string;
  paystackPriceCents?: number;
  paystackCurrency?: string;
  billingInterval?: string;
  creditAmount?: number;
  chatLimit: number;
  liveLimit: number;
  features?: string[];
  active?: boolean;
  stripeConfigured?: boolean;
  paystackConfigured?: boolean;
}

export interface AdminUserRef {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: Role | string | null;
  status?: string | null;
}

export interface Subscription {
  id?: string;
  userId?: string;
  user?: AdminUserRef | null;
  status: string;
  plan?: Plan | null;
  planId?: string | null;
  planKey?: string | null;
  stripeSubscriptionId?: string | null;
  stripeSubscriptionItemId?: string | null;
  stripePriceId?: string | null;
  chatRemaining?: number;
  liveRemaining?: number;
  availableCredits?: number;
  lifetimePurchasedCredits?: number;
  lifetimeGrantedCredits?: number;
  lifetimeUsedCredits?: number;
  creditCosts?: Record<string, number | null>;
  chatLimit?: number;
  liveLimit?: number;
  chatUsed?: number;
  liveUsed?: number;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  cancelAtPeriodEnd?: boolean;
  paymentRequired?: boolean;
  stripeConfigured?: boolean;
  paystackConfigured?: boolean;
  usage?: {
    periodStart?: string;
    periodEnd?: string;
    chatLimit: number;
    liveLimit: number;
    chatUsed: number;
    liveUsed: number;
    chatRemaining: number;
    liveRemaining: number;
  } | null;
}

export interface Payment {
  id: string;
  userId?: string;
  user?: AdminUserRef | null;
  planId?: string | null;
  plan?: Plan | null;
  planKey?: string | null;
  planName?: string | null;
  amount: number | string;
  amountCents?: number;
  currency?: string;
  provider: string;
  status: string;
  checkoutUrl?: string;
  stripeCheckoutSessionId?: string | null;
  stripeInvoiceId?: string | null;
  stripePaymentIntentId?: string | null;
  paystackReference?: string | null;
  paystackTransactionId?: string | null;
  paystackCustomerCode?: string | null;
  failureReason?: string | null;
  paidAt?: string | null;
  createdAt?: string;
}

export interface Notification {
  id: string;
  title: string;
  body?: string | null;
  type: string;
  readAt?: string | null;
  createdAt?: string;
}
