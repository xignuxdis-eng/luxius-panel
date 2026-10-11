# Roland VersaWorks 4.x - Notas técnicas y hallazgos

> Documento de conocimiento para la futura integración **Luxius → VersaWorks** (nesting / hot folder).
> Fecha de la investigación: 11/10/2026. Estado: **investigación hecha, integración PENDIENTE** (decisión del usuario).
> Todo lo marcado como *Verificado* se comprobó en la PC del RIP con archivos reales; lo marcado *No verificado* es hipótesis.

## 1. Entorno real

| Dato | Valor |
|---|---|
| Software | Roland VersaWorks **4.x** (instalador `F:\Roland\Roland VersaWorks.msi`, 32 bits) |
| Instalación | `C:\Program Files (x86)\Roland VersaWorks\VersaWorks` |
| Impresora configurada | `AJ-1000` (Roland Advanced Jet) |
| Colas | **2** (usuario). Cola A verificada; carpetas `Input-A` / `Job-A` (la B sería `Input-B` / `Job-B`, *no verificado*) |
| Rollo | Personalizado, ancho **1500 mm** (`CustomROLL`) |
| Perfil de medio activo | `[RIPC] Generic Gloss Banner 1` |
| Máquina del RIP | Es la misma PC donde se desarrolla (el RIP y `F:\Sitio XignuX` conviven) |

Carpetas relevantes:

```
...\VersaWorks\Printers\AJ-1000\
    Input-A\                 <- hot folder de la cola A (strInputFolder)
    Job-A\                   <- trabajos de la cola A
        <trabajo>\
            <trabajo>.rvw            (XML con ajustes del trabajo)
            Layout_1.bmp             (vista previa del acomodo)
            Preview_1.tif            (previsualización RIP)
            EmbeddedCMYKProfile.icc  (perfil embebido)
        Anidar tarea D$2FM\          (trabajo anidado; "$2F" = "/" escapado)
            Anidar tarea D$2FM - 1.rvw
            Layout_1.bmp
            Nest\<hijo>              (archivos de 0 bytes: solo marcadores)
...\VersaWorks\Device\       archivos de impresora: .dsr .pmp .rmt
...\VersaWorks\User\         calibraciones (.labt)
```

## 2. El archivo `.rvw`

- **Es XML UTF-8** (`<?xml version="1.0" encoding="UTF-8"?>`), no binario ni zip.
- Hay dos tipos:
  1. **`<trabajo>\<trabajo>.rvw`** → raíz `<JobInfo>`: un trabajo.
  2. **Export de la lista de trabajos** (el que se guarda desde la gestión de tareas, p. ej. `prueba anidado.rvw`) → raíz `<JobInfoList strVersion="2.0.0.0">` con varios `<JobInfo>`.
- Muestras reales en [`muestras/`](muestras): `prueba anidado.rvw` (4 trabajos), `Anidar tarea 6_23 - 1.rvw` (7 trabajos, de junio).

### 2.1 Campos de `<JobInfo>` (Verificado)

`m_strInputFileLocation`, `m_strFileName`, `TimeStamp`, `m_nFileSize`, `m_eFileFormat` (3 = JPG, 4 = PDF, -1 = nest), `m_nRipStatus`, `m_nPrintStatus`, `m_strJobFolderName`, `m_dJobYSize_mm` (largo del trabajo), `JobSettings`, `m_PageInfoArray`, `NestParent` (true en el padre del nest), `ParentJob` (nombre del padre en los hijos), `m_eConsumptionInkVolumeState`, etc.

### 2.2 `JobSettings` (Verificado)

| Bloque | Qué contiene |
|---|---|
| `LayoutPageData` | `strMediaName`, `dMediaWidth_mm` (1500), `dScaleRate`, `dPrintXPos_mm`/`dPrintYPos_mm`, `bCentering`, `nNumCopies`, **`dPrintInterval_mm`** (espaciado entre piezas: 4 por defecto, **9** en el nest de prueba = "Espaciado del panel 0,90 cm"), `bTurnOver` (espejo) |
| `GeneralPageData` | `strInputFolder` (hot folder), `eActionAtInput`, **`bAutoRotation`** (true), **auto-nest**: `bAutoNestEnable`, `chAutoNestHour/Minute`, `bAutoNestIntervalEnable`/`nAutoNestInterval`, `bAutoNestMediaLengthEnable`/`dAutoNestMediaLength_mm`, `bAutoNestJobCountEnable`/`nAutoNestJobCount`, `eActionAtAutoNest`; `rlPrintLength_mm`, `nJobCount`, `eActionAfterPrinting`, `bPrintWhileRipping` |
| `QualityPageData` | `strActiveMediaName` (por idioma), `aMediaSettingArray` con `QualitySetting` por perfil: `nActiveQualityLevel`, `nResolutionIndex`, `nModeIndex`, temperaturas (pre-calentador 40 °C, calentador 40 °C, secador 50 °C), `eHeadHeight`, `nOverPrintCount`, calibración de avance |
| `AdjustPageData` | niveles/contraste/brillo/curvas por canal |
| `DFormatPageData` | intent, color directo (spot), curva PS |
| `MarkPageData` | marcas de corte/recorte, etiqueta de info |
| `CutPageData` | fuerza/velocidad/offset de corte |
| `DivisionPageData` | división en paneles (`dEdgeSize_mm`, etc.) |

### 2.3 Lo que el `.rvw` NO contiene (Verificado)

