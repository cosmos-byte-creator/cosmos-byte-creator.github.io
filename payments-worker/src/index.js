const PRODUCTS = {
  plutao: { title: "Plutão", price: 2190, type: "burger", sweet: true },
  mercurio: { title: "Mercúrio", price: 2490, type: "burger" },
  venus: { title: "Vênus", price: 2490, type: "burger" },
  terra: { title: "Terra", price: 2790, type: "burger" },
  marte: { title: "Marte", price: 3490, type: "burger" },
  jupiter: { title: "Júpiter", price: 3490, type: "burger" },
  saturno: { title: "Saturno", price: 3490, type: "burger" },
  netuno: { title: "Netuno", price: 2490, type: "burger" },
  lascas: { title: "Lascas de Cometa Fritas", price: 2490, type: "custom", custom: "lascas" },
  coca: { title: "Coca-Cola lata 350ml", price: 700, type: "drink" },
  guarana: { title: "Guaraná lata 350ml", price: 650, type: "drink" },
  "coca-1l": { title: "Coca-Cola 1L", price: 1200, type: "custom", custom: "liter" },
  "guarana-1l": { title: "Guaraná 1L", price: 1000, type: "custom", custom: "liter" },
  "combo-viajante": { title: "Combo Viajante Espacial", price: 3690, type: "combo", slots: 1, fries: 0, batataIndividual: true, marciano: false, drinks: ["Coca-Cola lata 350ml", "Guaraná lata 350ml"] },
  "combo-vortice": { title: "Combo Vórtice", price: 4990, type: "combo", slots: 2, fries: 0, marciano: true, drinks: ["Coca-Cola 1L", "Guaraná Antarctica 1L"] },
  "combo-abducao": { title: "Combo Abdução", price: 6490, type: "combo", slots: 3, fries: 0, marciano: true, drinks: ["Coca-Cola 1L", "Guaraná Antarctica 1L"] },
  "combo-nave-mae": { title: "Combo Nave Mãe", price: 8090, type: "combo", slots: 4, fries: 0, marciano: true, drinks: ["Coca-Cola 1L", "Guaraná Antarctica 1L"] },
  "combo-jornada": { title: "Combo Jornada Cósmica", price: 5190, type: "combo", slots: 1, fries: 0, marciano: false, drinks: ["Monster Energy lata"], fixedDetails: ["1 Plutão", "1 Monster Energy lata"] },
  "combo-frota": { title: "Combo Frota Suprema", price: 13490, type: "combo", slots: 5, fries: 2, marciano: false, drinks: ["Coca-Cola 2L"] },
  "produto-teste-1-real": { title: "Produto de teste · R$ 0,01", price: 1, type: "fixed" }
};

const ADDONS = {
  "hamburguer-120g": 700, "cebola-caramelizada": 300, "cebola-roxa": 300,
  picles: 300, "molho-catupiry": 300, "molho-cheddar": 300,
  "molho-baconnese": 300, bacon: 400, "queijo-cheddar": 300, "queijo-mussarela": 300
};
const ADDON_NAMES = {
  "hamburguer-120g": "Hambúrguer 120g", "cebola-caramelizada": "Cebola caramelizada", "cebola-roxa": "Cebola roxa",
  picles: "Picles", "molho-catupiry": "Molho Catupiry", "molho-cheddar": "Molho cheddar",
  "molho-baconnese": "Molho baconnese", bacon: "Bacon", "queijo-cheddar": "Fatia de queijo cheddar",
  "queijo-mussarela": "Fatia de queijo mussarela"
};
const COMBO_BURGERS = { mercurio: "simple", venus: "simple", terra: "simple", netuno: "simple", plutao: "simple", marte: "double", jupiter: "double", saturno: "double" };
const FRY_FLAVORS = new Set(["Catupiry e bacon", "Cheddar e bacon"]);
const FULFILLMENT_LABELS = {
  awaiting_payment: "Aguardando pagamento",
  awaiting_confirmation: "Aguardando confirmação da loja",
  confirmed: "Pedido confirmado",
  preparing: "Em preparo",
  ready: "Pronto para retirada/entrega",
  out_for_delivery: "Saiu para entrega",
  delivered: "Entregue",
  cancelled: "Cancelado"
};
const FULFILLMENT_NEXT = {
  awaiting_confirmation: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: []
};

const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {
  status, headers: { "content-type": "application/json; charset=utf-8", ...headers }
});
const cents = value => (value / 100).toFixed(2);
const isObject = value => value && typeof value === "object" && !Array.isArray(value);
const isUuidV4 = value => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function trackingUrl(env, token) {
  return `${env.SITE_ORIGIN}/acompanhar/?token=${encodeURIComponent(token)}`;
}

function ensureFulfillment(order) {
  if (!order.fulfillmentStatus) {
    order.fulfillmentStatus = order.status === "approved" || order.status === "processed"
      ? "confirmed" : order.paymentTypeId === "cash" ? "awaiting_confirmation" : "awaiting_payment";
  }
  if (!Array.isArray(order.statusHistory)) {
    order.statusHistory = [{ status: order.fulfillmentStatus, at: order.updatedAt || order.createdAt, actor: "sistema" }];
  }
  return order;
}

