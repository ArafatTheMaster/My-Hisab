// My Hisab service worker (v3)
// - index.html / page loads: ALWAYS network-first (so new versions are never hidden by cache); cache is only an offline fallback
// - version checks (?cv=...) go straight to the network
// - everything else (icons, Firebase scripts): fast from cache, refreshed in the background
const V='hisab-v3';
const SHELL=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET')return;
  const ok=u.origin===location.origin||u.hostname==='www.gstatic.com';
  if(!ok)return;
  if(u.origin===location.origin&&u.searchParams.has('cv'))return; // update check -> network only
  const isPage=r.mode==='navigate'||u.pathname.endsWith('/')||u.pathname.endsWith('index.html');
  if(u.origin===location.origin&&isPage){
    e.respondWith(fetch(new Request(r.url,{cache:'no-store'})).then(res=>{
      if(res&&res.ok){const cp=res.clone();caches.open(V).then(c=>c.put('index.html',cp))}
      return res;
    }).catch(()=>caches.open(V).then(c=>c.match('index.html',{ignoreSearch:true})).then(h=>h||Response.error())));
    return;
  }
  e.respondWith(caches.open(V).then(async c=>{
    const hit=await c.match(r,{ignoreSearch:true});
    const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque'))c.put(r,res.clone());return res}).catch(()=>null);
    if(hit){net.catch(()=>{});return hit}
    const res=await net;
    return res||(r.mode==='navigate'?c.match('index.html'):Response.error());
  }));
});
