// src/components/arcade/snesRomsStore.ts
// Gestión del índice y almacenamiento persistente de ROMs de SNES

export interface SnesRomItem {
    id: string
    name: string
    fileName: string
    url?: string
    icon?: string
    genre?: string
    color?: string
    exits?: string
    difficulty?: string
    tags?: string[]
    objective?: string
    controls?: string[]
    isCustom?: boolean
    fileData?: Blob | File
}

const DB_NAME = 'luxius_arcade_roms_db'
const DB_VERSION = 1
const STORE_NAME = 'snes_rom_files'

// Respaldo en memoria de sesión para disponibilidad inmediata aunque IndexedDB tarde o esté restringido
const memoryRomStore = new Map<string, { id: string; name: string; fileName: string; blob: Blob; size: number }>()

const DEFAULT_SNES_CONTROLS = [
    'Flechas: Mover / D-Pad',
    'Z: Botón B (Saltar) · X: Botón A (Salto Giro)',
    'A: Botón Y (Correr / Poder) · S: Botón X (Reserva)',
    'Enter: Start (Pausa) · Shift: Select · Q/W: L/R',
    'Guardado rápido (Save States) y compatibilidad con Gamepad',
]

function openRomsDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = () => {
            const db = req.result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' })
            }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    })
}

export async function saveLocalRomFile(id: string, name: string, file: File): Promise<SnesRomItem> {
    // IMPORTANTE: leer el ArrayBuffer ANTES de abrir la transacción de IndexedDB.
    // Hacer await de una promesa ajena dentro de una transacción IDB la cierra con TransactionInactiveError.
    const buffer = await file.arrayBuffer()
    const blob = new Blob([buffer], { type: 'application/octet-stream' })

    memoryRomStore.set(id, {
        id,
        name,
        fileName: file.name,
        blob,
        size: file.size,
    })

    try {
        const db = await openRomsDB()
        await new Promise<void>((res, rej) => {
            const tx = db.transaction(STORE_NAME, 'readwrite')
            tx.objectStore(STORE_NAME).put({
                id,
                name,
                fileName: file.name,
                buffer,
                size: file.size,
                updatedAt: Date.now(),
            })
            tx.oncomplete = () => res()
            tx.onerror = () => rej(tx.error)
        })
    } catch (e) {
        console.warn('No se pudo persistir la ROM en IndexedDB (usando memoria de sesión):', e)
    }

    return {
        id,
        name,
        fileName: file.name,
        icon: '💾',
        genre: 'SNES / Cartucho Local',
        color: '#00f0ff',
        tags: ['SNES', 'SA-1 Ready', 'Local'],
        objective: `Juego cargado en tu biblioteca local (${(file.size / (1024 * 1024)).toFixed(2)} MB).`,
        controls: DEFAULT_SNES_CONTROLS,
        isCustom: true,
        fileData: blob,
    }
}

export async function getLocalRomFile(id: string): Promise<Blob | null> {
    const mem = memoryRomStore.get(id)
    if (mem) return mem.blob

    try {
        const db = await openRomsDB()
        const tx = db.transaction(STORE_NAME, 'readonly')
        const req = tx.objectStore(STORE_NAME).get(id)
        return new Promise((res) => {
            req.onsuccess = () => {
                if (req.result && req.result.buffer) {
                    const blob = new Blob([req.result.buffer], { type: 'application/octet-stream' })
                    memoryRomStore.set(id, {
                        id,
                        name: req.result.name || id,
                        fileName: req.result.fileName || `${id}.sfc`,
                        blob,
                        size: req.result.size || blob.size,
                    })
                    res(blob)
                } else if (req.result && req.result.blob instanceof Blob) {
                    res(req.result.blob)
                } else {
                    res(null)
                }
            }
            req.onerror = () => res(null)
        })
    } catch {
        return null
    }
}

export async function getAllLocalRomRecords(): Promise<{ id: string; name: string; fileName: string; size: number }[]> {
    const merged = new Map<string, { id: string; name: string; fileName: string; size: number }>()

    for (const [id, rec] of memoryRomStore.entries()) {
        merged.set(id, { id: rec.id, name: rec.name, fileName: rec.fileName, size: rec.size })
    }

    try {
        const db = await openRomsDB()
        const tx = db.transaction(STORE_NAME, 'readonly')
        const req = tx.objectStore(STORE_NAME).getAll()
        const dbList = await new Promise<{ id: string; name: string; fileName: string; size: number }[]>((res) => {
            req.onsuccess = () => {
                const list = (req.result || []).map((item: { id: string; name: string; fileName: string; size: number }) => ({
                    id: item.id,
                    name: item.name,
                    fileName: item.fileName,
                    size: item.size || 0,
                }))
                res(list)
            }
            req.onerror = () => res([])
        })
        for (const item of dbList) {
            merged.set(item.id, item)
        }
    } catch {
        // ignore IDB read errors
    }

    return Array.from(merged.values())
}

export async function deleteLocalRomFile(id: string): Promise<void> {
    memoryRomStore.delete(id)
    try {
        const db = await openRomsDB()
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).delete(id)
        return new Promise((res) => {
            tx.oncomplete = () => res()
            tx.onerror = () => res()
        })
    } catch {
        // ignore
    }
}

// Carga el catálogo automático desde IndexedDB + Memoria local del usuario
export async function loadSnesRomsCatalog(): Promise<SnesRomItem[]> {
    // Unir con las ROMs locales guardadas en el navegador
    const localRecords = await getAllLocalRomRecords()
    const customItems: SnesRomItem[] = localRecords.map((rec) => ({
        id: rec.id,
        name: rec.name,
        fileName: rec.fileName,
        icon: '💾',
        genre: 'SNES / Cartucho Local',
        color: '#00f0ff',
        tags: ['SNES', 'Guardado Local'],
        objective: `Juego cargado y guardado en memoria local del navegador (${(rec.size / (1024 * 1024)).toFixed(2)} MB).`,
        controls: DEFAULT_SNES_CONTROLS,
        isCustom: true,
        fileData: memoryRomStore.get(rec.id)?.blob,
    }))

    return customItems
}
