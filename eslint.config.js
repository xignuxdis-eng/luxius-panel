import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

// Se lint-ela unicamente la app React de `src/`. El resto del repo tiene
// .js/.cjs/.py legacy (scripts de migracion, service worker, backups,
// android/) que quedan fuera del bundle de Vite y fuera del tsconfig.
const SRC = ['src/**/*.{ts,tsx}']

export default tseslint.config(
    {
        ignores: [
            'dist/**',
            'node_modules/**',
            'android/**',
            'backups/**',
            'backup-luxius-*/**',
            'docs/**',
            'logs/**',
            'elementos descargados/**',
            '_pruebas_versaworks/**',
            // Worktrees de otras herramientas (.kilo, .agents) y scripts
            // legacy con BOM: no forman parte de la app.
            '.kilo/**',
            '.agents/**',
            '.agent/**',
            'scripts/**',
        ],
    },

    { ...js.configs.recommended, files: SRC },
    ...tseslint.configs.recommended.map((c) => ({ ...c, files: SRC })),

    {
        files: SRC,
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

            // `exhaustive-deps` se deja en warn: 38 casos, la mayoria carga
            // inicial ("montar una vez" / "refrescar al abrir el modal") donde
            // agregar deps causaria re-fetches infinitos. Ademas marca como
            // error leer un ref en el cleanup de un effect con `[]`, que es el
            // patron correcto para liberar recursos de PixiJS al desmontar.
            // Queda como aviso, no bloquea el CI.
            'react-hooks/exhaustive-deps': 'warn',

            // --- Ruido deliberadamente permitido ---
            // El proyecto loguea a consola por diseño (diagnostico de taller).
            'no-console': 'off',
            // Casts necesarios: la API y libs de terceros (pdf.js, PixiJS)
            // devuelven tipos mas laxos que su declaracion.
            '@typescript-eslint/no-explicit-any': 'off',
            // tsc ya cubre esto con noUnusedLocals/noUnusedParameters.
            '@typescript-eslint/no-unused-vars': 'off',
            // Los scripts y clases del juego necesitan require (CommonJS).
            '@typescript-eslint/no-require-imports': 'off',
            // Comentarios @ts-expect-error legitimos (workarounds de libs).
            '@typescript-eslint/ban-ts-comment': 'off',
            // Falso positivo en dos patrones intencionales del proyecto:
            //   1) `cb && cb(x)` para callbacks opcionales en JSX.
            //   2) `!guard && doThing()` como statement de una linea.
            '@typescript-eslint/no-unused-expressions': 'off',

            // --- Reglas que SIKEN bugs reales ---
            // `no-undef` se deja en 'off' a proposito: typescript-eslint lo
            // desactiva porque `tsc` ya resuelve identificadores, y la regla
            // base marca tipos (BlobPart, RequestInfo, OscillatorType) y el
            // UMD `React` como "no definidos".
            'no-empty': ['error', { allowEmptyCatch: true }],
            eqeqeq: ['warn', 'smart'],
            'prefer-const': 'warn',
        },
    },

    // Config de Node para los .ts de tooling en la raiz (vite.config.ts).
    // Necesita el parser de TS: sin esto, `defineConfig({...})` con tipos
    // da "Parsing error: Unexpected token :".
    {
        files: ['*.config.ts'],
        ...tseslint.configs.recommended[0],
        languageOptions: {
            ...tseslint.configs.recommended[0].languageOptions,
            globals: globals.node,
        },
    },
)