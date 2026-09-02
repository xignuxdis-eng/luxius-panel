import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

const buildTimestamp = new Date().toISOString()

function versionGeneratorPlugin(): Plugin {
    return {
        name: 'version-generator',
        buildStart() {
            const versionData = JSON.stringify({
                version: '1.0.0',
                buildTime: buildTimestamp,
                generatedAt: Date.now()
            }, null, 2)

            const publicDir = path.resolve(__dirname, 'public')
            if (!fs.existsSync(publicDir)) {
                fs.mkdirSync(publicDir, { recursive: true })
            }
            fs.writeFileSync(path.resolve(publicDir, 'version.json'), versionData)
        },
        generateBundle() {
            this.emitFile({
                type: 'asset',
                fileName: 'version.json',
                source: JSON.stringify({
                    version: '1.0.0',
                    buildTime: buildTimestamp,
                    generatedAt: Date.now()
                }, null, 2)
            })
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
                assetFileNames: `assets/[name]-[hash].[ext]`
            }
        }
    },
    server: {
        port: 3005,
        open: true,
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                secure: false,
            },
        },
    },
})

