class Cache {
  store: Map<string, { value: string; expireTime: number }> | null;
  constructor(store: Map<string, { value: string; expireTime: number }> | null) {
    this.store = store || new Map();
  }

  set(key: string, value: string, ttl: number) {
    const expireTime = Date.now() + ttl;
    this.store!.set(key, { value, expireTime });
    setTimeout(() => {
      this.store!.delete(key);
    }, ttl);
  }

  get(key: string) {
    const entry = this.store!.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expireTime) {
      this.store!.delete(key);
      return null;
    }
    return entry.value;
  }

  delete(key: string) {
    this.store!.delete(key);
  }
}

export default Cache;
