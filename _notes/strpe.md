Your plans should be implemented as **three monthly Stripe subscription products**, with interview allowances enforced by your Express.js application and database.

## Your plan configuration

| Plan    | Monthly price | Chat interviews | Live interviews |
| ------- | ------------: | --------------: | --------------: |
| Starter |         $9.99 |               5 |               0 |
| Pro     |        $29.99 |              20 |               5 |
| Premium |        $59.99 |              60 |              20 |

Each plan includes:

* Saved evaluations
* Billing history
* Monthly automatic renewal
* Access until the current paid billing period ends after cancellation

Because each tier grants different features, creating three Stripe products—Starter, Pro, and Premium—is the cleanest setup. Each product should have one recurring monthly Price. Stripe models the service as a Product and the billing amount and interval as a Price. ([Stripe Docs][1])

---

# 1. Create the products in Stripe

In Stripe Dashboard:

```text
Product name: Starter
Price: $9.99 USD
Billing period: Monthly
```

```text
Product name: Pro
Price: $29.99 USD
Billing period: Monthly
```

```text
Product name: Premium
Price: $59.99 USD
Billing period: Monthly
```

After creating them, Stripe gives you three Price IDs:

```env
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_PREMIUM=price_...
```

Use the **Price IDs**, not the Product IDs, when creating Checkout Sessions.

---

# 2. Environment variables

```env
PORT=4000
NODE_ENV=development

FRONTEND_URL=http://localhost:3000

STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_PREMIUM=price_...
```

Your frontend may receive the publishable key, but the secret key and webhook secret must remain only on your Express server.

---

# 3. Backend plan configuration

Create:

```js
// src/config/plans.js

export const PLANS = Object.freeze({
  starter: {
    key: "starter",
    name: "Starter",
    price: 999,
    currency: "usd",
    billingInterval: "month",
    stripePriceId: process.env.STRIPE_PRICE_STARTER,
    limits: {
      chatInterviews: 5,
      liveInterviews: 0,
    },
    features: {
      savedEvaluations: true,
      billingHistory: true,
    },
  },

  pro: {
    key: "pro",
    name: "Pro",
    price: 2999,
    currency: "usd",
    billingInterval: "month",
    stripePriceId: process.env.STRIPE_PRICE_PRO,
    limits: {
      chatInterviews: 20,
      liveInterviews: 5,
    },
    features: {
      savedEvaluations: true,
      billingHistory: true,
    },
  },

  premium: {
    key: "premium",
    name: "Premium",
    price: 5999,
    currency: "usd",
    billingInterval: "month",
    stripePriceId: process.env.STRIPE_PRICE_PREMIUM,
    limits: {
      chatInterviews: 60,
      liveInterviews: 20,
    },
    features: {
      savedEvaluations: true,
      billingHistory: true,
    },
  },
});

export function getPlan(planKey) {
  const normalizedKey = String(planKey || "").toLowerCase();
  const plan = PLANS[normalizedKey];

  if (!plan || !plan.stripePriceId) {
    return null;
  }

  return plan;
}

export function getPlanByPriceId(priceId) {
  return (
    Object.values(PLANS).find(
      (plan) => plan.stripePriceId === priceId
    ) || null
  );
}
```

The frontend sends only this:

```json
{
  "planKey": "pro"
}
```

It must not send this:

```json
{
  "amount": 2999,
  "currency": "usd",
  "chatInterviews": 20
}
```

Otherwise, a user could modify the frontend request and attempt to select Premium limits while paying the Starter amount.

---

# 4. Return plans to the frontend

```js
// src/controllers/billing.controller.js

import { PLANS } from "../config/plans.js";

export function getPublicPlans(req, res) {
  const plans = Object.values(PLANS).map((plan) => ({
    key: plan.key,
    name: plan.name,
    price: plan.price,
    formattedPrice: `$${(plan.price / 100).toFixed(2)}`,
    currency: plan.currency,
    billingInterval: plan.billingInterval,
    limits: plan.limits,
    features: plan.features,
  }));

  return res.status(200).json({
    success: true,
    plans,
  });
}
```

Route:

```js
router.get("/plans", getPublicPlans);
```

Frontend response:

