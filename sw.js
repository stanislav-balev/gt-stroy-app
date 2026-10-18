// Network-first: online you always get the latest version; offline the last cached copy is used.
// FILES are cached up front so the app also opens the very first time without a connection.
const CACHE="gt-stroy-v4";
const FILES=["./","./index.html","./manifest.webmanifest","./css/app.css",
  "./js/app.js","./js/ui.js","./js/state.js","./js/draw.js","./js/photos.js","./js/settings.js","./js/holidays.js","./js/templates.js","./js/parse.js",
  "./js/captions.js","./js/planner.js","./js/help.js","./js/forms.js","./js/nav.js","./js/wizard.js","./js/views.js","./js/version.js",
  "./icons/icon-192.png","./icons/icon-512.png","./fonts/fonts.css","./fonts/golos-cyrillic.woff2","./fonts/golos-latin.woff2","./fonts/unbounded-cyrillic.woff2","./fonts/unbounded-latin.woff2"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting();});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))));self.clients.claim();});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  e.respondWith(fetch(e.request,{cache:"no-cache"}).then(res=>{if(res.ok){const c=res.clone();caches.open(CACHE).then(x=>x.put(e.request,c));}return res;})
    .catch(()=>caches.match(e.request).then(r=>r||caches.match("./index.html"))));
});
