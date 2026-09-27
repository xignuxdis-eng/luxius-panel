# Guía de Calibración de Tintas - XignuX Gráfica

## Procedimiento Estándar de Calibración

### 1. Preparación
- Verificar que la impresora esté encendida y en temperatura de operación (25°C ± 2°C)
- Limpiar las cabezas de impresión con solución de limpieza aprobada
- Verificar nivel de tinta: mínimo 250ml por color (alerta), 500ml razonable, 2000ml capacidad máxima

### 2. Impresión de Patrón de Prueba
1. Acceder al menú de mantenimiento de la impresora (VersaWorks/PhotoPrint)
2. Seleccionar "Imprimir Patrón de Boquillas" (Nozzle Check)
3. Usar sustrato estándar: Vinilo Monomérico 1.37m
4. Imprimir en calidad "Standard" (720x720 DPI)

### 3. Evaluación Visual
- **Bueno**: Todas las líneas continuas, sin espacios
- **Advertencia**: 1-2 líneas con espacios menores a 1mm
- **Crítico**: Más de 2 líneas con espacios o bandas completas faltantes

### 4. Limpieza y Recuperación
- Limpieza suave (Soft Clean): Para advertencias menores
- Limpieza fuerte (Hard Clean): Para casos críticos
- Limpieza de potencia (Power Clean): Solo si Hard Clean falla (consume mucha tinta)

### 5. Verificación Post-Limpieza
Repetir patrón de prueba. Si persiste crítico → contactar soporte técnico.

---

## Especificaciones de Tintas por Tipo

### Eco-Solvente (Roland/Bertola)
- **Capacidad tanque**: 2000ml (2L)
- **Nivel razonable**: 500ml (25%)
- **Alerta reposición**: <250ml (12.5%)
- **Colores**: C, M, Y, K, Lc, Lm, Or, Gr
- **Vida útil abierta**: 6 meses
- **Vida útil sellada**: 18 meses

### UV-LED (si aplica)
- **Capacidad tanque**: 1000ml
- **Curado inmediato**: No requiere secado
- **Adherencia**: Verificar con test de cinta (ASTM D3359)

---

## Botellas Cerradas - Gestión de Inventario
- Registrar cada botella sellada en `Material.botellasCerradas` (cantidad) y `Material.botellasMl` (ml totales)
- Rotación FIFO: Usar primero las de fecha de fabricación más antigua
- Almacenamiento: 15-25°C, lejos de luz directa

---

## Troubleshooting Común

| Síntoma | Causa Probable | Solución |
|---------|----------------|----------|
| Bandas horizontales | Cabeza obstruida | Limpieza suave → fuerte |
| Color desviado | Tinta vencida/contaminada | Reemplazar cartucho |
| Secado lento | Humedad > 60% | Deshumidificador / calefacción |
| Adherencia pobre | Sustrato incompatible | Verificar ficha técnica |

---

## Referencias
- Manual Roland VersaWorks v6.5 - Cap. 4 Mantenimiento
- Fichas técnicas tintas ESL4 / TR2 / EUV5
- Norma ISO 12647-2 (control de proceso)