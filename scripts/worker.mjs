import { build } from 'esbuild';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
await mkdir('dist/server', { recursive: true });
// wrangler only auto-loads .dev.vars from next to the config file it's given, not the
// project root, so `wrangler dev --config dist/server/wrangler.json` needs its own copy.
if (existsSync('.dev.vars'))
  await copyFile('.dev.vars', 'dist/server/.dev.vars');
await build({
  entryPoints: ['server/worker.ts'],
  outfile: 'dist/server/index.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
});
// account_id/database_id come from the environment so real deploy credentials are never
// committed. Unset locally, the placeholder database_id keeps `wrangler dev` working as before.
const config = {
  name: 'threshold',
  main: 'index.js',
  compatibility_date: '2026-05-15',
  // The Worker now gates every route (session auth), not just /api/*, so it must run first everywhere.
  assets: { directory: '../client', binding: 'ASSETS', run_worker_first: true },
  d1_databases: [
    {
      binding: 'DB',
      database_name: 'threshold-quota',
      database_id:
        process.env.THRESHOLD_DB_ID ?? '00000000-0000-4000-8000-000000000000',
    },
  ],
};
if (process.env.CLOUDFLARE_ACCOUNT_ID)
  config.account_id = process.env.CLOUDFLARE_ACCOUNT_ID;
await writeFile('dist/server/wrangler.json', JSON.stringify(config, null, 2));
console.log('Threshold API worker built; static interface retained.');
