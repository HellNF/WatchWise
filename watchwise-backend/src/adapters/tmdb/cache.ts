type CacheEntry<T> = { value: T; expiresAt: number };

const cache = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 12; // 12h

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCached<T>(
  key: string,
  value: T,
  ttl = DEFAULT_TTL_MS
) {
  cache.set(key, { value, expiresAt: Date.now() + ttl });
}
