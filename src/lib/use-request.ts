import { useCallback, useEffect, useState } from 'react';

type Result<T> = { key: string; data?: T; error?: Error };

const cache = new Map<string, unknown>();

/**
 * Tiny data-fetching hook with abort-on-change and an in-memory cache keyed by `key`.
 * Pass `null` as the key to skip fetching.
 */
export function useRequest<T>(key: string | null, fetcher: (signal: AbortSignal) => Promise<T>) {
  const [result, setResult] = useState<Result<T> | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetcher(controller.signal)
      .then((data) => {
        cache.set(key, data);
        setResult({ key, data });
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) setResult({ key, error });
      });
    return () => controller.abort();
    // `fetcher` is expected to change whenever `key` does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const current = result?.key === key ? result : null;
  const data = key ? (current?.data ?? (cache.get(key) as T | undefined)) : undefined;
  const error = current?.error;
  const loading = !!key && data === undefined && !error;

  const retry = useCallback(() => {
    setResult(null);
    setAttempt((n) => n + 1);
  }, []);

  return { data, error, loading, retry };
}

export function useDebouncedValue<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
