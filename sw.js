/* Cosmos Burguer — atualização de navegação para hospedagem estática. */
const VERSAO = "20260926.2";

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (evento) {
  evento.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function (evento) {
  if (evento.request.mode !== "navigate") return;

  evento.respondWith((async function () {
    const url = new URL(evento.request.url);
    url.searchParams.set("__cosmos", VERSAO + "-" + Date.now());

    try {
      return await fetch(url.href, {
        cache: "no-store",
        credentials: "same-origin",
        redirect: "follow"
      });
    } catch (erro) {
      return fetch(evento.request);
    }
  })());
});
