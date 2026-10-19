# Reglas de Flujo de Trabajo - Luxius System

> Última actualización: **19/10/2026**. Refleja el cambio de despliegue a GitHub Actions como única fuente de publicación.

---

## 🚀 Despliegue (REGLA MÁS IMPORTANTE DEL REPO)

```
código → git push origin master → GitHub Actions → GitHub Pages
```

**Nada más.** No hay segundo paso.

| Paso | Quién lo hace |
|---|---|
| Compilar y verificar local | Vos o el agente: `npm run verify` |
| Commit y push | Vos o el agente: `git add` → `git commit` → `git push origin master` |
| **Publicar en la web** | **GitHub Actions, automáticamente.** Tarda 2-4 min |

### ⛔ No hacer

- **No** ejecutar force-push a la rama `gh-pages`. Fue la causa de que la web sirviera builds viejos durante días: el script escribía ahí, y el workflow de Actions lo pisaba en el siguiente push. Los commits "tenían éxito" y aun así nada se actualizaba.
- **No** asumir que un deploy salió bien porque el script imprimió un hash. `scripts/deploy_gh_pages.ps1` **ya no publica nada**: solo verifica que lo servido corresponda al commit actual.

### ✅ Verificar el deploy (opcional pero recomendado)

```powershell
.\scripts\deploy_gh_pages.ps1
```

Compara el build publicado contra el commit de `master`. Si dice `[PENDIENTE`, esperá 2-4 minutos. Si tras 10 minutos sigue igual, el workflow falló: mirá <https://github.com/xignuxdis-eng/luxius-panel/actions>.

Comprobación manual equivalente:

```powershell
(Invoke-WebRequest "https://xignuxdis-eng.github.io/luxius-panel/" -UseBasicParsing).Content |
  Select-String 'assets/index-'
```

### Si probás en local

`npm run build` + copiar `dist/` a `D:\XignuX\luxius-panel\dist\` (Nginx local) **no** publica nada en internet. Es solo para probar antes de commitear.

---

## ✅ Verificación obligatoria antes de commitear

```bash
npm run verify   # = typecheck + lint + test + build
```

- `npm run typecheck` y `npm run lint` deben dar **0 errores**.
- `npm run build` **no** type-chequea (Vite usa esbuild), por eso `tsc` es un paso aparte.
- `npm run test` corre Vitest sobre la lógica crítica (nesting, precios, `db.ts`, laminado especial, orden de bobina).
- Los cuatro corren en el CI **antes** del deploy. Un error bloquea la publicación.

---

## 📚 Memoria (obligatoria en el mismo commit)

Todo cambio relevante —bugfix, decisión de arquitectura, refactor, hallazgo— se asienta en **`XANA_MEMORIA_SISTEMA.md`** en el **mismo commit**. Así cualquier IDE o IA puede retomar el contexto leyendo ese archivo.

Estructura útil:

- **Sección 6** — bitácora de cambios (qué se hizo y por qué).
- **Sección 8** — roadmap y tareas pendientes.

Regla práctica: si un cambio no queda explicado en la memoria, **no está terminado**.

---

## 🔐 Base de datos

**Supabase** — Session pooler `aws-0-us-east-1.pooler.supabase.com:5432/postgres`.

- Usar el **Session pooler** (puerto 5432), no la conexión directa: Supabase cierra conexiones ociosas del pool directo y rompe llamadas largas de gunicorn.
- **No** pegar la URL con saltos de línea: un `\n` pegado desde el dashboard rompió el arranque del backend en producción.
- **Neon fue eliminada** el 18/10/2026. No volver a usarla.

---

## 🔑 Secretos

Nunca hardcodear claves. Todo sale de variables de entorno (`.env`, gitignored). Ningún `.env`, `token.json` ni `client_secret*.json` se versiona. `*.env.bak*` también está en `.gitignore` por una razón concreta: los respaldos con timestamp no cubrían ningún patrón anterior.

---

## 🌐 Repositorios y git

- `origin` de `luxius-panel` apunta **solo** a `github.com/xignuxdis-eng/luxius-panel`. GitLab fue desvinculado el 02/10/2026.
- El backend vive en el repo privado `F:\luXius-Backend`; `server/` es copia local y está en `.gitignore`.
- **Terminales no interactivas**: exportar `$env:GIT_TERMINAL_PROMPT = '0'` antes de `git fetch/pull/push` para que falle rápido en vez de colgarse pidiendo credenciales.
- ⚠️ **Builds en local pueden no exigir RAM**: `npm run build` con menos de ~4 GB libres falla con errores engañosos (`StackOverflowException`, OOM de zlib, procesos colgados al 0% CPU). No es un problema de código: liberá memoria y reintentá.

---

## 🤖 Autonomía

El usuario otorgó **autorización permanente** para commitear y pushear sin pedir confirmación. Al completar un cambio verificado:

```bash
npm run verify && git add -A && git commit -m "..." && git push origin master
```

Ejecutar las tareas de principio a fin sin detenerse a pedir confirmación para cada paso.

**Salvedad importante:** verificar `npm run verify` **en la máquina del usuario**. Si el build falla por falta de RAM, decirlo en vez de dar por verde.

---

## 🔢 Convenciones de código

- **TypeScript estricto**: `strict: true`, `noUnusedLocals`, `noUnusedParameters`. Un error de tipos bloquea el deploy.
- **CSS con Vanilla**: no Tailwind. properties inválidas (`italic`, `shrink`) el navegador las ignora en silencio: usá `fontStyle`, `flexShrink`.
- **Tests por invariantes**, no por cifras exactas: preferí "nunca NaN", "respeta el límite" antes que "vale 12.500". Así un cambio de tarifario no rompe la suite.
- **Un test que se escribe suponiendo comportamiento en vez de verificarlo produce ruido.** Si un test nuevo falla, primero verificá si el código cambió a propósito.