/**
 * Tests de caracterización de `resolveMediaUrl`.
 *
 * Esta función tiene 96 líneas de lógica condicional y es el punto donde se
 * construyen TODAS las URLs de archivos que ve el usuario (miniaturas, PDFs,
 * previews, links de descarga). Un caso mal cubierto muestra imágenes rotas o,
 * peor, expone material de otro cliente.
 *
 * Es una prueba de COMPORTAMIENTO ACTUAL, no de comportamiento deseado: fija
 * lo que el código hace hoy para poder partir `db.ts` sin miedo. Si algún día
 * se cambia a propósito un caso, hay que actualizar el test y razonar por qué.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resolveMediaUrl, API_URL } from './db'

// `API_URL` se resuelve al importar el módulo segun `window.location.hostname`.
// En jsdom el host es `localhost`, asi que la base NO es la de produccion:
// derivarla de API_URL hace que los tests sean independientes del entorno.
const BASE = API_URL.replace(/\/api\/?$/, '')

describe('resolveMediaUrl — entradas vacías', () => {
    beforeEach(() => window.localStorage.clear())

    it('devuelve cadena vacía ante entrada vacía', () => {
        expect(resolveMediaUrl('')).toBe('')
    })

    it('devuelve cadena vacía ante null/undefined simulados', () => {
        expect(resolveMediaUrl(null as unknown as string)).toBe('')
        expect(resolveMediaUrl(undefined as unknown as string)).toBe('')
    })

    it('CONTRAPRESENTE: espacios en blanco producen una URL rota', () => {
        // HALLAZGO 19/10/2026: el guard `if (!fileStr) return ''` corre ANTES
        // del .trim(), así que '   ' es truthy y se filtra hasta armarse la URL.
        // Resultado: ".../uploads/" — un <img> que apunta a la raíz de uploads.
        // No es un crash, pero genera un 404 por cada archivo en blanco.
        // Fijado como comportamiento actual; si se corrige, actualizar el test.
        expect(resolveMediaUrl('   ')).toBe(`${BASE}/uploads/`)
    })
})

describe('resolveMediaUrl — data URIs', () => {
    beforeEach(() => window.localStorage.clear())

    it('devuelve las data URIs sin tocar', () => {
        const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='
        expect(resolveMediaUrl(dataUri)).toBe(dataUri)
    })

    it('no appendea token a una data URI', () => {
        window.localStorage.setItem('luxius_auth_token', 'JWT123')
        const dataUri = 'data:image/jpeg;base64,/9j/4AAQ'
        expect(resolveMediaUrl(dataUri)).toBe(dataUri)
    })
})

describe('resolveMediaUrl — paths relativos', () => {
    beforeEach(() => window.localStorage.clear())

    it('convierte un nombre suelto en una URL de /uploads/', () => {
        const r = resolveMediaUrl('foto.jpg')
        expect(r).toContain('/uploads/foto.jpg')
        expect(r.startsWith(BASE)).toBe(true)
    })

    it('normaliza el prefijo uploads/ duplicado', () => {
        const r = resolveMediaUrl('uploads/foto.jpg')
        expect(r).toBe(`${BASE}/uploads/foto.jpg`)
    })

    it('elimina las barras iniciales', () => {
        const r = resolveMediaUrl('/foto.jpg')
        expect(r).toBe(`${BASE}/uploads/foto.jpg`)
    })
})

describe('resolveMediaUrl — normalización de host', () => {
    beforeEach(() => window.localStorage.clear())

    it('reescribe localhost a la base activa', () => {
        // En dev (host=localhost) la base YA es localhost:5000, asi que la
        // reescritura es identidad y el test solo confirma que no duplica host.
        const r = resolveMediaUrl('http://localhost:5000/uploads/foto.jpg')
        expect(r).toBe(`${BASE}/uploads/foto.jpg`)
        expect(r.match(/\/uploads\/foto\.jpg$/)).toBeTruthy()
    })

    it('reescribe 127.0.0.1 a la base activa (host distinto)', () => {
        // 127.0.0.1 SIEMPRE se normaliza, incluso en dev: la base es localhost.
        const r = resolveMediaUrl('http://127.0.0.1:5000/uploads/foto.jpg')
        expect(r).toBe(`${BASE}/uploads/foto.jpg`)
        expect(r).not.toContain('127.0.0.1')
    })

    it('reescribe la URL de Render a la base activa', () => {
        const r = resolveMediaUrl('https://luxius-backend.onrender.com/uploads/foto.jpg')
        expect(r).toBe(`${BASE}/uploads/foto.jpg`)
    })
})

describe('resolveMediaUrl — token de autenticación', () => {
    beforeEach(() => window.localStorage.clear())

    it('sin token NO appendea query string', () => {
        const r = resolveMediaUrl('foto.jpg')
        expect(r).not.toContain('token=')
    })

    it('con token lo appendea a las URLs propias', () => {
        window.localStorage.setItem('luxius_auth_token', 'ABC123')
        const r = resolveMediaUrl('foto.jpg')
        expect(r).toContain('token=ABC123')
    })

    it('codifica el token con URL-encoding', () => {
        window.localStorage.setItem('luxius_auth_token', 'a b&c=d')
        const r = resolveMediaUrl('foto.jpg')
        expect(r).toContain('token=a%20b%26c%3Dd')
    })

    it('usa "&" si la URL ya tiene query string', () => {
        window.localStorage.setItem('luxius_auth_token', 'T')
        const r = resolveMediaUrl('foto.jpg?v=2')
        expect(r).toContain('&token=T')
    })
})

describe('resolveMediaUrl — URLs externas (no debe filtrar el token)', () => {
    beforeEach(() => {
        window.localStorage.clear()
        window.localStorage.setItem('luxius_auth_token', 'SECRETO')
    })

    it('NO appendea el token a un host externo', () => {
        const we = 'https://wetransfer.com/downloads/abc123/file.pdf'
        const r = resolveMediaUrl(we)
        expect(r).not.toContain('token=')
        expect(r).not.toContain('SECRETO')
    })

    it('NO appendea el token a Google Drive', () => {
        const drive = 'https://drive.google.com/file/d/1xYz/view'
        const r = resolveMediaUrl(drive)
        expect(r).not.toContain('token=')
    })

    it('NO appendea el token a un host externo aunque tenga /uploads/', () => {
        const otro = 'https://ejemplo.com/uploads/foto.jpg'
        const r = resolveMediaUrl(otro)
        expect(r).not.toContain('SECRETO')
    })

    it('conserva la URL externa tal cual', () => {
        const we = 'https://wetransfer.com/downloads/abc/file.pdf'
        expect(resolveMediaUrl(we)).toBe(we)
    })
})

describe('resolveMediaUrl — nombres con espacios y acentos', () => {
    beforeEach(() => window.localStorage.clear())

    it('conserva espacios en el nombre', () => {
        const r = resolveMediaUrl('mi foto final.jpg')
        expect(r).toContain('mi foto final.jpg')
    })

    it('preserva acentos y ñ', () => {
        const r = resolveMediaUrl('cartel-ñandú-año.jpg')
        expect(r).toContain('cartel-ñandú-año.jpg')
    })

    it('no rompe con % en el nombre', () => {
        const r = resolveMediaUrl('100%-descuento.jpg')
        expect(r).toContain('100%-descuento.jpg')
    })
})