```json
{
  "success": true,
  "plans": [
    {
      "key": "starter",
      "name": "Starter",
      "price": 999,
      "formattedPrice": "$9.99",
      "currency": "usd",
      "billingInterval": "month",
      "limits": {
        "chatInterviews": 5,
        "liveInterviews": 0
      }
    }
  ]
}
```

---

# 5. Recommended database structure

## User model

```js
{
  _id: ObjectId,
  name: String,
  email: String,

  stripeCustomerId: String,

  subscription: {
    stripeSubscriptionId: String,
    stripePriceId: String,

    planKey: String,

    status: String,

    currentPeriodStart: Date,
    currentPeriodEnd: Date,

    cancelAtPeriodEnd: Boolean,
    canceledAt: Date
  },

  usage: {
    periodStart: Date,
    periodEnd: Date,

    chatInterviewsUsed: Number,
    liveInterviewsUsed: Number
  }
}
```

For a larger application, place subscriptions and usage records in separate collections or tables.

## Recommended separate usage record

```js
{
  userId: ObjectId,

  stripeSubscriptionId: String,

  planKey: "pro",

  periodStart: Date,
  periodEnd: Date,

  chatLimit: 20,
  liveLimit: 5,

  chatUsed: 7,
  liveUsed: 2,

  createdAt: Date,
  updatedAt: Date
}
```

Add this unique index:

```js
{
  userId: 1,
  periodStart: 1,
  periodEnd: 1
}
```

This prevents duplicate usage periods.

---

# 6. Create a Stripe Customer

```js
// src/services/stripeCustomer.service.js

import { stripe } from "../config/stripe.js";
import User from "../models/User.js";

export async function getOrCreateStripeCustomer(user) {
  if (user.stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(
        user.stripeCustomerId
      );

      if (!customer.deleted) {
        return customer.id;
      }
    } catch (error) {
      if (error.code !== "resource_missing") {
        throw error;
      }
    }
  }

  const customer = await stripe.customers.create(
    {
      email: user.email,
      name: user.name || undefined,

      metadata: {
        userId: String(user._id),
      },
    },
    {
      idempotencyKey: `customer-create-${user._id}`,
    }
  );

  await User.updateOne(
    {
      _id: user._id,
    },
    {
      $set: {
        stripeCustomerId: customer.id,
      },
    }
  );

  return customer.id;
}
```

Use one Stripe Customer per application user. This keeps their invoices, subscriptions, payment methods, and portal history associated with the same customer.

---

# 7. Create the Checkout Session

Stripe Checkout supports recurring Prices through a Checkout Session using `mode: "subscription"`. ([Stripe Docs][2])

```js
// src/controllers/billing.controller.js

import crypto from "node:crypto";
import { stripe } from "../config/stripe.js";
import { getPlan } from "../config/plans.js";
import { getOrCreateStripeCustomer } from "../services/stripeCustomer.service.js";

export async function createCheckoutSession(req, res, next) {
  try {
    const { planKey } = req.body;

    const selectedPlan = getPlan(planKey);

    if (!selectedPlan) {
      return res.status(400).json({
        success: false,
        code: "INVALID_PLAN",
        message: "The selected plan does not exist.",
      });
    }

    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        code: "AUTHENTICATION_REQUIRED",
        message: "Please sign in before purchasing a plan.",
      });
    }

    const activeStatuses = [
      "active",
      "trialing",
      "past_due",
      "incomplete",
      "paused",
    ];

    if (
      user.subscription?.stripeSubscriptionId &&
      activeStatuses.includes(user.subscription.status)
    ) {
      return res.status(409).json({
        success: false,
        code: "EXISTING_SUBSCRIPTION",
        message:
          "You already have a subscription. Use the change-plan option instead.",
      });
    }

    const stripeCustomerId =
      await getOrCreateStripeCustomer(user);

    const requestId =
      req.get("Idempotency-Key") || crypto.randomUUID();

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",

        customer: stripeCustomerId,

        line_items: [
          {
            price: selectedPlan.stripePriceId,
            quantity: 1,
          },
        ],

        success_url:
          `${process.env.FRONTEND_URL}/billing/success` +
          "?session_id={CHECKOUT_SESSION_ID}",

        cancel_url:
          `${process.env.FRONTEND_URL}/pricing` +
          "?payment=cancelled",

        client_reference_id: String(user._id),

        metadata: {
          userId: String(user._id),
          planKey: selectedPlan.key,
        },

        subscription_data: {
          metadata: {
            userId: String(user._id),
            planKey: selectedPlan.key,
          },
        },

        allow_promotion_codes: true,

        billing_address_collection: "auto",

        customer_update: {
          name: "auto",
          address: "auto",
        },
      },
      {
        idempotencyKey:
          `checkout-${user._id}-${requestId}`,
      }
    );

    return res.status(201).json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    next(error);
  }
}
```

