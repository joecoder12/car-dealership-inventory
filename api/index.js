// Vercel serverless entrypoint. Wraps the compiled Express app from backend/dist
// (built by `npm run build`) so the SPA and the API share one origin, which keeps
// the SameSite=Strict session cookie first-party exactly as in local development.
import { createApp } from '../backend/dist/app.js';
import { loadConfig } from '../backend/dist/config/env.js';
import { createDatabaseClient } from '../backend/dist/db/client.js';

const config = loadConfig();
const db = createDatabaseClient(config.databaseUrl);

export default createApp({ db, config });
