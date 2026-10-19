/// <reference types="vitest/globals" />
/**
 * Setup global de Vitest.
 *
 * jsdom no implementa estas APIs y varios utilitarios las usan al importarse.
 * Los stubs son minimos: solo evitan que el import falle.
 *
 * La referencia `vitest/globals` de arriba es la que hace que `tsc --noEmit`
 * conozca `describe`/`it`/`expect` dentro de los archivos `.test.ts`. Sin ella,
 * los tests dan error de type-check aunque Vitest los ejecute bien.
 */

import { beforeEach, vi } from 'vitest'

// localStorage existe en jsdom, pero se resetea entre tests para no filtrar
// datos entre casos.
beforeEach(() => {
    window.localStorage.clear()
})

// jsdom no implementa matchMedia; lo consulta el tema de la app.
if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }),
    })
}

// requestAnimationFrame no existe en jsdom por defecto.
if (!global.requestAnimationFrame) {
    global.requestAnimationFrame = ((cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number) as typeof requestAnimationFrame
    global.cancelAnimationFrame = ((id: number) => clearTimeout(id)) as typeof cancelAnimationFrame
}