The success page is only for displaying confirmation. Do not activate the plan from the success page. Subscription access should be activated from verified Stripe webhook events because webhook state remains authoritative even if the customer closes the browser before returning to your site. Stripe’s subscription guidance relies on webhook events for provisioning and de-provisioning access. ([Stripe Docs][3])

---

# 8. Frontend Upgrade button

```jsx
async function upgradePlan(planKey) {
  try {
    const requestId = crypto.randomUUID();

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/billing/checkout`,
      {
        method: "POST",
        credentials: "include",

        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": requestId,
        },

        body: JSON.stringify({
          planKey,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "Unable to start checkout."
      );
    }

    window.location.href = result.checkoutUrl;
  } catch (error) {
    console.error(error);

    alert(
      error.message ||
        "Payment could not be started. Please try again."
    );
  }
}
```

Example buttons:

```jsx
<button onClick={() => upgradePlan("starter")}>
  Choose Starter
</button>

<button onClick={() => upgradePlan("pro")}>
  Choose Pro
</button>

<button onClick={() => upgradePlan("premium")}>
  Choose Premium
</button>
```

For the user’s current plan, show:

```text
Current Plan
```

For a higher plan:

```text
Upgrade
```

For a lower plan:

```text
Downgrade
```

---

# 9. Correct webhook middleware order

Stripe webhook verification requires the original raw request body.

```js
import express from "express";
import { stripeWebhook } from "./controllers/webhook.controller.js";

const app = express();

app.post(
  "/api/stripe/webhook",
  express.raw({
    type: "application/json",
  }),
  stripeWebhook
);

// This must come after the Stripe webhook route.
app.use(express.json());
```

---

# 10. Subscription webhook

You should at minimum process:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
```

Stripe sends `customer.subscription.updated` for subscription and plan changes. Stripe also recommends responding to invoice and subscription webhooks to determine whether access should remain enabled. ([Stripe Docs][3])

