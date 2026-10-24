/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// The root .env is shared with the backend; only VITE_* variables are exposed here.
const ENV_DIR = '..';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ENV_DIR, 'VITE_');
  // The SPA calls /api on its own origin; Vite forwards it to the API so the
  // session cookie stays first-party (SameSite=Strict) without any CORS setup.
  const proxy = { '/api': { target: env.VITE_API_PROXY_TARGET || 'http://localhost:4000' } };

  return {
    envDir: ENV_DIR,
    plugins: [react(), tailwindcss()],
    server: { port: 5180, strictPort: true, proxy },
    preview: { port: 5181, strictPort: true, proxy },
    test: {
      environment: 'jsdom',
      setupFiles: ['src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/test/**', 'src/main.tsx', 'src/**/*.test.{ts,tsx}', 'src/vite-env.d.ts'],
        reporter: ['text', 'html', 'json-summary'],
      },
    },
  };
});
