# Paystack integration for your three subscription plans

I checked Paystack’s current official payment, plan, subscription, transaction-verification, webhook, refund, currency, and error documentation.

## Important eligibility finding

Paystack currently supports businesses in specific African markets. Its official API lists supported markets and currencies such as Nigeria, Ghana, Kenya, South Africa, and Côte d’Ivoire. **USD transactions are documented as available for eligible businesses in Nigeria and Kenya**, and USD must be enabled for the merchant account. Pakistan is not listed as a supported Paystack business country. ([Paystack][1])

Therefore:

* A legally eligible Nigerian or Kenyan Paystack business may be able to use your USD prices.
* A Pakistan-only business generally cannot directly open and activate Paystack based on the currently documented supported markets.
* Do not register with inaccurate company or banking information.

---

# 1. Paystack versus Stripe

| Area                      | Stripe                                  | Paystack                                                                                    |
| ------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------- |
| Recurring product         | Product + Price                         | Plan                                                                                        |
| Subscription checkout     | Checkout Session                        | Initialize Transaction with Plan code                                                       |
| Recurring channels        | Multiple, depending on region           | Card, plus Direct Debit in Nigeria                                                          |
| Failed subscription retry | Configurable billing recovery           | Paystack says subscription charges are not retried                                          |
| Customer billing page     | Customer Portal                         | Subscription management link                                                                |
| Subscription cancellation | Subscription API                        | Disable subscription with code and email token                                              |
| Plan changes              | Subscription-item updates and proration | Usually create/switch subscriptions; no Stripe-style per-customer proration flow documented |
| Webhook signature         | Stripe signature secret                 | HMAC SHA-512 using Paystack secret key                                                      |

Paystack subscriptions support cards and Direct Debit for Nigerian businesses. Most importantly, Paystack says that when an automatic subscription charge fails, **it does not automatically retry the subscription charge**. ([Paystack][2])

That means your system must notify the customer and send them to Paystack’s subscription-management page to update their payment method.

---

# 2. Your Paystack plans

Your amounts must be represented in the currency’s smallest unit.

```js
export const PAYSTACK_PLANS = Object.freeze({
  starter: {
    key: "starter",
    name: "Starter",
    amount: 999,
    currency: "USD",
    interval: "monthly",
    chatLimit: 5,
    liveLimit: 0,
    planCode: process.env.PAYSTACK_PLAN_STARTER,
  },

  pro: {
    key: "pro",
    name: "Pro",
    amount: 2999,
    currency: "USD",
    interval: "monthly",
    chatLimit: 20,
    liveLimit: 5,
    planCode: process.env.PAYSTACK_PLAN_PRO,
  },

  premium: {
    key: "premium",
    name: "Premium",
    amount: 5999,
    currency: "USD",
    interval: "monthly",
    chatLimit: 60,
    liveLimit: 20,
    planCode: process.env.PAYSTACK_PLAN_PREMIUM,
  },
});

export function getPaystackPlan(planKey) {
  const normalized = String(planKey || "").toLowerCase();
  const plan = PAYSTACK_PLANS[normalized];

  if (!plan?.planCode) {
    return null;
  }

  return plan;
}

export function getPlanByPaystackCode(planCode) {
  return (
    Object.values(PAYSTACK_PLANS).find(
      (plan) => plan.planCode === planCode
    ) || null
  );
}
```

Paystack expects amounts in subunits. For USD, `$9.99` is sent as `999`, `$29.99` as `2999`, and `$59.99` as `5999`. ([Paystack][3])

---

# 3. Environment variables

```env
PORT=4000
NODE_ENV=development

FRONTEND_URL=http://localhost:3000

PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...

PAYSTACK_PLAN_STARTER=PLN_...
PAYSTACK_PLAN_PRO=PLN_...
PAYSTACK_PLAN_PREMIUM=PLN_...
```

Only the public key may be exposed to the frontend. All Paystack API requests that use the secret key must be made from Express.

---

# 4. Create the plans once

