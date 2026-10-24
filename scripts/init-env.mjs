// Creates .env from .env.example with a freshly generated JWT secret.
// Refuses to overwrite an existing .env so local changes are never lost.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const examplePath = `${root}.env.example`;
const envPath = `${root}.env`;

if (existsSync(envPath)) {
  console.log('.env already exists; leaving it unchanged.');
  process.exit(0);
}

const secret = randomBytes(48).toString('base64url');
const contents = readFileSync(examplePath, 'utf8').replace(
  /^JWT_SECRET=.*$/m,
  `JWT_SECRET=${secret}`,
);
writeFileSync(envPath, contents, { mode: 0o600 });
console.log('Created .env with a generated JWT_SECRET.');