```js
// src/controllers/webhook.controller.js

import { stripe } from "../config/stripe.js";
import { getPlanByPriceId } from "../config/plans.js";
import User from "../models/User.js";
import SubscriptionUsage from "../models/SubscriptionUsage.js";
import StripeEvent from "../models/StripeEvent.js";

function getCustomerId(customer) {
  return typeof customer === "string"
    ? customer
    : customer?.id;
}

function getPeriod(subscription) {
  const firstItem = subscription.items?.data?.[0];

  const periodStart =
    firstItem?.current_period_start ??
    subscription.current_period_start;

  const periodEnd =
    firstItem?.current_period_end ??
    subscription.current_period_end;

  return {
    periodStart: periodStart
      ? new Date(periodStart * 1000)
      : null,

    periodEnd: periodEnd
      ? new Date(periodEnd * 1000)
      : null,
  };
}

async function syncSubscription(subscription) {
  const stripeCustomerId = getCustomerId(
    subscription.customer
  );

  const subscriptionItem =
    subscription.items?.data?.[0];

  const stripePriceId =
    typeof subscriptionItem?.price === "string"
      ? subscriptionItem.price
      : subscriptionItem?.price?.id;

  const plan = getPlanByPriceId(stripePriceId);

  if (!plan) {
    throw new Error(
      `Unknown Stripe price: ${stripePriceId}`
    );
  }

  const { periodStart, periodEnd } =
    getPeriod(subscription);

  const user = await User.findOne({
    stripeCustomerId,
  });

  if (!user) {
    throw new Error(
      `User not found for Stripe customer ${stripeCustomerId}`
    );
  }

  await User.updateOne(
    {
      _id: user._id,
    },
    {
      $set: {
        "subscription.stripeSubscriptionId":
          subscription.id,

        "subscription.stripePriceId":
          stripePriceId,

        "subscription.planKey":
          plan.key,

        "subscription.status":
          subscription.status,

        "subscription.currentPeriodStart":
          periodStart,

        "subscription.currentPeriodEnd":
          periodEnd,

        "subscription.cancelAtPeriodEnd":
          subscription.cancel_at_period_end,

        "subscription.canceledAt":
          subscription.canceled_at
            ? new Date(
                subscription.canceled_at * 1000
              )
            : null,
      },
    }
  );

  if (periodStart && periodEnd) {
    await SubscriptionUsage.updateOne(
      {
        userId: user._id,
        periodStart,
        periodEnd,
      },
      {
        $setOnInsert: {
          stripeSubscriptionId:
            subscription.id,

          planKey: plan.key,

          chatLimit:
            plan.limits.chatInterviews,

          liveLimit:
            plan.limits.liveInterviews,

          chatUsed: 0,
          liveUsed: 0,
        },

        $set: {
          planKey: plan.key,

          chatLimit:
            plan.limits.chatInterviews,

          liveLimit:
            plan.limits.liveInterviews,
        },
      },
      {
        upsert: true,
      }
    );
  }
}

async function handleEvent(event) {
  const object = event.data.object;

  switch (event.type) {
    case "checkout.session.completed": {
      if (object.subscription) {
        const subscriptionId =
          typeof object.subscription === "string"
            ? object.subscription
            : object.subscription.id;

        const subscription =
          await stripe.subscriptions.retrieve(
            subscriptionId
          );

        await syncSubscription(subscription);
      }

      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      await syncSubscription(object);
      break;
    }

    case "customer.subscription.deleted": {
      const stripeCustomerId = getCustomerId(
        object.customer
      );

      await User.updateOne(
        {
          stripeCustomerId,
        },
        {
          $set: {
            "subscription.status": "canceled",
            "subscription.cancelAtPeriodEnd": false,
            "subscription.canceledAt": new Date(),
          },
        }
      );

      break;
    }

    case "invoice.paid": {
      const subscriptionId =
        object.parent?.subscription_details
          ?.subscription ||
        object.subscription;

      if (subscriptionId) {
        const subscription =
          await stripe.subscriptions.retrieve(
            subscriptionId
          );

        await syncSubscription(subscription);
      }

      break;
    }

    case "invoice.payment_failed": {
      const stripeCustomerId = getCustomerId(
        object.customer
      );

      await User.updateOne(
        {
          stripeCustomerId,
        },
        {
          $set: {
            "subscription.status": "past_due",
          },
        }
      );

      break;
    }

    default:
      console.log(
        `Unhandled Stripe event: ${event.type}`
      );
  }
}

export async function stripeWebhook(req, res) {
  const signature = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error(
      "Stripe webhook signature failed:",
      error.message
    );

    return res.status(400).send(
      "Invalid Stripe webhook signature."
    );
  }

  try {
    const existingEvent = await StripeEvent.findOne({
      stripeEventId: event.id,
    });

    if (existingEvent) {
      return res.sendStatus(200);
    }

    await handleEvent(event);

    await StripeEvent.create({
      stripeEventId: event.id,
      eventType: event.type,
      processedAt: new Date(),
    });

    return res.sendStatus(200);
  } catch (error) {
    console.error("Webhook processing failed:", {
      eventId: event.id,
      eventType: event.type,
      message: error.message,
    });

    return res.sendStatus(500);
  }
}
```

Stripe webhook deliveries can be duplicated or arrive in an order your application does not expect, so store each processed Event ID and make handlers idempotent. For heavier processing, Stripe recommends acknowledging the webhook quickly and processing work through a queue. ([Stripe Docs][4])

---

# 11. Enforce the interview limits

Stripe handles billing, but **your backend must enforce the 5, 20, or 60 interview limits**.

Never enforce limits only in React. Users can bypass frontend restrictions by calling your API directly.

## General subscription middleware

```js
// src/middleware/requireActiveSubscription.js

const ACCESSIBLE_STATUSES = new Set([
  "active",
  "trialing",
]);

export function requireActiveSubscription(
  req,
  res,
  next
) {
  const subscription = req.user?.subscription;

  if (
    !subscription ||
    !ACCESSIBLE_STATUSES.has(subscription.status)
  ) {
    return res.status(403).json({
      success: false,
      code: "ACTIVE_SUBSCRIPTION_REQUIRED",
      message:
        "An active subscription is required.",
    });
  }

  if (
    subscription.currentPeriodEnd &&
    new Date(subscription.currentPeriodEnd) <=
      new Date()
  ) {
    return res.status(403).json({
      success: false,
      code: "SUBSCRIPTION_PERIOD_ENDED",
      message:
        "Your current subscription period has ended.",
    });
  }

  next();
}
```

