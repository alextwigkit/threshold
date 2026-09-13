// Prints a ready-to-run SQL insert for one account, using the exact same hashing as
// server/auth.ts (Node's global crypto.subtle matches the Workers runtime here).
// There is no signup route on purpose — accounts are created this way, by hand.
//
// Usage:
//   node --experimental-strip-types scripts/seed-user.mjs <username> <password> > seed.sql
//   wrangler d1 execute threshold-quota --remote --file=seed.sql
import { hashPassword } from '../server/auth.ts';

const [username, password] = process.argv.slice(2);
if (!username || !password) {
  console.error(
    'Usage: node --experimental-strip-types scripts/seed-user.mjs <username> <password>',
  );
  process.exit(1);
}
const { hash, salt } = await hashPassword(password);
const escape = (s) => s.replace(/'/g, "''");
console.log(
  `INSERT INTO users (username, password_hash, salt, created_at) VALUES ('${escape(username)}', '${hash}', '${salt}', ${Date.now()});`,
);
