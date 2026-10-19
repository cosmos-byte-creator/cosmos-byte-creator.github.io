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
  "combo-viajante": { title: "Combo Viajante Espacial", price: 3690, type: "combo", slots: 1, fries: 0, marciano: false, drinks: ["Coca-Cola lata 350ml", "Guaraná lata 350ml"] },
  "combo-vortice": { title: "Combo Vórtice", price: 4990, type: "combo", slots: 2, fries: 0, marciano: true, drinks: ["Coca-Cola 1L", "Guaraná Antarctica 1L"] },
  "combo-abducao": { title: "Combo Abdução", price: 6490, type: "combo", slots: 3, fries: 0, marciano: true, drinks: ["Coca-Cola 1L", "Guaraná Antarctica 1L"] },
  "combo-nave-mae": { title: "Combo Nave Mãe", price: 8090, type: "combo", slots: 4, fries: 0, marciano: true, drinks: ["Coca-Cola 1L", "Guaraná Antarctica 1L"] },
  "combo-jornada": { title: "Combo Jornada Cósmica", price: 5190, type: "combo", slots: 1, fries: 0, marciano: false, drinks: ["Monster Energy lata"] },
  "combo-frota": { title: "Combo Frota Suprema", price: 13490, type: "combo", slots: 5, fries: 2, marciano: false, drinks: ["Coca-Cola 2L"] }
};

const ADDONS = {
  "hamburguer-120g": 700, "cebola-caramelizada": 300, "cebola-roxa": 300,
  picles: 300, "molho-catupiry": 300, "molho-cheddar": 300,
  "molho-baconnese": 300, bacon: 400, "queijo-cheddar": 300, "queijo-mussarela": 300
};
const COMBO_BURGERS = { mercurio: "simple", venus: "simple", terra: "simple", netuno: "simple", plutao: "simple", marte: "double", jupiter: "double", saturno: "double" };
const FRY_FLAVORS = new Set(["Catupiry e bacon", "Cheddar e bacon"]);

const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {
  status, headers: { "content-type": "application/json; charset=utf-8", ...headers }
});
const cents = value => (value / 100).toFixed(2);
const isObject = value => value && typeof value === "object" && !Array.isArray(value);

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

function lineForItem(item) {
  if (!isObject(item) || typeof item.id !== "string") fail("Item inválido.");
  if (!Object.hasOwn(PRODUCTS, item.id)) fail("Um item do cardápio não está disponível.");
  const product = PRODUCTS[item.id];
  const quantity = Number(item.quantidade);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) fail("Quantidade inválida.");
  let unitPrice = product.price;
  if (product.type === "combo") unitPrice = comboPrice(product, item.config);
  else if (product.custom === "lascas") {
    if (!isObject(item.config) || ![300, 500].includes(Number(item.config.peso)) || !FRY_FLAVORS.has(item.config.cobertura)) fail("Configuração das Lascas de Cometa inválida.");
    unitPrice += Number(item.config.peso) === 500 ? 1200 : 0;
  } else if (product.custom === "liter") {
    if (!isObject(item.config) || typeof item.config.extraLitro !== "boolean") fail("Configuração da bebida inválida.");
    unitPrice += item.config.extraLitro ? 700 : 0;
  } else {
    unitPrice += addonTotal(Array.isArray(item.adicionais) ? item.adicionais : []);
  }
  return { title: product.title, unitPrice, quantity };
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

async function createCheckout(request, env, headers) {
  const body = await request.json().catch(() => fail("Pedido em formato inválido."));
  if (!isObject(body) || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) fail("Carrinho inválido.");
  const customer = validateCustomer(body.customer);
  const lines = body.items.map(lineForItem);
  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const localId = `CB-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const returnUrl = `${new URL(request.url).origin}/checkout/return?order=${encodeURIComponent(localId)}`;
  const order = {
    type: "online", processing_mode: "manual", capture_mode: "automatic_async",
    total_amount: cents(total), external_reference: localId,
    description: `Pedido Cosmos Burguer ${localId}`,
    expiration_time: "P1D",
    config: { online: {
      success_url: `${returnUrl}&result=success`,
      failure_url: `${returnUrl}&result=failure`,
      pending_url: `${returnUrl}&result=pending`,
      auto_return: "all"
    } },
    items: lines.map(line => ({ title: line.title, unit_price: cents(line.unitPrice), quantity: line.quantity }))
  };
  const response = await fetch("https://api.mercadopago.com/v1/orders", {
    method: "POST",
    headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}`, "content-type": "application/json", "x-idempotency-key": crypto.randomUUID() },
    body: JSON.stringify(order)
  });
  const paymentOrder = await response.json().catch(() => ({}));
  if (!response.ok || !paymentOrder.checkout_url || !paymentOrder.id) {
    console.error("Mercado Pago order creation failed", response.status, JSON.stringify(paymentOrder));
    return json({ error: "Não foi possível criar o pagamento. Tente novamente." }, 502, headers);
  }
  await env.ORDERS.put(`mp:${paymentOrder.id}`, JSON.stringify({
    localId, mpOrderId: paymentOrder.id, expectedCents: total, status: paymentOrder.status,
    customer, lines, createdAt: new Date().toISOString()
  }), { expirationTtl: 60 * 60 * 24 * 30 });
  await env.ORDERS.put(`local:${localId}`, paymentOrder.id, { expirationTtl: 60 * 60 * 24 * 30 });
  return json({ checkoutUrl: paymentOrder.checkout_url, orderId: paymentOrder.id, localId }, 201, headers);
}

