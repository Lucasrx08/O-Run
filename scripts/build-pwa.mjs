import {readdir,readFile,writeFile,cp,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const assets=await readdir('dist/assets');
const index=await readFile('dist/index.html');
const hash=createHash('sha256').update(index).update(assets.join('|')).digest('hex').slice(0,12);
const files=['./','./index.html','./logo.svg','./favicon.svg','./terrain.svg','./contours.svg','./fonts/nunito.ttf','./fonts/outfit.ttf','./manifest.webmanifest','./icon-192.png','./icon-512.png',...assets.map(x=>'./assets/'+x)];
await mkdir('dist/docs',{recursive:true});await cp('docs','dist/docs',{recursive:true});

// Les navigations consultent toujours le réseau d'abord. En l'absence de connexion,
// le dernier écran validé reste disponible ; les assets versionnés sont immuables.
const worker=`const CACHE='orun-shell-${hash}';
const ASSETS=${JSON.stringify(files)};
const HOME=new URL('./index.html',self.registration.scope).href;
const ASSET_URLS=new Set(ASSETS.map(a=>new URL(a,self.registration.scope).href));
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('orun-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin)return;
 if(req.mode==='navigate'||url.href===HOME){
  event.respondWith((async()=>{
   const cache=await caches.open(CACHE);
   try{const response=await fetch(req,{cache:'no-store'});if(response.ok)await cache.put(HOME,response.clone());return response;}
   catch{const saved=await cache.match(HOME);if(saved)return saved;return Response.error();}
  })());return;
 }
 if(!ASSET_URLS.has(url.href))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const saved=await cache.match(req);if(saved)return saved;
  const response=await fetch(req);if(response.ok)await cache.put(req,response.clone());return response;
 })());
});`;
await writeFile('dist/sw.js',worker);
console.log('PWA '+hash+' : mise à jour immédiate, navigation réseau d’abord, hors-ligne conservé.');
