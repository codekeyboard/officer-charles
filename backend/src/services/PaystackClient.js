const AppErrorModule = require('@src/utils/classes/AppError');

const AppError = AppErrorModule.default || AppErrorModule.AppError;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const DEFAULT_TIMEOUT_MS = 15000;

let testClient = null;

class PaystackApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'PaystackApiError';
    this.statusCode = options.statusCode || 503;
    this.paystackCode = options.paystackCode || null;
    this.paystackType = options.paystackType || null;
    this.nextStep = options.nextStep || null;
    this.data = options.data;
  }
}

function isPaystackConfigured() {
  return Boolean(String(process.env.PAYSTACK_SECRET_KEY || '').trim());
}

function getPaystackClient() {
  if (testClient) return testClient;
  if (!isPaystackConfigured()) return null;
  return {
    initializeTransaction: (payload) => paystackRequest('/transaction/initialize', { method: 'POST', body: payload }),
    verifyTransaction: (reference) => paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`)
  };
}

async function paystackRequest(path, options = {}) {
  const secretKey = String(process.env.PAYSTACK_SECRET_KEY || '').trim();
  if (!secretKey) {
    throw new AppError({
      statusCode: 503,
      publicMessage: 'Paystack is not configured for billing actions.',
      internalMessage: 'PAYSTACK_SECRET_KEY is missing.',
      errorCode: 'PAYSTACK_NOT_CONFIGURED'
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.PAYSTACK_TIMEOUT_MS || DEFAULT_TIMEOUT_MS));

  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });

    let result;
    try {
      result = await response.json();
    } catch {
      throw new PaystackApiError('Paystack returned an invalid response.', { statusCode: response.status });
    }

    if (!response.ok || result.status !== true) {
      throw new PaystackApiError(result.message || 'Paystack request failed.', {
        statusCode: response.status,
        paystackCode: result.code,
        paystackType: result.type,
        nextStep: result.meta?.next_step || result.meta?.nextStep,
        data: result.data
      });
    }

    return result.data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new PaystackApiError('The payment provider timed out.', {
        statusCode: 504,
        paystackCode: 'PAYSTACK_TIMEOUT'
      });
    }
    if (error instanceof PaystackApiError || error instanceof AppError) {
      throw error;
    }
    if (error instanceof TypeError) {
      throw new PaystackApiError('Could not connect to Paystack. Please check your network and Paystack API access.', {
        statusCode: 503,
        paystackCode: 'PAYSTACK_NETWORK_ERROR'
      });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function setPaystackClientForTests(client) {
  testClient = client;
}

function resetPaystackClientForTests() {
  testClient = null;
}

module.exports = {
  PaystackApiError,
  getPaystackClient,
  isPaystackConfigured,
  paystackRequest,
  setPaystackClientForTests,
  resetPaystackClientForTests
};
