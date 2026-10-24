/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** ISO 4217 code used to format prices (defaults to USD). */
  readonly VITE_CURRENCY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
