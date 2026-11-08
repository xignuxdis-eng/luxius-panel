import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

const buildTimestamp = new Date().toISOString()

// SHA del commit que se esta compilando. Lo inyecta GitHub Actions en cada run
// (GITHUB_SHA). En builds locales queda en null, porque el arbol de trabajo suele
// tener cambios sin commitear y el SHA daria una sensacion de trazabilidad falsa.
//
// Sirve para que un deploy se verifique comparando SHAs y no marcas de tiempo: el
// reloj de la maquina de desarrollo puede estar desfasado respecto del runner y del
// CDN, y comparar horas daba falsos "PENDIENTE" sobre builds correctos.
const buildCommitSha = process.env.GITHUB_SHA || null

// Una sola fuente para las dos copias de version.json (la de public/ que se escribe
// en buildStart y la que se emite en generateBundle). Antes cada una declaraba sus
// propios campos y podian divergir sin que nada lo indicara.
function buildVersionData(): string {
    return JSON.stringify({
        version: '1.1.0',
        commitSha: buildCommitSha,
        buildTime: buildTimestamp,
        generatedAt: Date.now()
    }, null, 2)
}

function generateSnesRomsIndex(): void {
    const snesDir = path.resolve(__dirname, 'public', 'roms', 'snes')
    if (!fs.existsSync(snesDir)) {
        fs.mkdirSync(snesDir, { recursive: true })
    }
    const files = fs.readdirSync(snesDir)
    const validExts = ['.sfc', '.smc', '.fig', '.swc', '.zip']
    const romFiles = files.filter(f => validExts.includes(path.extname(f).toLowerCase()))

    const indexFile = path.resolve(snesDir, 'index.json')
    const existingMeta: Record<string, Record<string, unknown>> = {}
    if (fs.existsSync(indexFile)) {
        try {
            const raw = JSON.parse(fs.readFileSync(indexFile, 'utf8'))
            if (Array.isArray(raw)) {
                raw.forEach((item: Record<string, unknown>) => {
                    if (typeof item.fileName === 'string') existingMeta[item.fileName] = item
                })
            }
        } catch {
            // ignore
        }
    }

    const items = romFiles.map(file => {
        const ext = path.extname(file)
        const baseName = path.basename(file, ext).replace(/[_-]+/g, ' ')
        const meta = existingMeta[file] || {}
        return {
            id: meta.id || `snes_${path.basename(file, ext).toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            name: meta.name || baseName,
            fileName: file,
            icon: meta.icon || '🎮',
            genre: meta.genre || 'SNES / Clásico',
            color: meta.color || '#ff3366',
            exits: meta.exits || undefined,
            difficulty: meta.difficulty || undefined,
            tags: meta.tags || ['SNES', 'SA-1 Ready'],
            objective: meta.objective || `Juego Super Nintendo precargado desde public/roms/snes/${file}.`,
            controls: meta.controls || [
                'Flechas: D-Pad / Mover',
                'Z: Botón B (Saltar) · X: Botón A (Salto Giro)',
                'A: Botón Y (Correr) · S: Botón X (Poder)',
                'Enter: Start · Shift: Select · Q/W: L/R',
                'Soporte nativo para Gamepad USB/Bluetooth'
            ]
        }
    })

    fs.writeFileSync(indexFile, JSON.stringify(items, null, 2), 'utf8')
}

function versionGeneratorPlugin(): Plugin {
    return {
        name: 'version-generator',
        buildStart() {
            const publicDir = path.resolve(__dirname, 'public')
            if (!fs.existsSync(publicDir)) {
                fs.mkdirSync(publicDir, { recursive: true })
            }
            fs.writeFileSync(path.resolve(publicDir, 'version.json'), buildVersionData())
            generateSnesRomsIndex()
        },
        configureServer(server) {
            generateSnesRomsIndex()
            const snesDir = path.resolve(__dirname, 'public', 'roms', 'snes')
            server.watcher.on('all', (_event, filePath) => {
                if (filePath.startsWith(snesDir) && !filePath.endsWith('index.json')) {
                    generateSnesRomsIndex()
                }
            })
        },
        generateBundle() {
            this.emitFile({
                type: 'asset',
                fileName: 'version.json',
                source: buildVersionData()
            })

            // Inyectar nombre de cache único con timestamp de build en sw.js
            const swPath = path.resolve(__dirname, 'public', 'sw.js')
            if (fs.existsSync(swPath)) {
                let swContent = fs.readFileSync(swPath, 'utf8')
                swContent = swContent.replace(/const CACHE_NAME = ['"][^'"]+['"];/, `const CACHE_NAME = 'luxius-v${Date.now()}';`)
                this.emitFile({
                    type: 'asset',
                    fileName: 'sw.js',
                    source: swContent
                })
            }
        }
    }
}

export default defineConfig({
    base: './',
    define: {
        __BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
    },
    plugins: [
        react(),
        versionGeneratorPlugin()
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@components': path.resolve(__dirname, './src/components'),
            '@pages': path.resolve(__dirname, './src/pages'),
            '@hooks': path.resolve(__dirname, './src/hooks'),
            '@store': path.resolve(__dirname, './src/store'),
            '@types': path.resolve(__dirname, './src/types'),
            '@utils': path.resolve(__dirname, './src/utils'),
            '@data': path.resolve(__dirname, './src/data'),
        },
    },
    build: {
        rollupOptions: {
            output: {
                entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
                chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
                assetFileNames: `assets/[name]-[hash].[ext]`,
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('pixi.js')) {
                            return 'vendor-pixi';
                        }
                        if (id.includes('pdfjs-dist') || id.includes('pdf-lib')) {
                            return 'vendor-pdf';
                        }
                        if (id.includes('recharts')) {
                            return 'vendor-charts';
                        }
                        if (id.includes('lucide-react')) {
                            return 'vendor-icons';
                        }
                        if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom') || id.includes('zustand')) {
                            return 'vendor-core';
                        }
                    }
                }
            }
        }
    },
    server: {
        port: 3005,
        open: true,
        watch: {
            ignored: ['**/*.crdownload', '**/*.tmp']
        },
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                secure: false,
            },
        },
    },
})