Paystack Plans contain the subscription amount, currency, billing interval, invoice settings, and optional invoice limit. Valid intervals include monthly, quarterly, biannually, and annually. Leaving `invoice_limit` unset allows billing to continue until cancellation. ([Paystack][4])

Run this as an administration script once:

```js
// scripts/create-paystack-plans.js

const plans = [
  {
    key: "starter",
    name: "Starter",
    amount: 999,
    currency: "USD",
    interval: "monthly",
    description:
      "5 chat interviews, no live interviews, saved evaluations and billing history",
  },
  {
    key: "pro",
    name: "Pro",
    amount: 2999,
    currency: "USD",
    interval: "monthly",
    description:
      "20 chat interviews, 5 live interviews, saved evaluations and billing history",
  },
  {
    key: "premium",
    name: "Premium",
    amount: 5999,
    currency: "USD",
    interval: "monthly",
    description:
      "60 chat interviews, 20 live interviews, saved evaluations and billing history",
  },
];

async function createPlan(plan) {
  const response = await fetch(
    "https://api.paystack.co/plan",
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: plan.name,
        amount: plan.amount,
        interval: plan.interval,
        currency: plan.currency,
        description: plan.description,
        send_invoices: true,
        send_sms: false,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok || !result.status) {
    throw new Error(
      result.message || `Could not create ${plan.name}`
    );
  }

  console.log({
    key: plan.key,
    planCode: result.data.plan_code,
  });
}

for (const plan of plans) {
  await createPlan(plan);
}
```

Store the resulting `PLN_...` codes in your environment variables.

Do not create a new Paystack Plan for every customer or every checkout.

---

# 5. Reusable Paystack API client