---

# 12. Atomically consume a chat interview

The usage check and increment must happen in one database operation. Otherwise, simultaneous requests could both see available capacity and exceed the plan.

```js
// src/services/usage.service.js

import SubscriptionUsage from "../models/SubscriptionUsage.js";

export async function consumeChatInterview(user) {
  const usage =
    await SubscriptionUsage.findOneAndUpdate(
      {
        userId: user._id,

        periodStart: {
          $lte: new Date(),
        },

        periodEnd: {
          $gt: new Date(),
        },

        $expr: {
          $lt: [
            "$chatUsed",
            "$chatLimit",
          ],
        },
      },
      {
        $inc: {
          chatUsed: 1,
        },
      },
      {
        new: true,
      }
    );

  if (!usage) {
    const error = new Error(
      "You have reached your monthly chat interview limit."
    );

    error.statusCode = 403;
    error.code =
      "CHAT_INTERVIEW_LIMIT_REACHED";

    throw error;
  }

  return usage;
}
```

Use it when creating an interview:

```js
export async function createChatInterview(
  req,
  res,
  next
) {
  try {
    const usage = await consumeChatInterview(
      req.user
    );

    try {
      const interview =
        await ChatInterview.create({
          userId: req.user._id,
          // Other interview information
        });

      return res.status(201).json({
        success: true,
        interview,

        usage: {
          used: usage.chatUsed,
          limit: usage.chatLimit,
          remaining:
            usage.chatLimit - usage.chatUsed,
        },
      });
    } catch (error) {
      /*
       * Compensate if creation fails after usage
       * was reserved.
       */
      await SubscriptionUsage.updateOne(
        {
          _id: usage._id,
          chatUsed: {
            $gt: 0,
          },
        },
        {
          $inc: {
            chatUsed: -1,
          },
        }
      );

      throw error;
    }
  } catch (error) {
    next(error);
  }
}
```

For stronger consistency, use a MongoDB transaction or SQL transaction that both reserves the usage and creates the interview.

---

# 13. Atomically consume a live interview

```js
export async function consumeLiveInterview(user) {
  const usage =
    await SubscriptionUsage.findOneAndUpdate(
      {
        userId: user._id,

        periodStart: {
          $lte: new Date(),
        },

        periodEnd: {
          $gt: new Date(),
        },

        $expr: {
          $lt: [
            "$liveUsed",
            "$liveLimit",
          ],
        },
      },
      {
        $inc: {
          liveUsed: 1,
        },
      },
      {
        new: true,
      }
    );

  if (!usage) {
    const error = new Error(
      "Your plan does not include another live interview this billing period."
    );

    error.statusCode = 403;
    error.code =
      "LIVE_INTERVIEW_LIMIT_REACHED";

    throw error;
  }

  return usage;
}
```

This automatically blocks Starter users because their `liveLimit` is `0`.

---

# 14. Usage status endpoint

```js
export async function getBillingStatus(
  req,
  res,
  next
) {
  try {
    const usage =
      await SubscriptionUsage.findOne({
        userId: req.user._id,

        periodStart: {
          $lte: new Date(),
        },

        periodEnd: {
          $gt: new Date(),
        },
      }).lean();

    return res.status(200).json({
      success: true,

      subscription: {
        planKey:
          req.user.subscription?.planKey,

        status:
          req.user.subscription?.status,

        currentPeriodStart:
          req.user.subscription
            ?.currentPeriodStart,

        currentPeriodEnd:
          req.user.subscription
            ?.currentPeriodEnd,

        cancelAtPeriodEnd:
          req.user.subscription
            ?.cancelAtPeriodEnd,
      },

      usage: usage
        ? {
            chatInterviews: {
              used: usage.chatUsed,
              limit: usage.chatLimit,
              remaining: Math.max(
                0,
                usage.chatLimit -
                  usage.chatUsed
              ),
            },

            liveInterviews: {
              used: usage.liveUsed,
              limit: usage.liveLimit,
              remaining: Math.max(
                0,
                usage.liveLimit -
                  usage.liveUsed
              ),
            },
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
}
```

