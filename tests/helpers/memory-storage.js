/** localStorage giả lập trong bộ nhớ, để chạy test bằng Node (Node không có localStorage). */
export class MemoryStorage {
  #data = new Map();

  get length() {
    return this.#data.size;
  }
  key(i) {
    return [...this.#data.keys()][i] ?? null;
  }
  getItem(key) {
    return this.#data.has(key) ? this.#data.get(key) : null;
  }
  setItem(key, value) {
    this.#data.set(key, String(value));
  }
  removeItem(key) {
    this.#data.delete(key);
  }
  clear() {
    this.#data.clear();
  }
}

export function installMemoryStorage() {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
  return storage;
}