- **No guarda la posición de cada pieza dentro de un nest.**
  - Los `JobInfo` hijos tienen `dPrintXPos_mm/dPrintYPos_mm = 0,0`.
  - El padre no tiene `LayoutInfo` ni `PageInfo`.
  - La carpeta `Nest\` solo tiene archivos vacíos (0 bytes) con el nombre de cada hijo.
  - El acomodo solo existe como **imagen** (`Layout_1.bmp`) y en datos internos del RIP.
- Consecuencia: **no se puede fabricar un `.rvw` que le diga a VersaWorks dónde va cada pieza.** Un nest "editable en el RIP" generado por Luxius **no es viable**.
- Lo único que sí guarda por pieza: `nNumCopies`, ruta del archivo original (`m_strInputFileLocation`), tamaño real (`dSrcPageXSize_mm/YSize_mm` en `m_PageInfoArray`), y la relación padre/hijo.

## 3. Cómo anida VersaWorks 4 (Verificado con `prueba anidado.rvw`)

Ensayo del usuario: nest manual de `A_100x50`, `B_60x40` (**2 copias**) y `NEST_A_B_162x50` en rollo de 1500 mm.

- Resultado: trabajo padre `Anidar tarea 10/11 - 1`, largo **1619,95 mm**.
- El RIP **rotó 90°** todas las piezas para aprovechar el ancho (3 columnas ≈ 500 + 500 + 400 mm + separaciones).
- Respetó las **medidas reales** y el intervalo de **9 mm**.
- Imagen del acomodo: [`muestras/layout_nest_versaworks.png`](muestras/layout_nest_versaworks.png).

## 4. Hot folder (Verificado)

- Se cargaron correctamente los 3 PDF de prueba soltándolos en el hot folder de la cola A: la cola aplicó su perfil (`[RIPC] Generic Gloss Banner 1`) y sus parámetros.
- Medidas reales conservadas (diferencia < 0,15 mm, redondeo de puntos PDF):
  - `A` → 1000,12 × 499,88 mm
  - `B` → 600,07 × 400,04 mm
  - `NEST_A_B` → 1619,95 × 499,88 mm
- **Atención**: un PDF más ancho que el rollo (162 cm vs 150 cm) entra igual; con `bAutoRotation` el RIP puede girarlo 90°. El motor de nesting debe respetar el **ancho útil del material**.
- **Auto-nest de la cola**: existe (ver 2.2) pero estaba **apagado** (`bAutoNestEnable=false`) y **no se probó** si anida solo al soltar archivos en el hot folder.

## 5. Restricciones técnicas para la integración web

1. **Chrome/Edge no permiten que una web escriba en `C:\Program Files (x86)\...`** (carpeta del sistema bloqueada por la File System Access API). El hot folder actual está ahí → hay que **crear una carpeta propia** (ej. `F:\XignuX Print Den\HotFolder-A` y `-B`) y **apuntar la cola a ella** en las propiedades de la cola de VersaWorks (`strInputFolder`).
2. **Archivos a medias**: el RIP toma el archivo apenas aparece y lo descarta si todavía se está copiando (problema real del usuario con archivos de 50-100 MB). Solución acordada: **escribir con extensión `.part` y renombrar al terminar**; si hay varios archivos, que el último en completarse sea el que dispara el trabajo. *No verificado*: si el navegador permite renombrar/mover dentro de una carpeta local elegida con `showDirectoryPicker`; si no, escribir en una subcarpeta `_staging` y mover.
3. File System Access API: solo Chrome/Edge (no Firefox/Safari). La carpeta se elige una vez y se recuerda.
4. Queda fuera de alcance de la web: lanzar impresión o cambiar ajustes de la cola; eso lo hace el RIP con los ajustes de la cola.

## 6. Dos caminos posibles (decisión pendiente)

| | Opción 1: PDF anidado propio | Opción 2: auto-nest de la cola de VW |
|---|---|---|
| Quién anida | Nesting Studio de Luxius | VersaWorks |
| Control del acomodo y vista previa en el sistema | Total | Ninguno |
| Hay que igualar | Rotación 90°, ancho útil 1500 mm, separación (9 mm), copias | Nada |
| Colores/parámetros | Los de la cola (verificado) | Los de la cola |
| Riesgo | Calidad del empaquetado | Que el auto-nest no se dispare como se espera (no probado) |
| Lo que hace Luxius | Genera 1 PDF a tamaño real y lo deja en el hot folder | Deja los archivos completos en el hot folder |

**Próxima prueba sugerida** (opción 2): en las propiedades de la cola activar anidado automático (p. ej. por cantidad de trabajos = 2), soltar `A_100x50.pdf` y `B_60x40.pdf` juntos en el hot folder y ver si aparece un nest sin intervención.

## 7. Cómo reproducir las pruebas

```
node docs/roland/generar_pdfs_prueba.cjs     # regenera los 3 PDF en docs/roland/muestras/
```

Los PDF usan barras C/M/Y/K puras y rotulan su medida para verificar a regla.

## 8. Decisiones del usuario registradas

- Solo **2 colas** de impresión.
- El flujo deseado: seleccionar N órdenes → nesting dentro del sistema → "Descargar" deja todo en una carpeta predeterminada (el hot folder), tomando colores y parámetros de la cola.
- Sin backend para escribir: se prefiere hacerlo desde el navegador.
- Se dejó el tema **pendiente** (11/10/2026); retomar con la prueba de auto-nest y la creación de la carpeta propia del hot folder.
