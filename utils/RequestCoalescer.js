// src/utils/RequestCoalescer.js
import { LRUCache } from 'lru-cache';

export class RequestCoalescer {
    #cache;

    constructor(options = {}) {
        this.#cache = new LRUCache({
            max: options.max || 100,
            ttl: options.ttl || 1000 * 60,
            dispose: (key, value) => {
                if (value?.catch) {
                    value.catch(() => {});
                }
            }
        });
    }

    async coalesce(key, fn) {
        const existing = this.#cache.get(key);
        if (existing) return existing;

        const promise = (async () => {
            try {
                const result = await fn();
                this.#cache.delete(key);
                return result;
            } catch (error) {
                this.#cache.delete(key);
                throw error;
            }
        })();
        
        this.#cache.set(key, promise);
        return promise;
    }

    clear() {
        this.#cache.clear();
    }
}

export const createCoalescers = () => ({
    scan: new RequestCoalescer({ ttl: 10000 }),
    connection: new RequestCoalescer({ ttl: 5000 }),
    command: new RequestCoalescer({ ttl: 2000 })
});