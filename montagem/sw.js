const CACHE='cosmos-montagem-v1';
const ARQUIVOS=['./','./index.html','./manifest.webmanifest','./icon.svg','../images/MercurioMontagem.png','../images/VenusMontagem.png','../images/TerraMontagem.png','../images/MarteMontagem.png','../images/JupiterMontagem.png','../images/SaturnoMontagem.png','../images/NetunoMontagem.png','../images/PlutãoMontagem.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ARQUIVOS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('cosmos-montagem-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{const copia=r.clone();caches.open(CACHE).then(cache=>cache.put(e.request,copia));return r;}).catch(()=>caches.match('./'))));});