Frontend display:

```text
Chat interviews: 7 of 20 used
Live interviews: 2 of 5 used
Next reset: August 14, 2026
```

The reset should normally follow each customer’s actual Stripe billing period, not automatically reset on the first day of every calendar month.

---

# 15. Upgrading from Starter to Pro or Premium

Do not create another subscription when the user already has one. Update the existing subscription item.

Stripe can calculate prorations when a subscription changes from one Price to another, and Stripe provides invoice preview functionality for displaying the expected charge before committing the change. ([Stripe Docs][5])

```js
export async function changePlan(req, res, next) {
  try {
    const selectedPlan = getPlan(req.body.planKey);

    if (!selectedPlan) {
      return res.status(400).json({
        success: false,
        code: "INVALID_PLAN",
        message: "Invalid subscription plan.",
      });
    }

    const subscriptionId =
      req.user.subscription
        ?.stripeSubscriptionId;

    if (!subscriptionId) {
      return res.status(404).json({
        success: false,
        code: "SUBSCRIPTION_NOT_FOUND",
        message:
          "No existing subscription was found.",
      });
    }

    const subscription =
      await stripe.subscriptions.retrieve(
        subscriptionId
      );

    const subscriptionItem =
      subscription.items.data[0];

    if (!subscriptionItem) {
      return res.status(409).json({
        success: false,
        code:
          "SUBSCRIPTION_ITEM_NOT_FOUND",
        message:
          "The subscription has no billing item.",
      });
    }

    if (
      subscriptionItem.price.id ===
      selectedPlan.stripePriceId
    ) {
      return res.status(409).json({
        success: false,
        code: "PLAN_ALREADY_SELECTED",
        message:
          "You are already subscribed to this plan.",
      });
    }

    const requestId =
      req.get("Idempotency-Key");

    if (!requestId) {
      return res.status(400).json({
        success: false,
        code: "IDEMPOTENCY_KEY_REQUIRED",
        message:
          "An Idempotency-Key header is required.",
      });
    }

    const updatedSubscription =
      await stripe.subscriptions.update(
        subscription.id,
        {
          items: [
            {
              id: subscriptionItem.id,
              price:
                selectedPlan.stripePriceId,
            },
          ],

          proration_behavior:
            "always_invoice",

          payment_behavior:
            "pending_if_incomplete",

          metadata: {
            userId: String(req.user._id),
            planKey: selectedPlan.key,
          },
        },
        {
          idempotencyKey:
            `change-plan-${req.user._id}-${requestId}`,
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Your subscription change is being processed.",
      subscriptionId:
        updatedSubscription.id,
    });
  } catch (error) {
    next(error);
  }
}
```

Using `pending_if_incomplete` is important when an upgrade generates an immediate charge. It helps prevent your application from permanently applying a paid upgrade when the additional payment fails. Stripe documents pending subscription updates for payment-dependent changes. ([Stripe Docs][6])

Your webhook should perform the final database update.

---

# 16. What should happen to interview limits during upgrades?

A clear policy is required.

## Recommended policy

### Upgrade

For example, Starter to Pro:

```text
Existing usage:
3 chat interviews used

Old limit:
5

New limit:
20

After upgrade:
3 of 20 used
17 remaining
```

Do not reset usage to zero during an upgrade. Only increase the limit.

### Downgrade

For example, Premium to Starter:

```text
Existing usage:
12 chat interviews used

New limit:
5
```

Schedule the downgrade for the end of the billing period rather than applying it immediately. That avoids a state where the customer has already used more than the lower plan permits.

For the first implementation, allow:

* Upgrades immediately
* Downgrades at the next renewal
* Cancellation at the next renewal

---

# 17. Customer billing portal

Stripe’s Customer Portal can let customers view invoices, change payment methods, cancel subscriptions, and manage plans depending on how you configure it. ([Stripe Docs][7])

```js
export async function createPortalSession(
  req,
  res,
  next
) {
  try {
    if (!req.user.stripeCustomerId) {
      return res.status(404).json({
        success: false,
        code: "BILLING_ACCOUNT_NOT_FOUND",
        message:
          "This user does not have a billing account.",
      });
    }

    const portal =
      await stripe.billingPortal.sessions.create({
        customer:
          req.user.stripeCustomerId,

        return_url:
          `${process.env.FRONTEND_URL}/settings/billing`,
      });

    return res.status(200).json({
      success: true,
      portalUrl: portal.url,
    });
  } catch (error) {
    next(error);
  }
}
```

