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

// IndexedDB para almacenar ROMs subidas localmente por el usuario
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

export async function saveLocalRomFile(id: string, name: string, file: File): Promise<void> {
    try {
        const db = await openRomsDB()
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const buffer = await file.arrayBuffer()
        tx.objectStore(STORE_NAME).put({
            id,
            name,
            fileName: file.name,
            buffer,
            size: file.size,
            updatedAt: Date.now()
        })
        return new Promise((res, rej) => {
            tx.oncomplete = () => res()
            tx.onerror = () => rej(tx.error)
        })
    } catch (e) {
        console.warn('No se pudo guardar la ROM en IndexedDB:', e)
    }
}

export async function getLocalRomFile(id: string): Promise<Blob | null> {
    try {
        const db = await openRomsDB()
        const tx = db.transaction(STORE_NAME, 'readonly')
        const req = tx.objectStore(STORE_NAME).get(id)
        return new Promise((res) => {
            req.onsuccess = () => {
                if (req.result && req.result.buffer) {
                    res(new Blob([req.result.buffer]))
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
    try {
        const db = await openRomsDB()
        const tx = db.transaction(STORE_NAME, 'readonly')
        const req = tx.objectStore(STORE_NAME).getAll()
        return new Promise((res) => {
            req.onsuccess = () => {
                const list = (req.result || []).map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    fileName: item.fileName,
                    size: item.size
                }))
                res(list)
            }
            req.onerror = () => res([])
        })
    } catch {
        return []
    }
}

export async function deleteLocalRomFile(id: string): Promise<void> {
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

// Carga el catálogo automático desde /roms/snes/index.json + IndexedDB
export async function loadSnesRomsCatalog(): Promise<SnesRomItem[]> {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
    const indexUrl = `${base}/roms/snes/index.json`
    let serverRoms: SnesRomItem[] = []

    try {
        const res = await fetch(indexUrl, { cache: 'no-cache' })
        if (res.ok) {
            const data = await res.json()
            if (Array.isArray(data)) {
                serverRoms = data.map(item => ({
                    ...item,
                    url: `${base}/roms/snes/${item.fileName}`
                }))
            }
        }
    } catch (e) {
        console.warn('No se pudo leer /roms/snes/index.json:', e)
    }

    // Si está vacío, proveer la entrada canónica de New Super Mario World 1
    if (serverRoms.length === 0) {
        serverRoms.push({
            id: 'nsmw1_twelve_magic_orbs',
            name: 'New Super Mario World 1: The Twelve Magic Orbs Powered-Up',
            fileName: 'nsmw1_twelve_magic_orbs.sfc',
            url: `${base}/roms/snes/nsmw1_twelve_magic_orbs.sfc`,
            icon: '🍄',
            genre: 'Plataformas / Clásico',
            color: '#ff3366',
            exits: '115 exits',
            difficulty: 'Intermedia',
            tags: ['SNES', 'SA-1', '115 Exits', 'Intermedia'],
            objective: 'Remake con 12 mundos principales, 93 niveles, Luigi jugable, 16 nuevos power-ups y banda sonora personalizada.',
            controls: [
                'Flechas: Mover a Mario / Luigi',
                'Z: Saltar (B) · X: Salto Giro / Spin Jump (A)',
                'A: Correr / Poder (Y) · S: Reserva / Mirar (X)',
                'Enter: Start (Pausa) · Shift: Select · Q/W: L/R',
                'Soporte nativo para Gamepad y guardado local (IndexedDB)'
            ]
        })
    }

    // Unir con las ROMs locales guardadas en el navegador
    const localRecords = await getAllLocalRomRecords()
    const customItems: SnesRomItem[] = localRecords.map(rec => ({
        id: rec.id,
        name: rec.name,
        fileName: rec.fileName,
        icon: '💾',
        genre: 'SNES / Local',
        color: '#00f0ff',
        tags: ['SNES', 'Guardado Local'],
        objective: `Juego cargado y guardado en memoria local del navegador (${(rec.size / (1024 * 1024)).toFixed(2)} MB).`,
        controls: [
            'Flechas: Mover / D-Pad',
            'Z: Botón B · X: Botón A',
            'A: Botón Y · S: Botón X',
            'Enter: Start · Shift: Select · Q/W: L/R',
            'Guardado rápido (Save States) y compatibilidad con Gamepad'
        ],
        isCustom: true
    }))

    // Evitar duplicados por ID
    const map = new Map<string, SnesRomItem>()
    serverRoms.forEach(r => map.set(r.id, r))
    customItems.forEach(r => map.set(r.id, r))

    return Array.from(map.values())
}

