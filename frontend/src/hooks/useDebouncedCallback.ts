import { useEffect, useMemo, useRef } from 'react';

/**
 * Returns a stable function that runs `callback` once calls have stopped for
 * `delayMs`. Pending calls are dropped on unmount or via `.cancel()`.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
) {
  const callbackRef = useRef(callback);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return useMemo(() => {
    const debounced = (...args: Args) => {
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => callbackRef.current(...args), delayMs);
    };
    debounced.cancel = () => window.clearTimeout(timerRef.current);
    return debounced;
  }, [delayMs]);
}
