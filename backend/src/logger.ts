/** Minimal logging port so the app can be given a quiet logger in tests. */
export interface Logger {
  info(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export const consoleLogger: Logger = {
  info: (...args) => console.log(...args),
  error: (...args) => console.error(...args),
};
