import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('dist/server', { recursive: true });
await build({ entryPoints: ['server/worker.ts'], outfile: 'dist/server/index.js', bundle: true, format: 'esm', platform: 'browser', target: 'es2022' });
await writeFile('dist/server/wrangler.json', JSON.stringify({ name: 'edge-local', main: 'index.js', compatibility_date: '2026-05-15', assets: { directory: '../client', binding: 'ASSETS', run_worker_first: ['/api/*'] }, d1_databases: [{ binding: 'DB', database_name: 'edge-quota', database_id: '00000000-0000-4000-8000-000000000000' }] }, null, 2));
console.log('Edge API worker built; static interface retained.');
