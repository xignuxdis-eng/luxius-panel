# Directorio de ROMs Precargadas de SNES (LuXius Arcade Center)

Coloca en esta carpeta (`F:\Sitio XignuX\public\roms\snes\`) cualquier archivo ROM de Super Nintendo con extensión:

- `.sfc`
- `.smc`
- `.fig` / `.swc`
- `.zip` (el emulador descomprime automáticamente el `.sfc`/`.smc` interno en memoria)

## ¿Cómo se publican al sitio automáticamente?
1. Al compilar (`npm run build` / `npm run verify`) o levantar el entorno (`npm run dev`), el plugin `generateSnesRomsIndex()` en `vite.config.ts` escanea automáticamente todos los archivos de esta carpeta `public/roms/snes/` y genera el catálogo `public/roms/snes/index.json`.
2. Al hacer `git add -A && git commit && git push origin master`, GitHub Actions publica las ROMs junto con el sitio y aparecen precargadas en el **Catálogo de ROMs** para todos los usuarios.
3. El núcleo WebAssembly `snes9x_libretro.zip` (con soporte SA-1 y Super FX) ya está alojado localmente en `public/roms/cores/snes9x_libretro.zip`.
