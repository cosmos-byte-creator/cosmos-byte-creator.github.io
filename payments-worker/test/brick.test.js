import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import worker from "../src/index.js";

globalThis.crypto ||= webcrypto;

const SITE = "https://cosmos-byte-creator.github.io";
const BASE = "https://worker.example";

function makeEnv() {
  const data = new Map();
  return {
    MP_ACCESS_TOKEN: "test-server-token",
    MP_PUBLIC_KEY: "PUBLIC_TEST_KEY",
    MP_WEBHOOK_SECRET: "webhook-secret-for-tests",
    ADMIN_TOKEN: "admin-test-token",
    SITE_ORIGIN: SITE,
    ORDERS: {
      async get(key, type) {
        const value = data.get(key);
        if (value === undefined) return null;
        return type === "json" ? JSON.parse(value) : value;
      },
      async put(key, value) { data.set(key, value); },
      async list({ prefix }) {
        return { keys: [...data.keys()].filter(key => key.startsWith(prefix)).map(name => ({ name })), list_complete: true };
      }
    }
  };
}

function customer() {
  return { name: "Cliente Teste", whatsapp: "5516999999999", address: "Rua das Estrelas, 10" };
}

async function makeSession(env, overrides = {}) {
  const request = new Request(`${BASE}/api/brick/session`, {
    method: "POST",
    headers: { origin: SITE, "content-type": "application/json" },
    body: JSON.stringify({
      items: [{ id: "coca", quantidade: 1, unit_price: 0.01 }],
      customer: customer(), ...overrides
    })
  });
  const response = await worker.fetch(request, env, {});
  return { response, body: await response.json() };
}

test("runtime config exposes only the public key with no-store headers", async () => {
  const env = makeEnv();
  const response = await worker.fetch(new Request(`${BASE}/api/mp-config`, { headers: { origin: SITE } }), env, {});
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { publicKey: env.MP_PUBLIC_KEY });
  assert.match(response.headers.get("cache-control"), /no-store/);
});

test("brick session recalculates the order total and requires the site origin", async () => {
  const env = makeEnv();
  const { response, body } = await makeSession(env);
  assert.equal(response.status, 201);
  assert.equal(body.amount, 7);
  assert.equal(body.currency, "BRL");
  assert.match(body.checkoutUrl, /checkout\/pagamento\/\?session=/);
  const session = await env.ORDERS.get(`brick-session:${body.sessionId}`, "json");
  assert.equal(session.expectedCents, 700);

  const wrongOrigin = await worker.fetch(new Request(`${BASE}/api/brick/session`, {
    method: "POST", headers: { origin: "https://attacker.example", "content-type": "application/json" },
    body: JSON.stringify({ items: [{ id: "coca", quantidade: 1 }], customer: customer() })
  }), env, {});
  assert.equal(wrongOrigin.status, 403);
});

test("test product is retired and personalized order details are preserved", async () => {
  const env = makeEnv();
  const removed = await makeSession(env, { items: [{ id: "produto-teste-1-real", quantidade: 1 }] });
  assert.equal(removed.response.status, 400);
  const lascas = await makeSession(env, { items: [{ id: "lascas", quantidade: 1, config: { tipo: "lascas", peso: 500, cobertura: "Cheddar e bacon" } }] });
  assert.equal(lascas.response.status, 201);
  const saved = await env.ORDERS.get(`brick-session:${lascas.body.sessionId}`, "json");
  assert.deepEqual(saved.lines[0].details, ["Porção: 500g", "Cobertura: Cheddar e bacon"]);
  const plutao = await makeSession(env, { items: [{ id: "plutao", quantidade: 1, adicionais: ["bacon"] }] });
  assert.equal(plutao.response.status, 400);
});

test("invalid checkout input returns a controlled client error", async () => {
  const env = makeEnv();
  const { response, body } = await makeSession(env, { items: [] });
  assert.equal(response.status, 400);
  assert.equal(body.error, "Carrinho inválido.");
});

