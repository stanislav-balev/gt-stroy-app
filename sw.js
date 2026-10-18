// Network-first: online you always get the latest version; offline the last cached copy is used.
const CACHE="gt-stroy-v3";
const FILES=["./","./index.html","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png","./fonts/fonts.css","./fonts/golos-cyrillic.woff2","./fonts/golos-latin.woff2","./fonts/unbounded-cyrillic.woff2","./fonts/unbounded-latin.woff2"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting();});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))));self.clients.claim();});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  e.respondWith(fetch(e.request,{cache:"no-cache"}).then(res=>{if(res.ok){const c=res.clone();caches.open(CACHE).then(x=>x.put(e.request,c));}return res;})
    .catch(()=>caches.match(e.request).then(r=>r||caches.match("./index.html"))));
});
