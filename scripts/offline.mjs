import { readdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const root = 'dist/client';
async function walk(dir) {
  const items = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      items.map((x) =>
        x.isDirectory() ? walk(join(dir, x.name)) : [join(dir, x.name)],
      ),
    )
  ).flat();
}
const files = (await walk(root)).filter(
  (x) => !x.endsWith('sw.js') && !x.endsWith('.map'),
);
const urls = files.map((x) => '/' + x.slice(root.length + 1));
const hash = createHash('sha256');
for (const p of files) hash.update(await readFile(p));
const version = 'edge-' + hash.digest('hex').slice(0, 12);
await writeFile(
  join(root, 'sw.js'),
  `const CACHE=${JSON.stringify(version)};const FILES=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('edge-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith((async()=>{const cached=await caches.match(event.request);if(cached)return cached;try{return await fetch(event.request)}catch(e){if(event.request.mode==='navigate')return (await caches.match('/index.html'))||Response.error();return Response.error();}})());});
`,
);
console.log('Offline shell prepared:', urls.length, 'assets');