---

# 18. Required routes

```js
router.get(
  "/plans",
  getPublicPlans
);

router.post(
  "/checkout",
  requireAuth,
  createCheckoutSession
);

router.get(
  "/status",
  requireAuth,
  getBillingStatus
);

router.post(
  "/change-plan",
  requireAuth,
  changePlan
);

router.post(
  "/portal",
  requireAuth,
  createPortalSession
);
```

Interview routes:

```js
router.post(
  "/chat-interviews",
  requireAuth,
  requireActiveSubscription,
  createChatInterview
);

router.post(
  "/live-interviews",
  requireAuth,
  requireActiveSubscription,
  createLiveInterview
);
```

Webhook:

```js
app.post(
  "/api/stripe/webhook",
  express.raw({
    type: "application/json",
  }),
  stripeWebhook
);
```

---

# 19. Recommended error responses

## Starter attempting a live interview

```json
{
  "success": false,
  "code": "LIVE_INTERVIEW_LIMIT_REACHED",
  "message": "Your Starter plan does not include live interviews.",
  "upgradeRequired": true,
  "recommendedPlan": "pro"
}
```

## Pro user reaches 20 chat interviews

```json
{
  "success": false,
  "code": "CHAT_INTERVIEW_LIMIT_REACHED",
  "message": "You have used all 20 chat interviews for this billing period.",
  "upgradeRequired": true,
  "recommendedPlan": "premium"
}
```

## Payment failed

```json
{
  "success": false,
  "code": "SUBSCRIPTION_PAYMENT_FAILED",
  "message": "Your latest subscription payment was unsuccessful. Please update your payment method."
}
```

## Existing subscription

```json
{
  "success": false,
  "code": "EXISTING_SUBSCRIPTION",
  "message": "You already have an active plan. Use Change Plan instead."
}
```

---

# 20. Final plan cards

Use clearer wording than showing `Upgrade` on every card:

### Starter

```text
Starter
$9.99/month

✓ 5 chat interviews per billing period
— No live interviews
✓ Saved evaluations
✓ Billing history

Choose Starter
```

### Pro

```text
Most Popular

Pro
$29.99/month

✓ 20 chat interviews per billing period
✓ 5 live interviews per billing period
✓ Saved evaluations
✓ Billing history

Choose Pro
```

### Premium

```text
Premium
$59.99/month

✓ 60 chat interviews per billing period
✓ 20 live interviews per billing period
✓ Saved evaluations
✓ Billing history

Choose Premium
```

## Important implementation rule

Stripe should control:

* Payment collection
* Recurring billing
* Invoices
* Subscription status
* Payment retries
* Refund records
* Billing portal

Your Express application and database should control:

* Chat interview usage
* Live interview usage
* Access to saved evaluations
* Feature authorization
* Remaining limits
* Usage reservations
* Business-specific upgrade and downgrade behavior

Stripe Entitlements can represent whether a customer has access to specific features, but your numeric monthly interview counters still need application-level usage tracking unless you redesign them as metered billing. ([Stripe Docs][8])

[1]: https://docs.stripe.com/billing/subscriptions/build-subscriptions?utm_source=chatgpt.com "Build a subscriptions integration"
[2]: https://docs.stripe.com/api/checkout/sessions/create?utm_source=chatgpt.com "Create a Checkout Session | Stripe API Reference"
[3]: https://docs.stripe.com/billing/subscriptions/webhooks?utm_source=chatgpt.com "Using webhooks with subscriptions"
[4]: https://docs.stripe.com/webhooks?utm_source=chatgpt.com "Receive Stripe events in your webhook endpoint"
[5]: https://docs.stripe.com/api/subscriptions/update?utm_source=chatgpt.com "Update a subscription | Stripe API Reference"
[6]: https://docs.stripe.com/billing/subscriptions/pending-updates?utm_source=chatgpt.com "Pending updates"
[7]: https://docs.stripe.com/customer-management/integrate-customer-portal?locale=en-GB&utm_source=chatgpt.com "Integrate the customer portal with the API"
[8]: https://docs.stripe.com/billing/entitlements?utm_source=chatgpt.com "Entitlements"