test("Payment Brick charges the trusted session amount, not the browser amount", async () => {
  const env = makeEnv();
  const { body: session } = await makeSession(env);
  const attemptId = crypto.randomUUID();
  let apiCall;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    apiCall = { url, init, payload: JSON.parse(init.body) };
    return Response.json({
      id: 901, status: "approved", status_detail: "accredited", currency_id: "BRL",
      transaction_amount: 7, external_reference: session.localId, payment_method_id: "visa", payment_type_id: "credit_card"
    }, { status: 201 });
  };
  try {
    const response = await worker.fetch(new Request(`${BASE}/api/brick/payment`, {
      method: "POST", headers: { origin: SITE, "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: session.sessionId, attemptId, selectedPaymentMethod: "credit_card",
        formData: { transaction_amount: 0.01, token: "one-time-card-token", payment_method_id: "visa", installments: 1, payer: { email: "cliente@example.com" } }
      })
    }), env, {});
    const result = await response.json();
    assert.equal(response.status, 201);
    assert.equal(apiCall.url, "https://api.mercadopago.com/v1/payments");
    assert.equal(apiCall.payload.transaction_amount, 7);
    assert.equal(apiCall.payload.external_reference, session.localId);
    assert.equal(apiCall.payload.token, "one-time-card-token");
    assert.equal(apiCall.payload.payer.email, "cliente@example.com");
    assert.equal(apiCall.init.headers["x-idempotency-key"], attemptId);
    assert.equal(result.status, "approved");
    const saved = await env.ORDERS.get("payment:901", "json");
    assert.equal(saved.status, "approved");
    assert.equal(saved.paymentMethodId, "visa");
    assert.equal(saved.paymentTypeId, "credit_card");
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("Pix stays pending and returns the in-page QR code and copy string", async () => {
  const env = makeEnv();
  const { body: session } = await makeSession(env);
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    id: 902, status: "pending", status_detail: "pending_waiting_transfer", currency_id: "BRL",
    transaction_amount: 7, external_reference: session.localId,
    point_of_interaction: { transaction_data: { qr_code: "PIX-COPY-PASTE", qr_code_base64: "ZmFrZS1xci1pbWFnZQ==" } }
  }, { status: 201 });
  try {
    const response = await worker.fetch(new Request(`${BASE}/api/brick/payment`, {
      method: "POST", headers: { origin: SITE, "content-type": "application/json" },
      body: JSON.stringify({ sessionId: session.sessionId, attemptId: crypto.randomUUID(), selectedPaymentMethod: "pix", formData: { payment_method_id: "pix", payer: { email: "cliente@example.com" } } })
    }), env, {});
    const result = await response.json();
    assert.equal(result.status, "pending");
    assert.equal(result.qrCode, "PIX-COPY-PASTE");
    assert.equal((await env.ORDERS.get(`brick-session:${session.sessionId}`, "json")).status, "pending");
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("signed payment webhook updates the order only after fetching Mercado Pago", async () => {
  const env = makeEnv();
  const { body: session } = await makeSession(env);
  await env.ORDERS.put(`brick-session:${session.sessionId}`, JSON.stringify({
    ...(await env.ORDERS.get(`brick-session:${session.sessionId}`, "json")), paymentId: "903", status: "pending"
  }));
  const timestamp = "1792400000", requestId = "webhook-request-1", dataId = "903";
  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.MP_WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = [...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest)))].map(byte => byte.toString(16).padStart(2, "0")).join("");
  const previousFetch = globalThis.fetch;
  let paymentFetches = 0;
  globalThis.fetch = async () => { paymentFetches += 1; return Response.json({ id: 903, status: "approved", status_detail: "accredited", currency_id: "BRL", transaction_amount: 7, external_reference: session.localId, payment_method_id: "pix", payment_type_id: "bank_transfer" }); };
  try {
    const jobs = [];
    const response = await worker.fetch(new Request(`${BASE}/api/webhook/mercado-pago?data.id=${dataId}`, {
      method: "POST", headers: { "content-type": "application/json", "x-request-id": requestId, "x-signature": `ts=${timestamp},v1=${signature}` },
      body: JSON.stringify({ id: "notification-903", type: "payment", action: "payment.updated", data: { id: dataId } })
    }), env, { waitUntil(job) { jobs.push(job); } });
    assert.equal(response.status, 200);
    await Promise.all(jobs);
    const saved = await env.ORDERS.get(`brick-session:${session.sessionId}`, "json");
    assert.equal(saved.status, "approved");
    assert.equal(saved.lastPaymentWebhookAction, "payment.updated");
    assert.ok(saved.lastPaymentWebhookAt);
    assert.equal(saved.paymentTypeId, "bank_transfer");
    const duplicateJobs = [];
    await worker.fetch(new Request(`${BASE}/api/webhook/mercado-pago?data.id=${dataId}`, {
      method: "POST", headers: { "content-type": "application/json", "x-request-id": requestId, "x-signature": `ts=${timestamp},v1=${signature}` },
      body: JSON.stringify({ id: "notification-903", type: "payment", action: "payment.updated", data: { id: dataId } })
    }), env, { waitUntil(job) { duplicateJobs.push(job); } });
    await Promise.all(duplicateJobs);
    assert.equal(paymentFetches, 1);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
