# Copilot Instructions - Luxius System

Lee siempre `XANA_MEMORIA_SISTEMA.md` para el contexto de arquitectura, bitácora y decisiones técnicas.

- **Stack**: React 18, TypeScript, Vite, Vanilla CSS.
- **Backend**: Flask (Python 3.12), SQLAlchemy, Supabase PostgreSQL (`aws-0-us-east-1.pooler.supabase.com:5432/postgres`).
- **Verificación**: `npm run verify` (`tsc` + `eslint` + `vite build`) debe terminar con 0 errores.
- **Git & CI**: Siempre `$env:GIT_TERMINAL_PROMPT = '0'`. Remoto único `origin master` en `github.com/xignuxdis-eng/luxius-panel`.
- **Despliegue**: `.\scripts\deploy_gh_pages.ps1`.
- **Memoria de cambios**: Asentar novedades en `XANA_MEMORIA_SISTEMA.md`.
