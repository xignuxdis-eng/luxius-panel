import { describe, it, expect, vi } from 'vitest';

vi.mock('pdfjs-dist', () => ({
    GlobalWorkerOptions: {},
    getDocument: vi.fn()
}));
vi.mock('pdfjs-dist/build/pdf.worker.mjs?url', () => ({
    default: ''
}));

import { parseJPGDPI, parseJPGColorMode } from './fileMetadataParser';

describe('fileMetadataParser — JPEG DPI & Color Mode binary headers', () => {
    it('extracts 300 DPI from JFIF APP0 header (unit at +11, Xdensity at +12)', () => {
        // Exact header bytes from p102420_JAVIER_ALVAREZ-PLOTTER1134_x_2_copias_1.jpg:
        // FF D8 FF E0 00 10 'J' 'F' 'I' 'F' 00 01 01 01 01 2C 01 2C 00 00 FF D9
        const bytes = new Uint8Array([
            0xff, 0xd8,
            0xff, 0xe0, 0x00, 0x10,
            0x4a, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
            0x01, 0x01,                   // version 1.1
            0x01,                         // unit = 1 (DPI)
            0x01, 0x2c,                   // Xdensity = 300
            0x01, 0x2c,                   // Ydensity = 300
            0x00, 0x00,                   // thumb 0x0
            0xff, 0xd9
        ]);
        const dpi = parseJPGDPI(new DataView(bytes.buffer));
        expect(dpi).toBe(300);

        // Verify physical dimensions for 17324 x 2965 px at 300 DPI:
        const widthCm = Math.round(((17324 * 2.54) / dpi) * 10) / 10;
        const heightCm = Math.round(((2965 * 2.54) / dpi) * 10) / 10;
        expect(widthCm).toBeCloseTo(146.7, 1);
        expect(heightCm).toBeCloseTo(25.1, 1);
    });

    it('detects CMYK from SOF0 even after >500 KB of APP2 ICC profile chunks', () => {
        // Construct a buffer with 10 APP2 (0xFFE2) chunks of 60 KB each (~600 KB total),
        // followed by a SOF0 (0xFFC0) marker with 4 components (CMYK).
        const chunkPayloadSize = 60000;
        const numChunks = 10;
        const totalSize = 2 + numChunks * (2 + 2 + chunkPayloadSize) + 20 + 2;
        const buf = new Uint8Array(totalSize);
        const view = new DataView(buf.buffer);

        let pos = 0;
        buf[pos++] = 0xff;
        buf[pos++] = 0xd8; // SOI

        for (let i = 0; i < numChunks; i++) {
            buf[pos] = 0xff;
            buf[pos + 1] = 0xe2; // APP2 (ICC_PROFILE)
            view.setUint16(pos + 2, chunkPayloadSize + 2);
            pos += 4 + chunkPayloadSize;
        }

        // SOF0 marker at >600 KB offset
        buf[pos] = 0xff;
        buf[pos + 1] = 0xc0; // SOF0
        view.setUint16(pos + 2, 17); // length
        buf[pos + 4] = 8; // precision
        view.setUint16(pos + 5, 2965); // height
        view.setUint16(pos + 7, 17324); // width
        buf[pos + 9] = 4; // 4 components = CMYK
        pos += 19;

        buf[pos] = 0xff;
        buf[pos + 1] = 0xd9; // EOI

        expect(parseJPGColorMode(view)).toBe('CMYK');
    });
});