function changeFulfillment(order, status, actor, note = null) {
  ensureFulfillment(order);
  if (order.fulfillmentStatus === status) return false;
  order.fulfillmentStatus = status;
  order.statusHistory.push({ status, at: new Date().toISOString(), actor, ...(note ? { note } : {}) });
  order.statusHistory = order.statusHistory.slice(-50);
  order.updatedAt = new Date().toISOString();
  return true;
}

function cors(request, env) {
  const origin = request.headers.get("origin");
  return origin === env.SITE_ORIGIN ? {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, GET, OPTIONS",
    "access-control-allow-headers": "content-type",
    vary: "Origin"
  } : {};
}

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function validateCustomer(customer) {
  if (!isObject(customer)) fail("Dados do cliente ausentes.");
  const name = String(customer.name || "").trim();
  const whatsapp = String(customer.whatsapp || "").replace(/\D/g, "");
  const address = String(customer.address || "").trim();
  if (name.length < 2 || name.length > 80) fail("Informe um nome válido.");
  if (whatsapp.length < 10 || whatsapp.length > 13) fail("Informe um WhatsApp válido.");
  if (address.length < 8 || address.length > 240) fail("Informe um endereço válido.");
  const location = isObject(customer.location) && Number.isFinite(customer.location.latitude) && Number.isFinite(customer.location.longitude)
    ? { latitude: customer.location.latitude, longitude: customer.location.longitude } : null;
  return { name, whatsapp, address, location };
}

function addonTotal(ids) {
  if (!Array.isArray(ids) || ids.length > Object.keys(ADDONS).length) fail("Adicionais inválidos.");
  const unique = new Set(ids);
  if (unique.size !== ids.length) fail("Adicionais duplicados.");
  return ids.reduce((total, id) => {
    if (typeof id !== "string" || !Object.hasOwn(ADDONS, id)) fail("Adicional inválido.");
    return total + ADDONS[id];
  }, 0);
}

function comboPrice(product, config) {
  if (!isObject(config) || !Array.isArray(config.burgers) || config.burgers.length !== product.slots) fail("Configuração do combo inválida.");
  let total = product.price;
  for (const choice of config.burgers) {
    if (!isObject(choice) || typeof choice.id !== "string" || !Object.hasOwn(COMBO_BURGERS, choice.id)) fail("Lanche do combo inválido.");
    if (COMBO_BURGERS[choice.id] === "double") total += 600;
    const extras = Array.isArray(choice.adicionais) ? choice.adicionais : [];
    if (choice.id === "plutao" && extras.length) fail("Plutão não aceita adicionais salgados.");
    total += addonTotal(extras);
  }
  const marciano = config.variante === "marciano";
  if (config.variante && config.variante !== "comum" && !marciano) fail("Versão do combo inválida.");
  if (marciano && !product.marciano) fail("Esta versão não está disponível neste combo.");
  if (marciano) total += 1500;
  const expectedFries = product.fries || (marciano ? 1 : 0);
  const fries = Array.isArray(config.batatas) ? config.batatas : [];
  if (fries.length !== expectedFries || fries.some(flavor => !FRY_FLAVORS.has(flavor))) fail("Escolha o preparo das batatas.");
  if (!product.drinks.includes(config.bebida)) fail("Bebida do combo inválida.");
  const extraLiter = config.extraLitro === true;
  if (extraLiter && !/1L/.test(config.bebida)) fail("Refrigerante extra indisponível.");
  if (extraLiter) total += 700;
  return total;
}

function addonDetails(ids) {
  return ids.length ? [`Adicionais: ${ids.map(id => ADDON_NAMES[id]).join(", ")}`] : [];
}

