import crypto from "crypto";

const DOKU_CHECKOUT_PATH = "/checkout/v1/payment";
const DOKU_ORDER_STATUS_PATH = "/orders/v1/status";

export type DokuCheckoutLineItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

export type DokuCheckoutRequest = {
  order: {
    amount: number;
    invoice_number: string;
    currency?: "IDR";
    callback_url?: string;
    callback_url_cancel?: string;
    callback_url_result?: string;
    language?: "ID" | "EN";
    auto_redirect?: boolean;
    line_items?: DokuCheckoutLineItem[];
  };
  payment: {
    payment_due_date: number;
    type?: "SALE";
    payment_method_types?: string[];
  };
  customer?: {
    id?: string;
    name?: string;
    phone?: string;
  };
  additional_info?: {
    override_notification_url?: string;
  };
};

type DokuCheckoutResponse = {
  message?: string[];
  response?: {
    payment?: {
      url?: string;
      token_id?: string;
      expired_date?: string;
    };
  };
  error_messages?: string[];
};

export type DokuStatusResponse = {
  order?: {
    invoice_number?: string;
    amount?: number;
  };
  transaction?: {
    status?: "PENDING" | "SUCCESS" | "FAILED" | "EXPIRED" | "REFUNDED" | "TIMEOUT" | "REDIRECT" | string;
    date?: string;
    original_request_id?: string;
  };
  service?: {
    id?: string;
  };
  acquirer?: {
    id?: string;
  };
  channel?: {
    id?: string;
  };
  error_messages?: string[];
  message?: string[];
};

function getDokuConfig() {
  const clientId = process.env.DOKU_CLIENT_ID;
  const secretKey = process.env.DOKU_SECRET_KEY;
  const env = process.env.DOKU_ENV === "production" ? "production" : "sandbox";

  if (!clientId || !secretKey) {
    throw new Error("DOKU credentials are not configured");
  }

  return {
    clientId,
    secretKey,
    checkoutEndpoint:
      env === "production"
        ? "https://api.doku.com/checkout/v1/payment"
        : "https://api-sandbox.doku.com/checkout/v1/payment",
    statusEndpoint:
      env === "production"
        ? "https://api.doku.com/orders/v1/status"
        : "https://api-sandbox.doku.com/orders/v1/status",
  };
}

function createDokuHeaders({
  requestTarget,
  body,
}: {
  requestTarget: string;
  body?: string;
}) {
  const { clientId, secretKey } = getDokuConfig();
  const requestId = crypto.randomUUID();
  const requestTimestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const digest = body ? generateDokuDigest(body) : undefined;
  const signature = generateDokuSignature({
    clientId,
    requestId,
    requestTimestamp,
    requestTarget,
    digest,
    secretKey,
  });

  return {
    "Client-Id": clientId,
    "Request-Id": requestId,
    "Request-Timestamp": requestTimestamp,
    Signature: signature,
  };
}

export function generateDokuDigest(body: string) {
  return crypto.createHash("sha256").update(body, "utf8").digest("base64");
}

export function generateDokuSignature({
  clientId,
  requestId,
  requestTimestamp,
  requestTarget,
  digest,
  secretKey,
}: {
  clientId: string;
  requestId: string;
  requestTimestamp: string;
  requestTarget: string;
  digest?: string;
  secretKey: string;
}) {
  const components = [
    `Client-Id:${clientId}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${requestTimestamp}`,
    `Request-Target:${requestTarget}`,
  ];

  if (digest) {
    components.push(`Digest:${digest}`);
  }

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(components.join("\n"), "utf8")
    .digest("base64");

  return `HMACSHA256=${signature}`;
}

export function isDokuTimestampFresh(requestTimestamp: string, toleranceMs = 5 * 60 * 1000) {
  const timestampMs = Date.parse(requestTimestamp);

  if (!Number.isFinite(timestampMs)) {
    return false;
  }

  return Math.abs(Date.now() - timestampMs) <= toleranceMs;
}

export function getDokuReplayCacheKey(clientId: string, requestId: string) {
  return `doku:notification:${clientId}:${requestId}`;
}

export function verifyDokuSignature({
  clientId,
  requestId,
  requestTimestamp,
  requestTarget,
  body,
  signature,
}: {
  clientId: string;
  requestId: string;
  requestTimestamp: string;
  requestTarget: string;
  body: string;
  signature: string;
}) {
  const secretKey = process.env.DOKU_SECRET_KEY;
  const expectedClientId = process.env.DOKU_CLIENT_ID;

  if (!secretKey || !expectedClientId || clientId !== expectedClientId) {
    return false;
  }

  const digest = generateDokuDigest(body);
  const expected = generateDokuSignature({
    clientId,
    requestId,
    requestTimestamp,
    requestTarget,
    digest,
    secretKey,
  });

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

export async function createDokuCheckoutPayment(payload: DokuCheckoutRequest) {
  const { checkoutEndpoint } = getDokuConfig();
  const body = JSON.stringify(payload);
  const headers = createDokuHeaders({
    requestTarget: DOKU_CHECKOUT_PATH,
    body,
  });

  const response = await fetch(checkoutEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body,
  });

  const data = (await response.json()) as DokuCheckoutResponse;

  if (!response.ok || !data.response?.payment?.url) {
    throw new Error(
      data.error_messages?.join(", ") ||
        data.message?.join(", ") ||
        `Failed to create DOKU checkout payment: ${JSON.stringify(data)}`,
    );
  }

  return {
    url: data.response.payment.url,
    tokenId: data.response.payment.token_id,
    expiredDate: data.response.payment.expired_date,
  };
}

export async function getDokuOrderStatus(invoiceNumber: string) {
  const { statusEndpoint } = getDokuConfig();
  const encodedInvoiceNumber = encodeURIComponent(invoiceNumber);
  const requestTarget = `${DOKU_ORDER_STATUS_PATH}/${encodedInvoiceNumber}`;
  const headers = createDokuHeaders({ requestTarget });
  const response = await fetch(`${statusEndpoint}/${encodedInvoiceNumber}`, {
    method: "GET",
    headers,
  });
  const data = (await response.json()) as DokuStatusResponse;

  if (!response.ok) {
    throw new Error(
      data.error_messages?.join(", ") ||
        data.message?.join(", ") ||
        `Failed to get DOKU order status: ${JSON.stringify(data)}`,
    );
  }

  return data;
}
