// Almacenamiento persistente de partidas guardadas (Save States) en IndexedDB

export interface SnesSaveSlot {
    id: string // `${gameId}_slot_${slot}`
    gameId: string
    gameTitle: string
    slot: number // 1, 2, 3
    timestamp: number
    thumbnailDataUrl?: string
    stateBlob: Blob
}

const DB_NAME = 'luxius_snes_saves_db'
const DB_VERSION = 1
const STORE_NAME = 'save_states'

function openSavesDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
            reject(new Error('IndexedDB no está disponible en este navegador.'))
            return
        }
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = () => {
            const db = req.result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
                store.createIndex('gameId', 'gameId', { unique: false })
            }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    })
}

// Convertir un Blob de imagen a Data URL
async function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => resolve('')
        reader.readAsDataURL(blob)
    })
}

// Guardar estado de juego en un slot específico
export async function saveGameState(
    gameId: string,
    gameTitle: string,
    slot: number,
    stateBlob: Blob,
    thumbnailBlob?: Blob
): Promise<SnesSaveSlot> {
    let thumbnailDataUrl: string | undefined
    if (thumbnailBlob && thumbnailBlob.size > 0) {
        try {
            thumbnailDataUrl = await blobToDataUrl(thumbnailBlob)
        } catch {
            // Ignorar falla de thumbnail
        }
    }

    const saveItem: SnesSaveSlot = {
        id: `${gameId}_slot_${slot}`,
        gameId,
        gameTitle,
        slot,
        timestamp: Date.now(),
        thumbnailDataUrl,
        stateBlob,
    }

    const db = await openSavesDb()
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME], 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        store.put(saveItem)
        tx.oncomplete = () => resolve(saveItem)
        tx.onerror = () => reject(tx.error)
    })
}

// Cargar estado de juego de un slot
export async function loadGameState(gameId: string, slot: number): Promise<Blob | null> {
    const db = await openSavesDb()
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME], 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.get(`${gameId}_slot_${slot}`)
        req.onsuccess = () => {
            const res = req.result as SnesSaveSlot | undefined
            resolve(res?.stateBlob || null)
        }
        req.onerror = () => reject(req.error)
    })
}

// Listar todas las partidas guardadas de un juego
export async function listGameStates(gameId: string): Promise<SnesSaveSlot[]> {
    const db = await openSavesDb()
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME], 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const index = store.index('gameId')
        const req = index.getAll(gameId)
        req.onsuccess = () => {
            const list = (req.result || []) as SnesSaveSlot[]
            list.sort((a, b) => a.slot - b.slot)
            resolve(list)
        }
        req.onerror = () => reject(req.error)
    })
}

// Eliminar un slot guardado
export async function deleteGameState(gameId: string, slot: number): Promise<void> {
    const db = await openSavesDb()
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME], 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        store.delete(`${gameId}_slot_${slot}`)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
}

// Descargar una partida guardada como archivo .state
export function downloadGameStateFile(slotItem: SnesSaveSlot): void {
    const url = URL.createObjectURL(slotItem.stateBlob)
    const a = document.createElement('a')
    a.href = url
    const safeName = slotItem.gameTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')
    a.download = `${safeName}_slot${slotItem.slot}.state`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

