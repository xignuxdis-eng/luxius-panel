# Directorio de ROMs SNES (LuXius Arcade Center)

Coloca aquí el archivo ROM parchado para que cargue automáticamente al abrir el juego en la galería:

- **Ruta esperada en proyecto**: `public/roms/snes/nsmw1_twelve_magic_orbs.sfc`
- **Ruta pública servida**: `/roms/snes/nsmw1_twelve_magic_orbs.sfc` (o `${BASE_URL}roms/snes/nsmw1_twelve_magic_orbs.sfc`)
- **Título**: *New Super Mario World 1: The Twelve Magic Orbs Powered-Up*
- **Chip especial requerido**: Nintendo **SA-1** (emulado nativamente por el core `snes9x` en `SnesEmulatorGame.tsx`).

> Si el archivo `.sfc` no está presente en esta carpeta, el reproductor mostrará un cargador interactivo que permite seleccionar el archivo `.sfc` / `.smc` / `.zip` directamente desde la PC del usuario sin necesidad de recompilar.

