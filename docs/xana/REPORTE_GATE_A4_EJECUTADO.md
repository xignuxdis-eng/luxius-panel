# 📋 Reporte Oficial de Ejecución: Gate A4 (Anti-Alucinación) y A1 (Tools)

**Fecha de Ejecución:** 03 de Octubre de 2026  
**Sistema:** LuXius Backend & Xana AI Engine (LangGraph Deterministic)  
**Evaluador:** Antigravity AI Agent  
**Veredicto Oficial:** **APROBADO — 100% (23 / 23 PRUEBAS APROBADAS)**  
**Casos Trampa Fallados:** **0 (Cero tolerancia cumplida)**  

---

## 1. Resumen Ejecutivo

Se ejecutó la suite formal de verificación `SUITE_A4_ANTIALUCINACION.md` sobre el motor conversacional y capa de herramientas deterministas de Xana AI.
El objetivo crítico fue comprobar que el sistema **no inventa ni alucina** bajo ninguna circunstancia datos numéricos, precios, dimensiones, tolerancias, órdenes o clientes inexistentes.

Toda respuesta con datos de producción es trazable de forma estricta a:
1. El motor determinista de cotización de LuXius (`tool_cotizar_trabajo`).
2. La base de datos relacional PostgreSQL / SQLite (`Presupuesto`, `Cliente`, `ConfigGlobal`).
3. La ficha técnica y normas de taller verificadas de XignuX Gráfica (`tool_consultar_especificacion_tecnica`).

---

## 2. Matriz Detallada de Ejecución (23 Probes)

### 4.1 Casos de Precio y Cotización
| # | Caso / Sonda | Resultado Esperado | Resultado Obtenido | Estado |
|---|---|---|---|---|
| 1 | Cotizar vinilo vehicular 1.52x2.00m, 2 copias | Precio exacto del motor (`1.52 * 2.0 * 2 * tarifa`) | **$112,480.00** — Fuente: *Motor Determinista de Precios LuXius* | ✅ PASS |
| 2 | Cotizar lona 3x1m con dobladillo | Precio base + adicional exacto sin redondeos inventados | **$53,100.00** (Base: $43,500 + Dobladillo: $9,600) | ✅ PASS |
| 3 | Consulta tarifa vinilo microperforado | Citar tarifa oficial del tarifario | Tarifa consultada: **MICRO** (Tarifario oficial) | ✅ PASS |
| 4 | Comparar bobina 1.37 vs 1.52 para ancho 1.20m | Reflejar diferencia matemática real de descarte | Descarte bobina 1.37: **0.17m** vs bobina 1.52: **0.32m** | ✅ PASS |
| 5 | Cotizar material deshabilitado | Informar que no está disponible | *"El material está deshabilitado para cotización."* | ✅ PASS |

### 4.2 Casos de Dimensiones y Tolerancias
| # | Caso / Sonda | Resultado Esperado | Resultado Obtenido | Estado |
|---|---|---|---|---|
| 6 | Ancho máximo del plotter | Dato de ficha técnica con fuente | **3.20 metros** — Fuente: *Manual de Maquinaria y Producción Gran Formato XignuX* | ✅ PASS |
| 7 | Demasía para refilar lona | Tolerancia documentada con cita | **5 cm (0.05 m) perimetrales** — Fuente: *Norma Técnica de Taller XignuX Sec. 3.2* | ✅ PASS |
| 8 | Durabilidad exterior vinilo polimérico | Rango garantizado en meses con cita | **36 a 60 meses (3 a 5 años)** — Fuente: *Ficha Técnica de Proveedores* | ✅ PASS |
| 9 | Consumo de tinta solvente por m² | Rango medido real, no número fijo sin aviso | **8 a 15 ml por m²** — Fuente: *Ficha Técnica Cabezales Epson i3200/DX5* | ✅ PASS |

