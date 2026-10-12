import { useEffect, useMemo, useSyncExternalStore } from 'react';

export type ListPage<T> = { items: T[]; hasNextPage: boolean };

type Snapshot<T> = {
  items: T[];
  /** The last page loaded (0 before the first). */
  page: number;
  hasNext: boolean;
  /** `loading`: the first page; `more`: a later page. */
  status: 'idle' | 'loading' | 'more';
  /** The first page failed. */
  error?: Error;
  /** A later page failed; the list keeps what it has and offers a retry. */
  moreError?: Error;
};

type Fetcher<T> = (page: number, signal: AbortSignal) => Promise<ListPage<T>>;

/**
 * One paged list. It lives outside React so its pages survive the screen re-rendering or
 * coming back to the same query, and so concurrent loads are impossible: there is at most
 * one request in flight, and it is aborted once nobody is watching the list.
 */
class PagedList<T extends { id: number }> {
  private snapshot: Snapshot<T> = { items: [], page: 0, hasNext: true, status: 'loading' };
  private listeners = new Set<() => void>();
  private controller: AbortController | null = null;

  constructor(private fetchPage: Fetcher<T>) {}

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.cancel();
    };
  };

  /** Loads the first page unless it is loaded, loading or failed. */
  start() {
    if (this.snapshot.page === 0 && !this.controller && !this.snapshot.error) this.load(1);
  }

  /** Loads the next page. Safe to call on every scroll event. */
  loadMore = () => {
    const s = this.snapshot;
    if (this.controller || s.status !== 'idle' || !s.hasNext || s.moreError || s.page === 0) return;
    this.load(s.page + 1);
  };

  retry = () => {
    if (this.controller) return;
    if (this.snapshot.error) this.load(1);
    else if (this.snapshot.moreError) this.load(this.snapshot.page + 1);
  };

  private set(patch: Partial<Snapshot<T>>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((l) => l());
  }

  private cancel() {
    if (!this.controller) return;
    this.controller.abort();
    this.controller = null;
    // Nothing loaded in the meantime; the next `start` or `loadMore` asks again.
    this.set({ status: this.snapshot.page === 0 ? 'loading' : 'idle' });
  }

  private load(page: number) {
    const controller = new AbortController();
    this.controller = controller;
    this.set({ status: page === 1 ? 'loading' : 'more', error: undefined, moreError: undefined });
    this.fetchPage(page, controller.signal)
      .then(({ items, hasNextPage }) => {
        if (controller.signal.aborted) return;
        this.controller = null;
        const base = page === 1 ? [] : this.snapshot.items;
        // Rankings can shift between requests, so a show may come back on the next page.
        const seen = new Set(base.map((i) => i.id));
        const merged = base.concat(items.filter((i) => !seen.has(i.id)));
        // A page that adds nothing new would otherwise keep asking for more forever.
        const hasNext = hasNextPage && (page === 1 || merged.length > base.length);
        this.set({ items: merged, page, hasNext, status: 'idle' });
      })
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        this.controller = null;
        this.set(page === 1 ? { status: 'idle', error } : { status: 'idle', moreError: error });
      });
  }
}

/** Recently used lists, so going back to a query shows its pages instantly. */
const lists = new Map<string, PagedList<{ id: number }>>();
const MAX_LISTS = 20;

function listFor<T extends { id: number }>(key: string, fetchPage: Fetcher<T>): PagedList<T> {
  let list = lists.get(key) as PagedList<T> | undefined;
  if (list) {
    lists.delete(key);
  } else {
    list = new PagedList(fetchPage);
  }
  lists.set(key, list as unknown as PagedList<{ id: number }>);
  if (lists.size > MAX_LISTS) lists.delete(lists.keys().next().value!);
  return list;
}

/**
 * Infinite, paged list keyed by `key`: a new key is a new list. `fetchPage` must return the
 * same results for the same key; it is only read when the list is first created.
 */
export function useInfiniteList<T extends { id: number }>(key: string, fetchPage: Fetcher<T>) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const list = useMemo(() => listFor(key, fetchPage), [key]);
  const s = useSyncExternalStore(list.subscribe, list.getSnapshot);

  useEffect(() => {
    list.start();
  }, [list]);

  return {
    items: s.items,
    loading: s.status === 'loading' && s.page === 0,
    loadingMore: s.status === 'more',
    error: s.error,
    moreError: s.moreError,
    hasNext: s.hasNext,
    loadMore: list.loadMore,
    retry: list.retry,
  };
}
