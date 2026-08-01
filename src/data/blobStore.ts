/**
 * Simple in-memory store to keep track of temporary ObjectURLs
 * across the application session.
 */

class BlobStore {
    private urls: Map<string, string> = new Map()
    private instanceId: number = Math.random()

    constructor() {
        console.log(`[BlobStore] Instance created: ${this.instanceId}`)
    }

    /**
     * Store a URL for a filename (or order ID)
     */
    set(key: string, url: string) {
        console.log(`[BlobStore][${this.instanceId}] Setting URL for: ${key}`, url)
        if (this.urls.has(key)) {
            const oldUrl = this.urls.get(key)
            if (oldUrl && oldUrl.startsWith('blob:')) {
                URL.revokeObjectURL(oldUrl)
            }
        }
        this.urls.set(key, url)
    }

    /**
     * Get a URL for a key
     */
    get(key: string): string | undefined {
        const url = this.urls.get(key)
        console.log(`[BlobStore][${this.instanceId}] Getting URL for: ${key} -> ${url || 'NOT FOUND'}`)
        return url
    }

    /**
     * Remove and revoke a URL
     */
    remove(key: string) {
        const url = this.urls.get(key)
        if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url)
        }
        this.urls.delete(key)
    }

    /**
     * Revoke all URLs (useful on full reset)
     */
    clear() {
        this.urls.forEach(url => {
            if (url.startsWith('blob:')) {
                URL.revokeObjectURL(url)
            }
        })
        this.urls.clear()
    }
}

export const blobStore = new BlobStore()