function lineForItem(item) {
  if (!isObject(item) || typeof item.id !== "string") fail("Item inválido.");
  if (!Object.hasOwn(PRODUCTS, item.id)) fail("Um item do cardápio não está disponível.");
  const product = PRODUCTS[item.id];
  const quantity = Number(item.quantidade);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) fail("Quantidade inválida.");
  let unitPrice = product.price;
  let details = [];
  if (product.type === "combo") {
    unitPrice = comboPrice(product, item.config);
    const config = item.config;
    details = config.burgers.map((choice, index) => {
      const burger = PRODUCTS[choice.id];
      const extras = Array.isArray(choice.adicionais) ? choice.adicionais : [];
      return [`Lanche ${index + 1}: ${burger.title}${COMBO_BURGERS[choice.id] === "double" ? " (duplo)" : ""}`, ...addonDetails(extras)].join(" — ");
    });
    if (config.variante === "marciano") details.push("Versão Marciana");
    if (Array.isArray(config.batatas)) details.push(...config.batatas.map((flavor, index) => `Batata ${config.batatas.length > 1 ? index + 1 + ": " : ""}${flavor}`));
    if (product.fixedDetails) details.push(...product.fixedDetails);
    if (product.batataIndividual) details.push("Batata individual incluída");
    details.push(`Bebida: ${config.bebida}`);
    if (config.extraLitro === true) details.push("Bebida extra de 1L");
  }
  else if (product.type === "fixed") {
    if (item.config || (Array.isArray(item.adicionais) && item.adicionais.length)) fail("Este item não aceita personalização.");
  }
  else if (product.custom === "lascas") {
    if (!isObject(item.config) || ![300, 500].includes(Number(item.config.peso)) || !FRY_FLAVORS.has(item.config.cobertura)) fail("Configuração das Lascas de Cometa inválida.");
    unitPrice += Number(item.config.peso) === 500 ? 1200 : 0;
    details = [`Porção: ${Number(item.config.peso)}g`, `Cobertura: ${item.config.cobertura}`];
  } else if (product.custom === "liter") {
    if (!isObject(item.config) || typeof item.config.extraLitro !== "boolean") fail("Configuração da bebida inválida.");
    unitPrice += item.config.extraLitro ? 700 : 0;
    details = [item.config.extraLitro ? "2 garrafas de 1L" : "1 garrafa de 1L"];
  } else {
    const extras = Array.isArray(item.adicionais) ? item.adicionais : [];
    if (product.sweet && extras.length) fail("Plutão não aceita adicionais salgados.");
    unitPrice += addonTotal(extras);
    details = addonDetails(extras);
  }
  return { title: product.title, unitPrice, quantity, details };
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(signed)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function sameHex(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

async function validWebhook(request, env, dataId) {
  if (!env.MP_WEBHOOK_SECRET) return false;
  const signature = request.headers.get("x-signature") || "";
  const requestId = request.headers.get("x-request-id") || "";
  const fields = Object.fromEntries(signature.split(",").map(part => part.trim().split("=")).filter(pair => pair.length === 2));
  if (!fields.ts || !fields.v1 || !dataId || !requestId) {
    console.warn("Mercado Pago webhook missing signature fields", {
      dataIdPresent: Boolean(dataId), requestIdPresent: Boolean(requestId),
      timestampPresent: Boolean(fields.ts), digestPresent: Boolean(fields.v1)
    });
    return false;
  }
  const manifest = `id:${dataId};request-id:${requestId};ts:${fields.ts};`;
  const valid = sameHex(await hmacHex(env.MP_WEBHOOK_SECRET, manifest), fields.v1);
  if (!valid) console.warn("Mercado Pago webhook signature mismatch");
  return valid;
}

async function createBrickSession(request, env, headers) {
  const body = await request.json().catch(() => fail("Pedido em formato inválido."));
  if (!isObject(body) || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) fail("Carrinho inválido.");
  const customer = validateCustomer(body.customer);
  const lines = body.items.map(lineForItem);
  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  if (!Number.isFinite(total) || total < 1) fail("Total do pedido inválido.");
  const localId = `CB-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const sessionId = crypto.randomUUID();
  const token = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const order = {
    localId, sessionId, trackingToken: token, channel: "online", paymentTypeId: null,
    expectedCents: total, currency: "BRL", status: "created", fulfillmentStatus: "awaiting_payment",
    statusHistory: [{ status: "awaiting_payment", at: createdAt, actor: "sistema" }],
    customer, lines, createdAt
  };
  const ttl = 60 * 60 * 24 * 30;
  await env.ORDERS.put(`brick-session:${sessionId}`, JSON.stringify(order), { expirationTtl: ttl });
  await env.ORDERS.put(`brick-local:${localId}`, sessionId, { expirationTtl: ttl });
  await env.ORDERS.put(`tracking:${token}`, `brick-session:${sessionId}`, { expirationTtl: ttl });
  await env.ORDERS.put(`admin-index:${localId}`, `brick-session:${sessionId}`, { expirationTtl: ttl });
  const checkoutUrl = `${env.SITE_ORIGIN}/checkout/pagamento/?session=${encodeURIComponent(sessionId)}`;
  return json({ checkoutUrl, sessionId, localId, trackingUrl: trackingUrl(env, token), amount: total / 100, currency: "BRL" }, 201, headers);
}

async function createCashOrder(request, env, headers) {
  const body = await request.json().catch(() => fail("Pedido em formato inválido."));
  if (!isObject(body) || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) fail("Carrinho inválido.");
  const customer = validateCustomer(body.customer);
  const lines = body.items.map(lineForItem);
  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  if (!Number.isSafeInteger(total) || total < 1) fail("Total do pedido inválido.");
  const localId = `CB-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const token = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const order = {
    localId, trackingToken: token, channel: "cash_whatsapp", paymentTypeId: "cash",
    expectedCents: total, currency: "BRL", status: "cash_on_delivery",
    fulfillmentStatus: "awaiting_confirmation",
    statusHistory: [{ status: "awaiting_confirmation", at: createdAt, actor: "cliente" }],
    customer, lines, createdAt, updatedAt: createdAt
  };
  const ttl = 60 * 60 * 24 * 30;
  await env.ORDERS.put(`cash:${localId}`, JSON.stringify(order), { expirationTtl: ttl });
  await env.ORDERS.put(`tracking:${token}`, `cash:${localId}`, { expirationTtl: ttl });
  await env.ORDERS.put(`admin-index:${localId}`, `cash:${localId}`, { expirationTtl: ttl });
  return json({ localId, trackingUrl: trackingUrl(env, token), amount: total / 100, currency: "BRL" }, 201, headers);
}

async function getBrickSession(env, headers, sessionId) {
  if (!isUuidV4(sessionId)) return json({ error: "Sessão inválida." }, 400, headers);
  const order = await env.ORDERS.get(`brick-session:${sessionId}`, "json");
  if (!order) return json({ error: "Esta sessão expirou. Volte ao cardápio para iniciar novamente." }, 404, headers);
  ensureFulfillment(order);
  if (!order.trackingToken) {
    order.trackingToken = crypto.randomUUID();
    const ttl = 60 * 60 * 24 * 30;
    const value = JSON.stringify(order);
    await env.ORDERS.put(`brick-session:${sessionId}`, value, { expirationTtl: ttl });
    if (order.paymentId) await env.ORDERS.put(`payment:${order.paymentId}`, value, { expirationTtl: ttl });
    await env.ORDERS.put(`tracking:${order.trackingToken}`, `brick-session:${sessionId}`, { expirationTtl: ttl });
    await env.ORDERS.put(`admin-index:${order.localId}`, `brick-session:${sessionId}`, { expirationTtl: ttl });
  } else {
    const trackKey = `tracking:${order.trackingToken}`;
    if (!(await env.ORDERS.get(trackKey))) await env.ORDERS.put(trackKey, `brick-session:${sessionId}`, { expirationTtl: 60 * 60 * 24 * 30 });
  }
  return json({
    sessionId: order.sessionId, localId: order.localId,
    amount: order.expectedCents / 100, currency: order.currency,
    lines: order.lines.map(line => ({ title: line.title, quantity: line.quantity, details: line.details || [] })),
    trackingUrl: trackingUrl(env, order.trackingToken),
    status: order.status, statusDetail: order.statusDetail || null,
    paymentId: order.paymentId || null, qrCode: order.qrCode || null,
    qrCodeBase64: order.qrCodeBase64 || null
  }, 200, { ...headers, "cache-control": "no-store" });
}

async function getTrackedOrder(env, headers, token) {
  if (!isUuidV4(token)) return json({ error: "Link de acompanhamento inválido." }, 400, { ...headers, "cache-control": "no-store" });
  const key = await env.ORDERS.get(`tracking:${token}`);
  if (!key || (!key.startsWith("cash:") && !key.startsWith("brick-session:"))) {
    return json({ error: "Este link expirou ou não foi encontrado." }, 404, { ...headers, "cache-control": "no-store" });
  }
  const order = await env.ORDERS.get(key, "json");
  if (!order || order.trackingToken !== token) return json({ error: "Este link expirou ou não foi encontrado." }, 404, { ...headers, "cache-control": "no-store" });
  ensureFulfillment(order);
  const label = order.paymentTypeId === "cash" ? "Dinheiro na entrega" : order.status === "approved" ? "Aprovado" : order.status;
  return json({
    localId: order.localId, amount: order.expectedCents / 100, currency: order.currency,
    paymentStatus: label, fulfillmentStatus: order.fulfillmentStatus,
    statusHistory: order.statusHistory,
    lines: order.lines.map(line => ({ title: line.title, quantity: line.quantity, details: line.details || [] })),
    createdAt: order.createdAt, updatedAt: order.updatedAt || order.createdAt
  }, 200, { ...headers, "cache-control": "no-store" });
}

function mapBrickPayload(body, saved) {
  const form = isObject(body.formData) ? body.formData : {};
  const rawPayer = isObject(form.payer) ? form.payer : {};
  const email = String(rawPayer.email || form.email || "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Informe um e-mail válido no formulário de pagamento.");
  const methodId = String(form.payment_method_id || form.paymentMethodId || (body.selectedPaymentMethod === "pix" ? "pix" : "")).trim();
  if (!methodId || methodId.length > 80) fail("Não foi possível identificar a forma de pagamento escolhida.");
  const payer = { email };
  const identification = isObject(rawPayer.identification) ? rawPayer.identification : null;
  if (identification && typeof identification.type === "string" && typeof identification.number === "string") {
    const type = identification.type.slice(0, 20);
    const number = identification.number.replace(/\D/g, "").slice(0, 30);
    if (type && number) payer.identification = { type, number };
  }
  const token = String(form.token || "");
  const installments = Number(form.installments);
  const payload = {
    transaction_amount: Number(cents(saved.expectedCents)),
    description: `Pedido Cosmos Burguer ${saved.localId}`,
    external_reference: saved.localId,
    payment_method_id: methodId,
    payer: { email: email },
    token: token || undefined,
    installments: token ? installments : undefined
  };
  if (identification && payer.identification) payload.payer.identification = payer.identification;
  if (rawPayer.first_name) payload.payer.first_name = String(rawPayer.first_name).slice(0, 80);
  if (rawPayer.last_name) payload.payer.last_name = String(rawPayer.last_name).slice(0, 80);
  if (methodId === "pix") {
    if (token) fail("Dados inesperados no pagamento Pix.");
  } else {
    if (!token || token.length > 512) fail("Não foi possível validar o cartão. Revise os dados e tente novamente.");
    if (!Number.isInteger(installments) || installments < 1 || installments > 24) fail("Selecione uma opção válida de parcelas.");
    const issuerId = form.issuer_id ?? form.issuerId;
    if (issuerId !== undefined && issuerId !== null && String(issuerId)) payload.issuer_id = String(issuerId);
    payload.binary_mode = false;
  }
  return payload;
}

function derivePurchase(sessionOrder) {
  const amountCents = Number(sessionOrder.expectedCents);
  if (!Number.isSafeInteger(amountCents) || amountCents < 1 || !Array.isArray(sessionOrder.lines) || !sessionOrder.localId) {
    fail("O pedido salvo não é válido.", 409);
  }
  return { amountCents };
}

function paymentPublicData(payment) {
  const transaction = payment.point_of_interaction?.transaction_data || {};
  return { paymentId: String(payment.id), status: payment.status || "unknown", statusDetail: payment.status_detail || null,
    paymentMethodId: payment.payment_method_id || null, paymentTypeId: payment.payment_type_id || null,
    qrCode: transaction.qr_code || null, qrCodeBase64: transaction.qr_code_base64 || null };
}

async function createBrickPayment(request, env, headers) {
  const body = await request.json().catch(() => fail("Dados de pagamento inválidos."));
  const sessionId = String(body?.sessionId || "");
  const attemptId = String(body?.attemptId || "");
  if (!isUuidV4(sessionId) || !isUuidV4(attemptId)) fail("Sessão de pagamento inválida.");
  const key = `brick-session:${sessionId}`;
  const saved = await env.ORDERS.get(key, "json");
  if (!saved) fail("Esta sessão expirou. Volte ao cardápio para iniciar novamente.", 404);
  if (["approved", "pending", "in_process"].includes(saved.status) && saved.paymentId) {
    return json({ paymentId: saved.paymentId, status: saved.status, statusDetail: saved.statusDetail || null, qrCode: saved.qrCode || null, qrCodeBase64: saved.qrCodeBase64 || null }, 200, headers);
  }
  const purchase = derivePurchase(saved);
  const payload = mapBrickPayload(body, { ...saved, expectedCents: purchase.amountCents });
  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}`, "content-type": "application/json", "x-idempotency-key": attemptId },
    body: JSON.stringify(payload)
  });
  const payment = await response.json().catch(() => ({}));
  if (!response.ok || !payment.id) {
    console.error("Mercado Pago payment creation failed", response.status);
    return json({ error: "Não foi possível concluir o pagamento. Confira os dados e tente novamente." }, 502, headers);
  }
  const amountMatches = Math.round(Number(payment.transaction_amount) * 100) === saved.expectedCents;
  const referenceMatches = payment.external_reference === saved.localId && payment.currency_id === "BRL";
  const status = amountMatches && referenceMatches ? payment.status : "review_required";
  const result = { ...paymentPublicData(payment), status };
  saved.paymentId = String(payment.id);
  saved.status = status;
  saved.statusDetail = payment.status_detail || null;
  saved.paymentMethodId = payment.payment_method_id || null;
  saved.paymentTypeId = payment.payment_type_id || null;
  saved.paidAmount = payment.transaction_amount ?? null;
  saved.qrCode = result.qrCode;
  saved.qrCodeBase64 = result.qrCodeBase64;
  saved.updatedAt = new Date().toISOString();
  ensureFulfillment(saved);
  if (status === "approved" && saved.fulfillmentStatus === "awaiting_payment") changeFulfillment(saved, "confirmed", "mercado_pago");
  const ttl = 60 * 60 * 24 * 30;
  await env.ORDERS.put(key, JSON.stringify(saved), { expirationTtl: ttl });
  await env.ORDERS.put(`payment:${payment.id}`, JSON.stringify(saved), { expirationTtl: ttl });
  return json(result, 201, headers);
}

async function processWebhookPayment(dataId, env, webhook = {}) {
  const remote = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`, { headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}` } });
  const payment = await remote.json().catch(() => ({}));
  if (!remote.ok) throw new Error(`Mercado Pago payment lookup failed: ${remote.status}`);
  let saved = await env.ORDERS.get(`payment:${dataId}`, "json");
  if (!saved && typeof payment.external_reference === "string") {
    const sessionId = await env.ORDERS.get(`brick-local:${payment.external_reference}`);
    if (sessionId) saved = await env.ORDERS.get(`brick-session:${sessionId}`, "json");
  }
  if (!saved || payment.external_reference !== saved.localId) return;
  const amountMatches = Math.round(Number(payment.transaction_amount) * 100) === saved.expectedCents && payment.currency_id === "BRL";
  saved.status = amountMatches ? payment.status : "review_required";
  saved.statusDetail = payment.status_detail || null;
  saved.paymentMethodId = payment.payment_method_id || saved.paymentMethodId || null;
  saved.paymentTypeId = payment.payment_type_id || saved.paymentTypeId || null;
  saved.paidAmount = payment.transaction_amount ?? null;
  saved.paymentId = String(payment.id);
  saved.qrCode = payment.point_of_interaction?.transaction_data?.qr_code || saved.qrCode || null;
  saved.qrCodeBase64 = payment.point_of_interaction?.transaction_data?.qr_code_base64 || saved.qrCodeBase64 || null;
  saved.updatedAt = new Date().toISOString();
  ensureFulfillment(saved);
  if (saved.status === "approved" && saved.fulfillmentStatus === "awaiting_payment") changeFulfillment(saved, "confirmed", "mercado_pago");
  saved.lastPaymentWebhookAt = webhook.receivedAt || new Date().toISOString();
  saved.lastPaymentWebhookAction = webhook.action || null;
  const ttl = 60 * 60 * 24 * 30;
  const value = JSON.stringify(saved);
  await env.ORDERS.put(`brick-session:${saved.sessionId}`, value, { expirationTtl: ttl });
  await env.ORDERS.put(`payment:${payment.id}`, value, { expirationTtl: ttl });
}

async function receiveWebhook(request, env, ctx) {
  const body = await request.json().catch(() => ({}));
  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id") || body?.data?.id;
  if (!(await validWebhook(request, env, dataId))) return json({ error: "Assinatura inválida." }, 401);
  if (body.type === "payment" || (typeof body.action === "string" && body.action.startsWith("payment."))) {
    const notificationId = String(body.id || `${dataId}:${request.headers.get("x-request-id") || ""}`);
    const dedupeKey = `webhook:payment:${notificationId}`;
    const job = (async () => {
      if (await env.ORDERS.get(dedupeKey)) return;
      await processWebhookPayment(String(dataId), env, { action: body.action || null, receivedAt: new Date().toISOString() });
      await env.ORDERS.put(dedupeKey, "processed", { expirationTtl: 60 * 60 * 24 * 30 });
    })().catch(error => console.error("Mercado Pago webhook processing failed", error));
    ctx.waitUntil(job);
  }
  return json({ received: true });
}

const ADMIN_PAGE = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pedidos · Cosmos Burguer</title><style>
:root{color-scheme:dark;font:15px system-ui,sans-serif;background:#0b0b10;color:#f5eee5}body{margin:0;padding:clamp(14px,3vw,28px)}main{max-width:1280px;margin:auto}h1{color:#f5c96a;margin:0 0 6px}p{color:#c7c0b8;line-height:1.5}form{display:flex;gap:10px;max-width:520px}input,button{font:inherit;border-radius:10px;padding:11px 13px}input{flex:1;min-width:0;background:#171721;color:#fff;border:1px solid #45455b}button{border:0;background:#f5c96a;color:#17110a;font-weight:750;cursor:pointer}button:disabled{opacity:.55;cursor:wait}.subtle{background:#272431;border:1px solid #484353;color:#f5eee5}.actions{display:flex;flex-wrap:wrap;gap:7px;min-width:190px}.actions a,.actions button{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border-radius:9px;padding:9px 10px;font-size:.82rem}.actions .subtle{background:#272431;border:1px solid #484353;color:#f5eee5}#status{min-height:22px}.tabela{overflow:auto;border:1px solid #30303a;border-radius:14px}table{border-collapse:collapse;width:100%;min-width:1000px}th,td{text-align:left;vertical-align:top;padding:12px;border-bottom:1px solid #30303a;white-space:pre-line;line-height:1.45}th{color:#f5c96a;position:sticky;top:0;background:#14131a}td small{display:block;color:#b9b2aa;margin-top:5px}a{color:#f5c96a}#refresh{margin:12px 0}
</style><main><h1>Pedidos Cosmos Burguer</h1><p>Confirme os pedidos recebidos e atualize o preparo e a entrega. As mensagens do WhatsApp são preparadas para revisão; a equipe precisa tocar em Enviar.</p><form id="login"><input id="token" type="password" autocomplete="current-password" placeholder="Senha administrativa" required><button>Entrar</button></form><button id="refresh" class="subtle" type="button" hidden>Atualizar agora</button><p id="status" role="status" aria-live="polite"></p><div class="tabela"><table hidden><thead><tr><th>Pedido / data</th><th>Andamento / pagamento</th><th>Itens / total</th><th>Cliente / entrega</th><th>Ações</th></tr></thead><tbody></tbody></table></div><script>
let bearer="",busy=false;const form=document.querySelector("#login"),input=document.querySelector("#token"),status=document.querySelector("#status"),table=document.querySelector("table"),body=document.querySelector("tbody"),refresh=document.querySelector("#refresh");
const stages={awaiting_payment:"Aguardando pagamento",awaiting_confirmation:"Aguardando confirmação da loja",confirmed:"Pedido confirmado",preparing:"Em preparo",ready:"Pronto para retirada/entrega",out_for_delivery:"Saiu para entrega",delivered:"Entregue",cancelled:"Cancelado"};
const next={awaiting_confirmation:[["confirmed","Confirmar pedido"],["cancelled","Cancelar"]],confirmed:[["preparing","Iniciar preparo"],["cancelled","Cancelar"]],preparing:[["ready","Marcar como pronto"],["cancelled","Cancelar"]],ready:[["out_for_delivery","Saiu para entrega"],["cancelled","Cancelar"]],out_for_delivery:[["delivered","Marcar como entregue"],["cancelled","Cancelar"]]};
function addCell(row,value){const cell=document.createElement("td");cell.textContent=value;row.append(cell);return cell}
function button(label,handler){const el=document.createElement("button");el.type="button";el.textContent=label;el.addEventListener("click",handler);return el}
function messageLink(order,customer){const digits=String(customer.whatsapp||"").replace(/\\D/g,"");if(digits.length<10)return null;const phone=digits.startsWith("55")?digits:"55"+digits;const text="Olá, "+(customer.name||"")+"! Atualização do pedido "+order.localId+": "+(stages[order.fulfillmentStatus]||order.fulfillmentStatus)+". Acompanhe aqui: "+order.trackingUrl;const link=document.createElement("a");link.href="https://wa.me/"+phone+"?text="+encodeURIComponent(text);link.target="_blank";link.rel="noopener noreferrer";link.className="subtle";link.textContent="WhatsApp pronto";return link}
async function updateOrder(order,target,control){control.disabled=true;try{const response=await fetch("/api/admin/orders/"+encodeURIComponent(order.localId)+"/status",{method:"POST",headers:{Authorization:"Bearer "+bearer,"content-type":"application/json"},body:JSON.stringify({status:target})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"Não foi possível atualizar o pedido.");await loadOrders()}catch(error){status.textContent=error.message;control.disabled=false}}
async function loadOrders(){if(busy||!bearer)return;busy=true;status.textContent="Atualizando pedidos…";try{const response=await fetch("/api/admin/orders",{headers:{Authorization:"Bearer "+bearer},cache:"no-store"});if(!response.ok)throw new Error(response.status===401?"Senha inválida ou não configurada.":"Não foi possível carregar os pedidos.");const data=await response.json();body.replaceChildren();for(const order of data.orders){const row=document.createElement("tr"),customer=order.customer||{},created=new Date(order.createdAt).toLocaleString("pt-BR"),lines=(order.lines||[]).map(line=>[line.quantity+" × "+line.title,...(line.details||[]).map(detail=>"  · "+detail)].join("\n")).join("\n"),payment=order.paymentTypeId==="cash"?"Dinheiro na entrega":({created:"Aguardando pagamento",pending:"Pix aguardando pagamento",in_process:"Pagamento em análise",approved:"Pago",review_required:"Revisar valor",processed:"Pago",failed:"Recusado",rejected:"Recusado",canceled:"Cancelado",cancelled:"Cancelado",expired:"Expirado",refunded:"Reembolsado"})[order.status]||order.status||"—",audit=[order.paymentTypeId,order.paymentMethodId].filter(Boolean).join(" / ");addCell(row,order.localId+"\n"+created);addCell(row,(stages[order.fulfillmentStatus]||"Aguardando pagamento")+"\nPagamento: "+payment+(order.statusDetail?" · "+order.statusDetail:"")+(audit?"\nMeio: "+audit:"")+(order.lastPaymentWebhookAt?"\nWebhook: "+new Date(order.lastPaymentWebhookAt).toLocaleString("pt-BR"):""));addCell(row,lines+"\nTotal: "+new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format((order.expectedCents||0)/100));addCell(row,[customer.name,customer.whatsapp,customer.address].filter(Boolean).join("\n"));const actions=document.createElement("td"),wrap=document.createElement("div");wrap.className="actions";for(const [target,label] of next[order.fulfillmentStatus]||[]){const control=button(label,()=>updateOrder(order,target,control));wrap.append(control)}const track=document.createElement("a");track.href=order.trackingUrl;track.target="_blank";track.rel="noopener noreferrer";track.textContent="Ver rastreamento";wrap.append(track);const wa=messageLink(order,customer);if(wa)wrap.append(wa);actions.append(wrap);row.append(actions);body.append(row)}table.hidden=false;refresh.hidden=false;status.textContent=data.orders.length?data.orders.length+" pedido(s). Atualizado agora; atualização automática em até 2 min.":"Nenhum pedido encontrado. Atualizado agora.")}catch(error){status.textContent=error.message}finally{busy=false}}
form.addEventListener("submit",event=>{event.preventDefault();bearer=input.value;input.value="";loadOrders()});refresh.addEventListener("click",loadOrders);window.setInterval(loadOrders,120000);
</script></main></html>`;

async function adminOrders(request, env) {
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!env.ADMIN_TOKEN || !sameHex(bearer, env.ADMIN_TOKEN)) return json({ error: "Não autorizado." }, 401, { "cache-control": "no-store" });
  const marker = "admin-index:legacy-backfill-v1";
  if (!(await env.ORDERS.get(marker))) {
    for (const prefix of ["payment:", "mp:"]) {
      let cursor;
      do {
        const page = await env.ORDERS.list({ prefix, limit: 1000, ...(cursor ? { cursor } : {}) });
        for (const key of page.keys) {
          const order = await env.ORDERS.get(key.name, "json");
          if (!order?.localId) continue;
          ensureFulfillment(order);
          if (!order.trackingToken) order.trackingToken = crypto.randomUUID();
          const target = order.sessionId ? `brick-session:${order.sessionId}` : key.name;
          const ttl = 60 * 60 * 24 * 30;
          await env.ORDERS.put(`admin-index:${order.localId}`, target, { expirationTtl: ttl });
          await env.ORDERS.put(`tracking:${order.trackingToken}`, target, { expirationTtl: ttl });
          await env.ORDERS.put(target, JSON.stringify(order), { expirationTtl: ttl });
        }
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);
    }
    await env.ORDERS.put(marker, "done", { expirationTtl: 60 * 60 * 24 * 30 });
  }
  const keys = [];
  let cursor;
  do {
    const page = await env.ORDERS.list({ prefix: "admin-index:", limit: 1000, ...(cursor ? { cursor } : {}) });
    keys.push(...page.keys.filter(key => key.name !== marker));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor && keys.length < 10000);
  const deduped = new Map();
  for (const key of keys) {
    const orderKey = await env.ORDERS.get(key.name);
    const order = orderKey ? await env.ORDERS.get(orderKey, "json") : null;
    if (!order) continue;
    ensureFulfillment(order);
    if (!order.trackingToken) order.trackingToken = crypto.randomUUID();
    const ttl = 60 * 60 * 24 * 30;
    await env.ORDERS.put(`tracking:${order.trackingToken}`, orderKey, { expirationTtl: ttl });
    order.trackingUrl = trackingUrl(env, order.trackingToken);
    await env.ORDERS.put(orderKey, JSON.stringify(order), { expirationTtl: ttl });
    const previous = deduped.get(order.localId);
    if (!previous || String(order.updatedAt || order.createdAt).localeCompare(String(previous.updatedAt || previous.createdAt)) >= 0) deduped.set(order.localId, order);
  }
  const orders = [...deduped.values()].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 200);
  return json({ orders }, 200, { "cache-control": "no-store", "x-content-type-options": "nosniff" });
}

