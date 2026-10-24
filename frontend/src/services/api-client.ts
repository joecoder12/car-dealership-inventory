export interface ApiErrorDetail {
  path: string;
  message: string;
}

/** Every failed API call surfaces as an ApiError with a stable `code`. */
export class ApiError extends Error {
  override name = 'ApiError';

  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: ApiErrorDetail[] = [],
  ) {
    super(message);
  }

  /** Maps validation details to `{ field: message }` for showing errors next to inputs. */
  fieldErrors(): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const detail of this.details) {
      errors[detail.path] ??= detail.message;
    }
    return errors;
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function readCookie(name: string): string | undefined {
  const match = document.cookie.split('; ').find((cookie) => cookie.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * Thin fetch wrapper for the backend. The session lives in an HttpOnly cookie
 * (never in JS-readable storage); for state-changing requests the readable CSRF
 * cookie is echoed in X-CSRF-Token, which the server checks against the JWT.
 */
export async function apiRequest<T = unknown>(
  path: string,
  { method = 'GET', body, headers = {}, signal }: RequestOptions = {},
): Promise<T> {
  const requestHeaders: Record<string, string> = { Accept: 'application/json', ...headers };
  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';
  if (!SAFE_METHODS.has(method)) {
    const csrfToken = readCookie('csrf_token');
    if (csrfToken) requestHeaders['X-CSRF-Token'] = csrfToken;
  }

  let response: Response;
  try {
    response = await fetch(new URL(`/api${path}`, window.location.origin), {
      method,
      credentials: 'include',
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Could not reach the server. Check your connection and try again.',
    );
  }

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const error = (payload as { error?: Partial<ApiError> } | undefined)?.error;
    if (error?.code && error.message) {
      throw new ApiError(response.status, error.code, error.message, error.details ?? []);
    }
    throw new ApiError(
      response.status,
      'HTTP_ERROR',
      `The server returned an unexpected response (${response.status}).`,
    );
  }
  return payload as T;
}

/** Builds `?a=1&b=2`, skipping undefined and empty-string values. */
export function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}
