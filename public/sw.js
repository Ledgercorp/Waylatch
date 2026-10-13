const CACHE='rescueledger-shell-v1';
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE);const response=await fetch('/');const html=await response.text();await cache.put('/',new Response(html,{headers:{'Content-Type':'text/html'}}));const assets=[...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(x=>x[1]);await cache.addAll(assets);await self.skipWaiting();})());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('rescueledger-shell-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})());});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match('/')));return;}
 if(url.pathname.startsWith('/assets/'))event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const clone=response.clone();void caches.open(CACHE).then(c=>c.put(event.request,clone));return response;})));
});