async function checkoutReturn(request, env) {
  const localId = new URL(request.url).searchParams.get("order") || "";
  if (!/^CB-[A-Z0-9]+-[A-F0-9]{8}$/.test(localId)) return new Response("Pedido inválido.", { status: 400 });
  const mpOrderId = await env.ORDERS.get(`local:${localId}`);
  if (!mpOrderId) return new Response("Pedido não encontrado.", { status: 404 });
  const saved = await env.ORDERS.get(`mp:${mpOrderId}`, "json");
  if (!saved || saved.localId !== localId) return new Response("Pedido não encontrado.", { status: 404 });
  const remote = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(mpOrderId)}`, {
    headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}` }
  });
  const paymentOrder = await remote.json().catch(() => ({}));
  const paid = remote.ok && paymentOrder.external_reference === localId &&
    paymentOrder.status === "processed" && paymentOrder.status_detail === "accredited" &&
    Math.round(Number(paymentOrder.total_paid_amount) * 100) >= saved.expectedCents;
  const failed = remote.ok && ["failed", "canceled"].includes(paymentOrder.status);
  const title = !remote.ok ? "Não foi possível consultar o pagamento" : paid ? "Pagamento confirmado" : failed ? "Pagamento não concluído" : "Pagamento ainda não confirmado";
  const message = paid
    ? "Recebemos a confirmação do Mercado Pago. Guarde o número do pedido para acompanhar com a loja."
    : !remote.ok ? "Tente atualizar esta página daqui a pouco ou consulte o pagamento no Mercado Pago."
      : failed ? "O pagamento não foi aprovado. Você pode voltar ao cardápio e tentar novamente."
      : "Ainda não recebemos confirmação do pagamento. Acompanhe pelo Mercado Pago antes de considerar o pedido concluído.";
  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Cosmos Burguer</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#080b19;color:#fff;font:16px system-ui,sans-serif}main{max-width:34rem;padding:2rem;margin:1rem;border:1px solid #4b5684;border-radius:18px;background:#151a33}h1{margin-top:0;color:#f5c96a}p{line-height:1.5}a{color:#f5c96a}</style><main><h1>${title}</h1><p>${message}</p><p>Pedido: <strong>${localId}</strong></p><a href="${env.SITE_ORIGIN}/">Voltar ao cardápio</a></main></html>`;
  return new Response(html, { status: remote.ok ? 200 : 502, headers: {
    "content-type": "text/html; charset=utf-8", "cache-control": "no-store",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    "x-content-type-options": "nosniff"
  } });
}

async function processWebhookOrder(dataId, env) {
  const remote = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(dataId)}`, { headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}` } });
  const paymentOrder = await remote.json().catch(() => ({}));
  if (!remote.ok) throw new Error(`Mercado Pago order lookup failed: ${remote.status}`);
  const key = `mp:${dataId}`;
  const saved = await env.ORDERS.get(key, "json");
  if (!saved) return;
  saved.status = paymentOrder.status;
  saved.statusDetail = paymentOrder.status_detail;
  saved.paidAmount = paymentOrder.total_paid_amount;
  saved.updatedAt = new Date().toISOString();
  await env.ORDERS.put(key, JSON.stringify(saved), { expirationTtl: 60 * 60 * 24 * 30 });
}

async function receiveWebhook(request, env, ctx) {
  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id");
  if (!(await validWebhook(request, env, dataId))) return json({ error: "Assinatura inválida." }, 401);
  ctx.waitUntil(processWebhookOrder(dataId, env).catch(error => console.error("Mercado Pago webhook processing failed", error)));
  return json({ received: true });
}