async function updateAdminOrderStatus(request, env, localId) {
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!env.ADMIN_TOKEN || !sameHex(bearer, env.ADMIN_TOKEN)) return json({ error: "Não autorizado." }, 401, { "cache-control": "no-store" });
  if (!/^CB-[A-Z0-9-]{8,64}$/.test(localId)) fail("Número do pedido inválido.", 400);
  const body = await request.json().catch(() => fail("Atualização inválida."));
  const target = String(body?.status || "");
  if (!Object.hasOwn(FULFILLMENT_LABELS, target) || ["awaiting_payment", "awaiting_confirmation"].includes(target)) fail("Etapa inválida.", 400);
  const sessionId = await env.ORDERS.get(`brick-local:${localId}`);
  let key = sessionId ? `brick-session:${sessionId}` : `cash:${localId}`;
  let order = await env.ORDERS.get(key, "json");
  if (!order && !sessionId) {
    const indexedKey = await env.ORDERS.get(`admin-index:${localId}`);
    if (indexedKey && /^(?:payment|mp):/.test(indexedKey)) {
      key = indexedKey;
      order = await env.ORDERS.get(key, "json");
    }
  }
  if (!order) fail("Pedido não encontrado.", 404);
  ensureFulfillment(order);
  if (order.channel !== "cash_whatsapp" && order.status !== "approved") fail("Só é possível encaminhar para preparo após a confirmação do pagamento.", 409);
  if (!(FULFILLMENT_NEXT[order.fulfillmentStatus] || []).includes(target)) fail("Esta mudança de etapa não é permitida.", 409);
  changeFulfillment(order, target, "loja");
  const ttl = 60 * 60 * 24 * 30;
  const value = JSON.stringify(order);
  await env.ORDERS.put(key, value, { expirationTtl: ttl });
  if (order.paymentId) await env.ORDERS.put(`payment:${order.paymentId}`, value, { expirationTtl: ttl });
  await env.ORDERS.put(`admin-index:${localId}`, key, { expirationTtl: ttl });
  return json({ ok: true, localId, fulfillmentStatus: order.fulfillmentStatus }, 200, { "cache-control": "no-store" });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const headers = cors(request, env);
    if (request.method === "OPTIONS") return new Response(null, { headers });
    try {
      if (url.pathname === "/api/mp-config" && request.method === "GET") {
        return env.MP_PUBLIC_KEY
          ? json({ publicKey: env.MP_PUBLIC_KEY }, 200, { ...headers, "cache-control": "no-store, max-age=0" })
          : json({ error: "Checkout online temporariamente indisponível." }, 503, { ...headers, "cache-control": "no-store, max-age=0" });
      }
      if (url.pathname === "/api/brick/session" && request.method === "POST") {
        if (request.headers.get("origin") !== env.SITE_ORIGIN) return json({ error: "Origem não autorizada." }, 403, headers);
        if (!env.MP_PUBLIC_KEY) return json({ error: "Checkout online temporariamente indisponível." }, 503, headers);
        return await createBrickSession(request, env, headers);
      }
      if (url.pathname === "/api/orders/cash" && request.method === "POST") {
        if (request.headers.get("origin") !== env.SITE_ORIGIN) return json({ error: "Origem não autorizada." }, 403, headers);
        return await createCashOrder(request, env, headers);
      }
      if (url.pathname.startsWith("/api/orders/track/") && request.method === "GET") {
        if (request.headers.get("origin") !== env.SITE_ORIGIN) return json({ error: "Origem não autorizada." }, 403, headers);
        return await getTrackedOrder(env, headers, url.pathname.split("/").pop());
      }
      if (url.pathname === "/api/brick/payment" && request.method === "POST") {
        if (request.headers.get("origin") !== env.SITE_ORIGIN) return json({ error: "Origem não autorizada." }, 403, headers);
        return await createBrickPayment(request, env, headers);
      }
      if (url.pathname.startsWith("/api/brick/session/") && request.method === "GET") {
        if (request.headers.get("origin") !== env.SITE_ORIGIN) return json({ error: "Origem não autorizada." }, 403, headers);
        return await getBrickSession(env, headers, url.pathname.split("/").pop());
      }
      if (url.pathname === "/api/webhook/mercado-pago" && request.method === "POST") return receiveWebhook(request, env, ctx);
      if (url.pathname === "/gestao" && request.method === "GET") return new Response(ADMIN_PAGE, { headers: {
        "content-type": "text/html; charset=utf-8", "cache-control": "no-store",
        "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
        "x-content-type-options": "nosniff", "referrer-policy": "no-referrer"
      } });
      if (url.pathname === "/api/admin/orders" && request.method === "GET") return await adminOrders(request, env);
      const statusMatch = url.pathname.match(/^\/api\/admin\/orders\/([^/]+)\/status$/);
      if (statusMatch && request.method === "POST") return await updateAdminOrderStatus(request, env, decodeURIComponent(statusMatch[1]));
      return json({ error: "Rota não encontrada." }, 404, headers);
    } catch (error) {
      console.error(error);
      return json({ error: error.message || "Erro inesperado." }, error.status || 500, headers);
    }
  }
};
