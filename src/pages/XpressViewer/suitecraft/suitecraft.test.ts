import { describe, expect, it } from 'vitest';
import {
    CRAFT_TOOL_IDS,
    SUITE_CRAFT_TOOLS,
    buildCraftToolUrl,
    toAbsoluteFileUrl,
} from './tools';

describe('SuiteCraft — registro de herramientas', () => {
    it('declara Photocraft (raster) y Vectorcraft (vector) en orden', () => {
        expect([...CRAFT_TOOL_IDS]).toEqual(['photocraft', 'vectorcraft']);
        expect(SUITE_CRAFT_TOOLS.photocraft.badge).toBe('RÁSTER');
        expect(SUITE_CRAFT_TOOLS.vectorcraft.badge).toBe('VECTOR');
    });

    it('toda herramienta tiene id coherente, nombre, subtítulo y URL http(s)', () => {
        for (const toolId of CRAFT_TOOL_IDS) {
            const tool = SUITE_CRAFT_TOOLS[toolId];
            expect(tool.id).toBe(toolId);
            expect(tool.name.trim().length).toBeGreaterThan(0);
            expect(tool.subtitle.trim().length).toBeGreaterThan(0);
            expect(tool.url).toMatch(/^https?:\/\//i);
        }
    });

    it('Photocraft y Vectorcraft apuntan a editores distintos', () => {
        expect(SUITE_CRAFT_TOOLS.photocraft.url).not.toBe(SUITE_CRAFT_TOOLS.vectorcraft.url);
    });
});

describe('buildCraftToolUrl', () => {
    it('sin archivo devuelve la URL base tal cual', () => {
        expect(buildCraftToolUrl(SUITE_CRAFT_TOOLS.photocraft)).toBe(SUITE_CRAFT_TOOLS.photocraft.url);
        expect(buildCraftToolUrl(SUITE_CRAFT_TOOLS.vectorcraft, null)).toBe(SUITE_CRAFT_TOOLS.vectorcraft.url);
    });

    it('entrega el archivo remoto con el protocolo Live URL (hash JSON)', () => {
        const file = 'https://cdn.luxius.app/uploads/lona.png?token=abc123';
        const url = buildCraftToolUrl(SUITE_CRAFT_TOOLS.photocraft, file);
        const [base, hash] = url.split('#');

        expect(base).toBe(SUITE_CRAFT_TOOLS.photocraft.url);
        expect(hash).toBeDefined();
        expect(JSON.parse(decodeURIComponent(hash))).toEqual({ files: [file] });
    });

    it('resuelve rutas relativas antes de entregarlas al editor', () => {
        const url = buildCraftToolUrl(SUITE_CRAFT_TOOLS.vectorcraft, '/uploads/arte.svg');
        const [, hash] = url.split('#');
        const parsed = JSON.parse(decodeURIComponent(hash)) as { files: string[] };

        expect(parsed.files[0]).toBe(`${window.location.origin}/uploads/arte.svg`);
    });

    it('no entrega blobs ni data URIs: un editor remoto no puede leerlos', () => {
        const blob = 'blob:https://luxius.app/1234-5678';
        const data = 'data:image/png;base64,AAAA';
        const file = 'file:///C:/arte.png';

        expect(buildCraftToolUrl(SUITE_CRAFT_TOOLS.photocraft, blob)).toBe(SUITE_CRAFT_TOOLS.photocraft.url);
        expect(buildCraftToolUrl(SUITE_CRAFT_TOOLS.photocraft, data)).toBe(SUITE_CRAFT_TOOLS.photocraft.url);
        expect(buildCraftToolUrl(SUITE_CRAFT_TOOLS.photocraft, file)).toBe(SUITE_CRAFT_TOOLS.photocraft.url);
    });

    it('reemplaza un hash previo de la URL configurada en lugar de duplicarlo', () => {
        const tool = { ...SUITE_CRAFT_TOOLS.photocraft, url: 'https://editor.local/app#viejo' };
        const url = buildCraftToolUrl(tool, 'https://cdn.luxius.app/a.png');

        expect(url.startsWith('https://editor.local/app#')).toBe(true);
        expect(url.split('#')).toHaveLength(2);
        expect(JSON.parse(decodeURIComponent(url.split('#')[1]))).toEqual({
            files: ['https://cdn.luxius.app/a.png'],
        });
    });
});

describe('toAbsoluteFileUrl', () => {
    it('acepta URLs http(s) absolutas', () => {
        expect(toAbsoluteFileUrl(' https://cdn.luxius.app/a.png ')).toBe('https://cdn.luxius.app/a.png');
        expect(toAbsoluteFileUrl('http://localhost:5000/uploads/a.png')).toBe('http://localhost:5000/uploads/a.png');
    });

    it('rechaza vacíos, blobs, data URIs y esquemas no descargables', () => {
        expect(toAbsoluteFileUrl(null)).toBeNull();
        expect(toAbsoluteFileUrl('')).toBeNull();
        expect(toAbsoluteFileUrl('   ')).toBeNull();
        expect(toAbsoluteFileUrl('blob:https://luxius.app/uuid')).toBeNull();
        expect(toAbsoluteFileUrl('data:image/png;base64,AAAA')).toBeNull();
        expect(toAbsoluteFileUrl('javascript:alert(1)')).toBeNull();
        expect(toAbsoluteFileUrl('about:blank')).toBeNull();
    });
});
