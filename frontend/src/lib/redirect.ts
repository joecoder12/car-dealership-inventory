/**
 * Accepts only in-app paths ("/vehicles/1"), never absolute or protocol-relative
 * URLs ("https://…", "//evil.example"), so a crafted ?redirect= link cannot
 * bounce a freshly signed-in user to another site.
 */
export function safeRedirectPath(target: string | null | undefined, fallback = '/'): string {
  if (!target || !target.startsWith('/') || target.startsWith('//') || target.includes('\\')) {
    return fallback;
  }
  return target;
}