```js
// src/services/paystackClient.js

const PAYSTACK_BASE_URL = "https://api.paystack.co";

export class PaystackApiError extends Error {
  constructor(message, options = {}) {
    super(message);

    this.name = "PaystackApiError";
    this.statusCode = options.statusCode;
    this.paystackCode = options.paystackCode;
    this.paystackType = options.paystackType;
    this.nextStep = options.nextStep;
    this.data = options.data;
  }
}

export async function paystackRequest(
  path,
  {
    method = "GET",
    body,
    timeout = 20_000,
  } = {}
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    timeout
  );

  try {
    const response = await fetch(
      `${PAYSTACK_BASE_URL}${path}`,
      {
        method,
        headers: {
          Authorization:
            `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body:
          body === undefined
            ? undefined
            : JSON.stringify(body),
        signal: controller.signal,
      }
    );

    let result;

    try {
      result = await response.json();
    } catch {
      throw new PaystackApiError(
        "Paystack returned an invalid response.",
        {
          statusCode: response.status,
        }
      );
    }

    if (!response.ok || result.status !== true) {
      throw new PaystackApiError(
        result.message || "Paystack request failed.",
        {
          statusCode: response.status,
          paystackCode: result.code,
          paystackType: result.type,
          nextStep:
            result.meta?.next_step ||
            result.meta?.nextStep,
          data: result.data,
        }
      );
    }

    return result.data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new PaystackApiError(
        "The payment provider timed out.",
        {
          statusCode: 504,
          paystackCode: "PAYSTACK_TIMEOUT",
        }
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

Paystack uses conventional HTTP statuses, but its documentation warns that charge and verification requests may return HTTP `200` even when the underlying payment was unsuccessful. Always inspect both the top-level `status` field and the transaction’s `data.status`. ([Paystack][5])

---

# 6. Initialize a subscription checkout

The recommended first-subscription flow is:

```text
Frontend selects plan
        ↓
Express maps planKey to trusted Paystack Plan code
        ↓
Express initializes transaction
        ↓
Customer goes to authorization_url
        ↓
Customer pays
        ↓
Paystack creates subscription
        ↓
Webhook confirms payment and subscription
```

Adding a Plan code to an initialized transaction causes Paystack to use the Plan’s amount and automatically subscribe the customer after successful payment. ([Paystack][2])

```js
import crypto from "node:crypto";
import { getPaystackPlan } from "../config/paystackPlans.js";
import { paystackRequest } from "../services/paystackClient.js";

export async function initializePaystackSubscription(
  req,
  res,
  next
) {
  try {
    const plan = getPaystackPlan(req.body.planKey);

    if (!plan) {
      return res.status(400).json({
        success: false,
        code: "INVALID_PLAN",
        message: "The selected plan is unavailable.",
      });
    }

    const existing =
      await Subscription.findOne({
        userId: req.user.id,
        provider: "paystack",
        status: {
          $in: [
            "active",
            "non-renewing",
            "attention",
          ],
        },
      });

    if (existing) {
      return res.status(409).json({
        success: false,
        code: "SUBSCRIPTION_ALREADY_EXISTS",
        message:
          "You already have a Paystack subscription.",
      });
    }

    const requestId =
      req.get("Idempotency-Key") ||
      crypto.randomUUID();

    /*
     * Paystack transaction references must be unique.
     * Store this reference before calling Paystack.
     */
    const reference =
      `subscription_${req.user.id}_${requestId}`
        .replace(/[^a-zA-Z0-9_.=-]/g, "_")
        .slice(0, 100);

    const previousAttempt =
      await PaymentAttempt.findOne({
        reference,
      });

    if (previousAttempt?.authorizationUrl) {
      return res.status(200).json({
        success: true,
        reference,
        authorizationUrl:
          previousAttempt.authorizationUrl,
      });
    }

    await PaymentAttempt.create({
      userId: req.user.id,
      provider: "paystack",
      reference,
      planKey: plan.key,
      expectedAmount: plan.amount,
      expectedCurrency: plan.currency,
      status: "initializing",
    });

    const transaction = await paystackRequest(
      "/transaction/initialize",
      {
        method: "POST",
        body: {
          email: req.user.email,

          /*
           * Plan controls the final subscription price,
           * but still send the trusted server amount.
           */
          amount: plan.amount,
          currency: plan.currency,
          plan: plan.planCode,
          reference,

          callback_url:
            `${process.env.FRONTEND_URL}` +
            "/billing/paystack/callback",

          metadata: {
            userId: String(req.user.id),
            planKey: plan.key,
            provider: "paystack",
          },
        },
      }
    );

    await PaymentAttempt.updateOne(
      { reference },
      {
        $set: {
          status: "initialized",
          authorizationUrl:
            transaction.authorization_url,
          accessCode: transaction.access_code,
        },
      }
    );

    return res.status(201).json({
      success: true,
      reference: transaction.reference,
      authorizationUrl:
        transaction.authorization_url,
    });
  } catch (error) {
    next(error);
  }
}
```

The frontend redirects to the URL returned by Express:

```js
async function subscribeWithPaystack(planKey) {
  const response = await fetch(
    "/api/billing/paystack/initialize",
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        planKey,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Could not start payment."
    );
  }

  window.location.assign(result.authorizationUrl);
}
```

---

# 7. Verify the callback

The callback URL is not proof of payment. Your Express backend must call Paystack’s Verify Transaction endpoint before treating a transaction as successful. Paystack also recommends making fulfillment idempotent because verification and webhooks can both report the same successful transaction. ([Paystack][6])

```js
export async function verifyPaystackTransaction(
  req,
  res,
  next
) {
  try {
    const reference = String(
      req.params.reference || ""
    );

    const attempt =
      await PaymentAttempt.findOne({
        reference,
        userId: req.user.id,
      });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        code: "PAYMENT_ATTEMPT_NOT_FOUND",
        message: "Payment attempt was not found.",
      });
    }

    const transaction = await paystackRequest(
      `/transaction/verify/${encodeURIComponent(reference)}`
    );

    if (transaction.reference !== reference) {
      return res.status(409).json({
        success: false,
        code: "REFERENCE_MISMATCH",
        message:
          "The payment reference did not match.",
      });
    }

    if (transaction.status !== "success") {
      return res.status(402).json({
        success: false,
        code: "PAYMENT_NOT_SUCCESSFUL",
        paymentStatus: transaction.status,
        message:
          transaction.gateway_response ||
          "The payment has not completed.",
      });
    }

    if (
      transaction.amount !==
        attempt.expectedAmount ||
      transaction.currency !==
        attempt.expectedCurrency
    ) {
      return res.status(409).json({
        success: false,
        code: "PAYMENT_DETAILS_MISMATCH",
        message:
          "The verified payment details did not match the selected plan.",
      });
    }

    /*
     * Do not independently create duplicate access.
     * Call one idempotent synchronization function.
     */
    await synchronizeSuccessfulTransaction(
      transaction
    );

    return res.status(200).json({
      success: true,
      paymentStatus: "success",
      planKey: attempt.planKey,
    });
  } catch (error) {
    next(error);
  }
}
```

Possible verified transaction states include:

* `success`
* `failed`
* `abandoned`
* `ongoing`
* `pending`
* `processing`
* `queued`
* `reversed` ([Paystack][6])

Only `success` should activate paid access.

---

# 8. Paystack webhook verification

Paystack signs webhook payloads using:

```text
HMAC SHA-512
Secret: PAYSTACK_SECRET_KEY
Header: x-paystack-signature
```

Paystack also documents IP whitelisting, but signature verification should remain your primary application-level validation. ([Paystack][7])

Place the raw webhook route before `express.json()`:

```js
import express from "express";

app.post(
  "/api/webhooks/paystack",
  express.raw({
    type: "application/json",
  }),
  paystackWebhook
);

app.use(express.json());
```

Webhook controller:

```js
import crypto from "node:crypto";

function validPaystackSignature(rawBody, signature) {
  if (!signature) {
    return false;
  }

  const expected = crypto
    .createHmac(
      "sha512",
      process.env.PAYSTACK_SECRET_KEY
    )
    .update(rawBody)
    .digest("hex");

  const expectedBuffer =
    Buffer.from(expected, "hex");

  let receivedBuffer;

  try {
    receivedBuffer =
      Buffer.from(signature, "hex");
  } catch {
    return false;
  }

  return (
    expectedBuffer.length ===
      receivedBuffer.length &&
    crypto.timingSafeEqual(
      expectedBuffer,
      receivedBuffer
    )
  );
}

export async function paystackWebhook(
  req,
  res
) {
  const signature =
    req.headers["x-paystack-signature"];

  if (
    !validPaystackSignature(
      req.body,
      signature
    )
  ) {
    return res
      .status(401)
      .send("Invalid Paystack signature");
  }

  let event;

  try {
    event = JSON.parse(
      req.body.toString("utf8")
    );
  } catch {
    return res
      .status(400)
      .send("Invalid JSON");
  }

  /*
   * Return quickly and put the event in a durable queue.
   * The event key below should be unique in your DB.
   */
  const eventKey = createPaystackEventKey(event);

  try {
    await PaystackWebhookEvent.updateOne(
      { eventKey },
      {
        $setOnInsert: {
          eventKey,
          eventType: event.event,
          payload: event,
          status: "pending",
          receivedAt: new Date(),
        },
      },
      {
        upsert: true,
      }
    );

    await webhookQueue.add(
      "process-paystack-webhook",
      { eventKey },
      {
        jobId: eventKey,
      }
    );

    return res.sendStatus(200);
  } catch (error) {
    console.error(
      "Could not persist Paystack webhook",
      error
    );

    return res.sendStatus(500);
  }
}
```

Paystack retries live webhook failures every three minutes for the first four attempts and then hourly for up to 72 hours. In test mode, failed webhook events are retried hourly for ten hours. The webhook should return `200` quickly and move long-running work to a queue. ([Paystack][7])

---

# 9. Webhook events required for subscriptions

Handle at least:

```text
charge.success

subscription.create
subscription.not_renew
subscription.disable
subscription.expiring_cards

invoice.create
invoice.payment_failed
invoice.update

refund.pending
refund.processing
refund.processed
refund.failed

dispute.create
dispute.reminder
dispute.resolve
```

The normal recurring cycle is:

1. `invoice.create` around three days before the billing date.
2. `charge.success` when renewal payment succeeds.
3. `invoice.payment_failed` when it fails.
4. `invoice.update` with the invoice’s final state. ([Paystack][8])

Webhook processor:

```js
export async function processPaystackWebhook(
  event
) {
  switch (event.event) {
    case "charge.success":
      await handlePaystackChargeSuccess(
        event.data
      );
      break;

    case "subscription.create":
      await handleSubscriptionCreated(
        event.data
      );
      break;

    case "subscription.not_renew":
      await markSubscriptionNonRenewing(
        event.data
      );
      break;

    case "subscription.disable":
      await markSubscriptionDisabled(
        event.data
      );
      break;

    case "subscription.expiring_cards":
      await notifyCustomersWithExpiringCards(
        event.data
      );
      break;

    case "invoice.create":
      await recordUpcomingInvoice(
        event.data
      );
      break;

    case "invoice.payment_failed":
      await handleInvoicePaymentFailure(
        event.data
      );
      break;

    case "invoice.update":
      await synchronizeInvoice(
        event.data
      );
      break;

    case "refund.pending":
    case "refund.processing":
    case "refund.processed":
    case "refund.failed":
      await synchronizeRefund(event.data);
      break;

    case "dispute.create":
    case "dispute.reminder":
    case "dispute.resolve":
      await synchronizeDispute(event);
      break;

    default:
      console.log(
        `Unhandled Paystack event: ${event.event}`
      );
  }
}
```

---

# 10. Validate every successful charge

Never grant access merely because the event says `charge.success`. Match the transaction against your database:

```js
async function handlePaystackChargeSuccess(
  transaction
) {
  const attempt =
    await PaymentAttempt.findOne({
      reference: transaction.reference,
    });

  if (!attempt) {
    /*
     * It may be a renewal rather than the initial
     * transaction. Match it using subscription,
     * customer and plan information.
     */
    return handlePaystackRenewal(transaction);
  }

  if (
    transaction.amount !==
      attempt.expectedAmount ||
    transaction.currency !==
      attempt.expectedCurrency
  ) {
    throw new Error(
      "Paystack transaction amount or currency mismatch"
    );
  }

  await Payment.updateOne(
    {
      provider: "paystack",
      providerTransactionId:
        String(transaction.id),
    },
    {
      $setOnInsert: {
        userId: attempt.userId,
        provider: "paystack",
        providerTransactionId:
          String(transaction.id),
        reference: transaction.reference,
        amount: transaction.amount,
        currency: transaction.currency,
        status: "success",
        paidAt: transaction.paid_at,
      },
    },
    {
      upsert: true,
    }
  );

  await PaymentAttempt.updateOne(
    {
      _id: attempt._id,
    },
    {
      $set: {
        status: "successful",
      },
    }
  );
}
```

Add unique database indexes for:

```text
PaymentAttempt.reference
Payment.providerTransactionId
Subscription.subscriptionCode
PaystackWebhookEvent.eventKey
```

---

# 11. Store the complete subscription information

When processing `subscription.create`, store:

```js
{
  userId,
  provider: "paystack",

  planKey: "pro",
  planCode: "PLN_...",

  subscriptionCode: "SUB_...",
  emailToken: "...",

  customerCode: "CUS_...",
  customerEmail: "...",

  authorizationCode: "AUTH_...",

  status: "active",
  nextPaymentDate: Date,

  chatLimit: 20,
  liveLimit: 5,

  currentPeriodStart: Date,
  currentPeriodEnd: Date,

  cancelAtPeriodEnd: false
}
```

The `subscription_code` and `email_token` are particularly important because Paystack requires both to enable or disable a subscription. ([Paystack][9])

Do not return the email token to the browser.

---

# 12. Failed recurring payments

Paystack explicitly says that subscription charges are not retried. ([Paystack][2])

On `invoice.payment_failed`:

1. Mark the subscription `attention` or `past_due`.
2. Decide whether to provide a short grace period.
3. Notify the customer.
4. Generate a subscription-management link.
5. Ask the customer to update their card or direct-debit authorization.
6. Restore full access only after another verified successful charge.

Example policy:

```js
async function handleInvoicePaymentFailure(
  invoice
) {
  const subscriptionCode =
    invoice.subscription?.subscription_code ||
    invoice.subscription_code;

  const subscription =
    await Subscription.findOneAndUpdate(
      {
        provider: "paystack",
        subscriptionCode,
      },
      {
        $set: {
          status: "attention",
          paymentFailureAt: new Date(),
          gracePeriodEndsAt:
            new Date(
              Date.now() +
                3 * 24 * 60 * 60 * 1000
            ),
        },
      },
      {
        new: true,
      }
    );

  if (subscription) {
    await sendPaymentFailureEmail(
      subscription.userId
    );
  }
}
```

---

# 13. Generate the subscription management link

Paystack can generate a hosted page where a customer can update their payment authorization or cancel the subscription. ([Paystack][2])

```js
export async function createPaystackManagementLink(
  req,
  res,
  next
) {
  try {
    const subscription =
      await Subscription.findOne({
        userId: req.user.id,
        provider: "paystack",
      });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        code: "SUBSCRIPTION_NOT_FOUND",
        message: "Subscription was not found.",
      });
    }

    const result = await paystackRequest(
      `/subscription/${
        subscription.subscriptionCode
      }/manage/link`
    );

    return res.status(200).json({
      success: true,
      managementUrl: result.link,
    });
  } catch (error) {
    next(error);
  }
}
```

Never accept the subscription code directly from the frontend. Read it from the authenticated user’s database record.

---

# 14. Cancel a Paystack subscription

```js
export async function cancelPaystackSubscription(
  req,
  res,
  next
) {
  try {
    const subscription =
      await Subscription.findOne({
        userId: req.user.id,
        provider: "paystack",
        status: {
          $in: [
            "active",
            "attention",
          ],
        },
      });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        code: "ACTIVE_SUBSCRIPTION_NOT_FOUND",
        message:
          "No active subscription was found.",
      });
    }

    await paystackRequest(
      "/subscription/disable",
      {
        method: "POST",
        body: {
          code:
            subscription.subscriptionCode,
          token:
            subscription.emailToken,
        },
      }
    );

    /*
     * Do not immediately delete the record.
     * Wait for subscription.not_renew and
     * subscription.disable webhooks.
     */
    await Subscription.updateOne(
      {
        _id: subscription._id,
      },
      {
        $set: {
          cancellationRequestedAt:
            new Date(),
          status: "cancellation_requested",
        },
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "Your subscription cancellation has been requested.",
    });
  } catch (error) {
    next(error);
  }
}
```

Paystack sends `subscription.not_renew` when the subscription will not renew and later sends `subscription.disable` when it has been disabled. ([Paystack][8])

---

# 15. Upgrades and downgrades

Paystack’s documentation does not describe a Stripe-style individual subscription-item update with automatic proration. The documented subscription operations are create, retrieve, enable, disable, and generate management links. ([Paystack][9])

Therefore, a practical per-customer plan-switch workflow is:

## Immediate upgrade

```text
1. User selects Pro or Premium
2. Initialize a new transaction using the target Plan code
3. Customer pays for the new Plan
4. Receive subscription.create and charge.success
5. Activate the new subscription
6. Disable the old subscription
7. Preserve existing interview usage
8. Increase limits to the new tier
```

Do not disable the old subscription before the new payment succeeds.

## End-of-period downgrade

```text
1. Record requestedPlanKey
2. Mark downgrade for current nextPaymentDate
3. Disable the existing subscription before its next renewal
4. Create the lower Plan subscription using an existing authorization
5. Use start_date where appropriate
6. Update access only after webhook confirmation
```

Paystack allows a `start_date` when creating a subscription, which can be used for delayed billing or switching customers to another plan. The customer must already have a reusable authorization for the direct Create Subscription API flow. ([Paystack][9])

Do not use Paystack’s general `Update Plan` endpoint to move one customer from Starter to Pro. Updating a shared Plan can affect existing subscriptions when `update_existing_subscriptions` is enabled. ([Paystack][4])

---

# 16. Refunds

Paystack supports full and partial refunds. Omitting `amount` requests a full refund; providing an amount requests a partial refund. Refund completion is asynchronous, so monitor refund webhook events. ([Paystack][10])

```js
export async function refundPaystackPayment(
  req,
  res,
  next
) {
  try {
    const payment =
      await Payment.findOne({
        _id: req.params.paymentId,
        provider: "paystack",
        status: "success",
      });

    if (!payment) {
      return res.status(404).json({
        success: false,
        code: "PAYMENT_NOT_FOUND",
        message: "Payment was not found.",
      });
    }

    const amount = req.body.amount;

    if (
      amount !== undefined &&
      (
        !Number.isInteger(amount) ||
        amount <= 0 ||
        amount >
          payment.refundableAmount
      )
    ) {
      return res.status(400).json({
        success: false,
        code: "INVALID_REFUND_AMOUNT",
        message: "Invalid refund amount.",
      });
    }

    const refund = await paystackRequest(
      "/refund",
      {
        method: "POST",
        body: {
          transaction: payment.reference,
          ...(amount !== undefined
            ? { amount }
            : {}),
          customer_note:
            req.body.customerNote,
          merchant_note:
            `Internal payment ${payment.id}`,
        },
      }
    );

    await Refund.create({
      userId: payment.userId,
      paymentId: payment.id,
      provider: "paystack",
      providerRefundId:
        String(refund.id),
      amount: refund.amount,
      currency: refund.currency,
      status: refund.status,
    });

    return res.status(202).json({
      success: true,
      refundId: refund.id,
      status: refund.status,
    });
  } catch (error) {
    next(error);
  }
}
```

Refund initiation can fail when the Paystack balance is insufficient. ([Paystack][11])

---

# 17. Error middleware

```js
import {
  PaystackApiError,
} from "../services/paystackClient.js";

export function paymentErrorHandler(
  error,
  req,
  res,
  next
) {
  console.error("Payment request failed", {
    provider: "paystack",
    message: error.message,
    statusCode: error.statusCode,
    code: error.paystackCode,
    type: error.paystackType,
    nextStep: error.nextStep,
  });

  if (error instanceof PaystackApiError) {
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        code:
          error.paystackCode ||
          "INVALID_PAYMENT_REQUEST",
        message: error.message,
        nextStep: error.nextStep,
      });
    }

    if (error.statusCode === 401) {
      return res.status(500).json({
        success: false,
        code:
          "PAYMENT_CONFIGURATION_ERROR",
        message:
          "The payment provider is not configured correctly.",
      });
    }

    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        code:
          error.paystackCode ||
          "PAYMENT_RESOURCE_NOT_FOUND",
        message: error.message,
      });
    }

    if (
      error.statusCode === 429 ||
      error.paystackCode ===
        "PAYSTACK_RATE_LIMIT"
    ) {
      return res.status(503).json({
        success: false,
        code: "PAYMENT_SERVICE_BUSY",
        message:
          "The payment service is temporarily busy. Please try again.",
      });
    }

    return res.status(503).json({
      success: false,
      code:
        error.paystackCode ||
        "PAYMENT_SERVICE_UNAVAILABLE",
      message:
        "The payment provider is temporarily unavailable.",
    });
  }

  return res.status(500).json({
    success: false,
    code: "INTERNAL_SERVER_ERROR",
    message: "Something went wrong.",
  });
}
```

Paystack’s error format can contain `status`, `message`, `type`, `code`, and diagnostic metadata such as a suggested next step. ([Paystack][5])

---

# 18. Required Express routes

```js
router.get(
  "/plans",
  getPublicPlans
);

router.post(
  "/paystack/initialize",
  requireAuth,
  initializePaystackSubscription
);

router.get(
  "/paystack/verify/:reference",
  requireAuth,
  verifyPaystackTransaction
);

router.post(
  "/paystack/cancel",
  requireAuth,
  cancelPaystackSubscription
);

router.post(
  "/paystack/manage",
  requireAuth,
  createPaystackManagementLink
);

router.post(
  "/paystack/change-plan",
  requireAuth,
  changePaystackPlan
);

router.get(
  "/status",
  requireAuth,
  getSubscriptionAndUsageStatus
);

router.post(
  "/admin/payments/:paymentId/refund",
  requireAuth,
  requireAdmin,
  refundPaystackPayment
);
```

Separate webhook route:

```js
app.post(
  "/api/webhooks/paystack",
  express.raw({
    type: "application/json",
  }),
  paystackWebhook
);
```

---

# 19. Paystack API methods required

## Transactions

```text
POST /transaction/initialize
GET  /transaction/verify/:reference
GET  /transaction/:id
GET  /transaction
```

## Plans

```text
POST /plan
GET  /plan
GET  /plan/:id_or_code
PUT  /plan/:id_or_code
```

## Subscriptions

```text
POST /subscription
GET  /subscription
GET  /subscription/:id_or_code
POST /subscription/enable
POST /subscription/disable
GET  /subscription/:code/manage/link
POST /subscription/:code/manage/email
```

## Refunds

```text
POST /refund
GET  /refund
GET  /refund/:id
```

## Disputes

```text
GET /dispute
GET /dispute/:id
PUT /dispute/:id
POST evidence and resolution endpoints as needed
```

---

# 20. Interview-limit enforcement remains in Express

Paystack only handles billing. Your backend must still enforce:

```text
Starter:
5 chat
0 live

Pro:
20 chat
5 live

Premium:
60 chat
20 live
```

The same atomic usage-counter implementation used for Stripe should work for Paystack. The usage period should be tied to the Paystack subscription’s billing dates or confirmed renewal invoice period.

On a successful renewal:

```js
await UsagePeriod.updateOne(
  {
    userId,
    provider: "paystack",
    periodStart,
    periodEnd,
  },
  {
    $setOnInsert: {
      planKey,
      chatUsed: 0,
      liveUsed: 0,
      chatLimit: plan.chatLimit,
      liveLimit: plan.liveLimit,
    },
  },
  {
    upsert: true,
  }
);
```

Do not reset usage merely because the user reloads the frontend or visits the callback page.

---

# Recommended gateway decision

For your particular SaaS:

* Use **Stripe** when your legal business location is supported and you need stronger subscription lifecycle management, automated recovery, proration, and a mature customer portal.
* Use **Paystack** when your business is established in a supported Paystack market and your customers primarily use the regional channels Paystack supports.
* You can support both gateways behind a common billing interface, but each subscription must have one authoritative provider.

A good database field is:

```js
provider: {
  type: String,
  enum: ["stripe", "paystack"],
}
```

Never create the same active subscription simultaneously in both Stripe and Paystack.

[1]: https://paystack.com/docs/api/miscellaneous/?utm_source=chatgpt.com "Miscellaneous API | Paystack Developer Documentation"
[2]: https://paystack.com/docs/payments/subscriptions/ "Subscriptions | Paystack Developer Documentation"
[3]: https://paystack.com/docs/api/ "API Reference | Paystack Developer Documentation"
[4]: https://paystack.com/docs/api/plan/ "Plan API | Paystack Developer Documentation"
[5]: https://paystack.com/docs/api/errors/ "Paystack Errors | Paystack Developer Documentation"
[6]: https://paystack.com/docs/payments/verify-payments/ "Verify Payments | Paystack Developer Documentation"
[7]: https://paystack.com/docs/payments/webhooks/ "Webhooks | Paystack Developer Documentation"
[8]: https://paystack.com/docs/payments/subscriptions/?utm_source=chatgpt.com "Subscriptions | Paystack Developer Documentation"
[9]: https://paystack.com/docs/api/subscription/ "Subscription API | Paystack Developer Documentation"
[10]: https://paystack.com/docs/payments/refunds/ "Refunds | Paystack Developer Documentation"
[11]: https://paystack.com/docs/api/errors/refund/?utm_source=chatgpt.com "Refund Errors | Paystack Developer Documentation"