const ADMIN_PAGE = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pedidos · Cosmos Burguer</title><style>
:root{color-scheme:dark;font:15px system-ui,sans-serif;background:#0b0b10;color:#f5eee5}body{margin:0;padding:24px}main{max-width:1100px;margin:auto}h1{color:#f5c96a}form{display:flex;gap:10px;max-width:520px}input,button{font:inherit;border-radius:10px;padding:12px}input{flex:1;min-width:0;background:#171721;color:#fff;border:1px solid #45455b}button{border:0;background:#f5c96a;color:#17110a;font-weight:700;cursor:pointer}#status{min-height:24px;color:#c7c0b8}.tabela{overflow:auto}table{border-collapse:collapse;width:100%;min-width:800px}th,td{text-align:left;vertical-align:top;padding:12px;border-bottom:1px solid #30303a;white-space:pre-line}th{color:#f5c96a}small{color:#b9b2aa;line-height:1.6}a{color:#f5c96a}
</style><main><h1>Pedidos Cosmos Burguer</h1><p>Área privada da loja. O acesso fica apenas nesta sessão do navegador.</p><form id="login"><input id="token" type="password" autocomplete="current-password" placeholder="Senha administrativa" required><button>Entrar</button></form><p id="status" role="status"></p><div class="tabela"><table hidden><thead><tr><th>Pedido / data</th><th>Status</th><th>Itens</th><th>Cliente / entrega</th></tr></thead><tbody></tbody></table></div><script>
let bearer="";const form=document.querySelector("#login"),input=document.querySelector("#token"),status=document.querySelector("#status"),table=document.querySelector("table"),body=document.querySelector("tbody");
function addCell(row,value){const cell=document.createElement("td");cell.textContent=value;row.append(cell)}
function statusLabel(value){return ({created:"Aguardando pagamento",processed:"Pago",failed:"Recusado",canceled:"Cancelado",expired:"Expirado",refunded:"Reembolsado"})[value]||value||"—"}
async function loadOrders(){status.textContent="Carregando pedidos…";try{const response=await fetch("/api/admin/orders",{headers:{Authorization:"Bearer "+bearer},cache:"no-store"});if(!response.ok)throw new Error(response.status===401?"Senha inválida ou não configurada.":"Não foi possível carregar os pedidos.");const data=await response.json();body.replaceChildren();for(const order of data.orders){const row=document.createElement("tr"),created=new Date(order.createdAt).toLocaleString("pt-BR"),lines=(order.lines||[]).map(line=>line.quantity+" × "+line.title).join("\n"),customer=order.customer||{};addCell(row,order.localId+"\n"+created);addCell(row,statusLabel(order.status)+(order.statusDetail?" · "+order.statusDetail:""));addCell(row,lines+"\nTotal: "+new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format((order.expectedCents||0)/100));addCell(row,[customer.name,customer.whatsapp,customer.address].filter(Boolean).join("\n"));body.append(row)}table.hidden=false;status.textContent=data.orders.length?data.orders.length+" pedido(s). Atualizado agora.":"Nenhum pedido encontrado.")}catch(error){status.textContent=error.message}}
form.addEventListener("submit",event=>{event.preventDefault();bearer=input.value;input.value="";loadOrders()});
</script></main></html>`;

async function adminOrders(request, env) {
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!env.ADMIN_TOKEN || !sameHex(bearer, env.ADMIN_TOKEN)) return json({ error: "Não autorizado." }, 401, { "cache-control": "no-store" });
  const keys = [];
  let cursor;
  do {
    const page = await env.ORDERS.list({ prefix: "mp:", limit: 1000, ...(cursor ? { cursor } : {}) });
    keys.push(...page.keys);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor && keys.length < 10000);
  const orders = (await Promise.all(keys.map(key => env.ORDERS.get(key.name, "json"))))
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 200);
  return json({ orders }, 200, { "cache-control": "no-store", "x-content-type-options": "nosniff" });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const headers = cors(request, env);
    if (request.method === "OPTIONS") return new Response(null, { headers });
    try {
      if (url.pathname === "/api/checkout" && request.method === "POST") {
        if (request.headers.get("origin") !== env.SITE_ORIGIN) return json({ error: "Origem não autorizada." }, 403, headers);
        return createCheckout(request, env, headers);
      }
      if (url.pathname === "/checkout/return" && request.method === "GET") return checkoutReturn(request, env);
      if (url.pathname === "/api/webhook/mercado-pago" && request.method === "POST") return receiveWebhook(request, env, ctx);
      if (url.pathname === "/gestao" && request.method === "GET") return new Response(ADMIN_PAGE, { headers: {
        "content-type": "text/html; charset=utf-8", "cache-control": "no-store",
        "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
        "x-content-type-options": "nosniff", "referrer-policy": "no-referrer"
      } });
      if (url.pathname === "/api/admin/orders" && request.method === "GET") return adminOrders(request, env);
      if (url.pathname.startsWith("/api/order/") && request.method === "GET") {
        if (request.headers.get("origin") !== env.SITE_ORIGIN) return json({ error: "Origem não autorizada." }, 403, headers);
        const order = await env.ORDERS.get(`mp:${url.pathname.split("/").pop()}`, "json");
        return order ? json({ status: order.status, statusDetail: order.statusDetail || null }, 200, headers) : json({ error: "Pedido não encontrado." }, 404, headers);
      }
      return json({ error: "Rota não encontrada." }, 404, headers);
    } catch (error) {
      console.error(error);
      return json({ error: error.message || "Erro inesperado." }, error.status || 500, headers);
    }
  }
};