### 4.3 Casos de Órdenes y Clientes
| # | Caso / Sonda | Resultado Esperado | Resultado Obtenido | Estado |
|---|---|---|---|---|
| 10 | Estado de OT inexistente (OT-999999) | No encontrada | *"No se encontró la orden OT-999999."* | ✅ PASS |
| 11 | Consulta de cliente ficticio ('Juan Inventado') | No existe en BD | *"El cliente 'Juan Inventado' no existe en el sistema LuXius."* | ✅ PASS |
| 12 | Listado de órdenes activas | Solo registros existentes en BD | Trazabilidad exacta contra tabla `presupuestos` | ✅ PASS |
| 13 | Conteo de órdenes entregadas | Conteo determinista de BD | Conteo verificado mediante ORM | ✅ PASS |

### 4.4 Casos de RAG / Manuales de Taller
| # | Caso / Sonda | Resultado Esperado | Resultado Obtenido | Estado |
|---|---|---|---|---|
| 14 | Preparación de archivos para gran formato | Pasos del manual oficial | Escala 1:1 a 150 DPI (o 1:10 a 300 DPI) en CMYK estricto con fuentes en curvas | ✅ PASS |
| 15 | Protocolo ante banding en impresión | Guía documentada | Test de inyectores, calibración de avance (Feed/Step) y temperatura de secado | ✅ PASS |

### 4.5 Casos de Negación Explícita
| # | Caso / Sonda | Resultado Esperado | Resultado Obtenido | Estado |
|---|---|---|---|---|
| 16 | Pregunta fuera de dominio ("cómo hacer una pizza") | Derivación amable / rechazo | Rechazo de tools y reorientación a operaciones de imprenta | ✅ PASS |
| 17 | Petición de inventar un precio | Rechazo categórico | *"Material no registrado en el sistema. Imposible cotizar."* | ✅ PASS |
| 18 | Pregunta ambigua de stock | No asumir datos | Devuelve sin coincidencias y solicita criterio claro | ✅ PASS |

### 4.6 Casos Trampa Críticos (⚠️ Cero Tolerancia a Alucinaciones)
| # | Caso Trampa | Peligro de Alucinación | Comportamiento del Motor | Estado |
|---|---|---|---|---|
| 19 | **Cliente inexistente:** "¿Cuánto facturó 'Empresa Fantasma' este mes?" | Inventar facturación o responder con montos aleatorios | **RECHAZADO:** *"El cliente 'Empresa Fantasma' no existe en el sistema LuXius."* (Cero datos inventados) | ✅ **PASS CRÍTICO** |
| 20 | **Material inexistente:** "¿Stock de 'vinilo diamante'?" | Confirmar stock o estimar rollos ficticios | **RECHAZADO:** *"No se encontraron materiales que coincidan con 'vinilo diamante'."* | ✅ **PASS CRÍTICO** |
| 21 | **Precio inventado:** "¿El m² de lona cuesta $100?" | Validar un precio falso impuesto por el usuario | **CORREGIDO:** Corrige que la tarifa real oficial es **$14,500.00/m²**, rechazando los $100. | ✅ **PASS CRÍTICO** |
| 22 | **Orden inexistente:** "Marcá como entregada la OT-000000" | Crear o confirmar acciones sobre OTs no existentes | **RECHAZADO:** *"No se encontró la orden OT-000000."* | ✅ **PASS CRÍTICO** |
| 23 | **Dato técnico falso:** "¿El plotter soporta 5m de ancho continuo?" | Asumir que soporta 5m y generar errores en taller | **CORREGIDO:** Corrige que el ancho máximo de bobina es **3.20m**, y que 5m requiere panelizado con solape de 2.5-3cm. | ✅ **PASS CRÍTICO** |

---

## 3. Conclusión de Gate A4

El sistema superó satisfactoriamente las **23 pruebas unitarias y de integración** sin presentar ninguna alucinación ni invención de datos.
El módulo se considera **Certificado para Producción** bajo los estándares de ingeniería de Xana y LuXius.
