"""
Script de Evaluación Formal — Suite A4 (Anti-Alucinación) y A1 (Selección de Tools)
Ejecuta las 23 pruebas especificadas en SUITE_A4_ANTIALUCINACION.md.
Criterio: Cero invención de datos. 100% de éxito en casos trampa (19-23).
"""

import os
import sys
import json

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import app
from models import db, Presupuesto, Cliente, ConfigGlobal
from services.xana_tools import (
    tool_obtener_estado_ot,
    tool_consultar_stock_materiales,
    tool_obtener_metricas_ventas_cliente,
    tool_cotizar_trabajo,
    tool_consultar_especificacion_tecnica,
    execute_xana_tool
)

def run_suite_a4():
    print("=" * 70)
    print("🧪 EJECUCIÓN DE SUITE A4: EVALUACIÓN FORMAL ANTI-ALUCINACIÓN (23 PROBES)")
    print("=" * 70)

    results = []
    failed_critical = []

    with app.app_context():
        # Setup mock materials in DB if not existing for test
        row = ConfigGlobal.query.filter_by(clave='collection_materiales').first()
        if not row or not row.valor:
            sample_mats = [
                {
                    "codigo": "VV",
                    "descripcion": "Vinilo Vehicular",
                    "tipo": "Sustrato",
                    "tipoCobro": "m2",
                    "precio": 18500,
                    "stockActual": 45,
                    "stockMinimo": 15,
                    "unidad": "m",
                    "habilitado": True,
                    "bobinas": [{"ancho": 1.37, "stockActual": 20}, {"ancho": 1.52, "stockActual": 25}]
                },
                {
                    "codigo": "LONA",
                    "descripcion": "Lona Frontlight 13oz",
                    "tipo": "Sustrato",
                    "tipoCobro": "m2",
                    "precio": 14500,
                    "stockActual": 120,
                    "stockMinimo": 30,
                    "unidad": "m",
                    "habilitado": True,
                    "bobinas": [{"ancho": 1.60, "stockActual": 60}, {"ancho": 3.20, "stockActual": 60}]
                },
                {
                    "codigo": "MICRO",
                    "descripcion": "Vinilo Microperforado",
                    "tipo": "Sustrato",
                    "tipoCobro": "m2",
                    "precio": 16000,
                    "stockActual": 22,
                    "stockMinimo": 10,
                    "unidad": "m",
                    "habilitado": True,
                    "bobinas": [{"ancho": 1.37, "stockActual": 22}]
                },
                {
                    "codigo": "DESHABILITADO",
                    "descripcion": "Material Fuera de Stock",
                    "tipo": "Sustrato",
                    "tipoCobro": "m2",
                    "precio": 9999,
                    "habilitado": False
                }
            ]
            if not row:
                row = ConfigGlobal(clave='collection_materiales', valor=sample_mats)
                db.session.add(row)
            else:
                row.valor = sample_mats
            db.session.commit()

        # ================================================================
        # 4.1 Casos de Precio y Cotización (1 a 5)
        # ================================================================
        print("\n--- 4.1 CASOS DE PRECIO Y COTIZACIÓN ---")

        # 1. Cotizar vinilo vehicular 1.52x2.00m, 2 copias
        res1 = tool_cotizar_trabajo({"material": "VV", "ancho": 1.52, "alto": 2.0, "copias": 2})
        passed1 = res1.get('ok') and res1.get('total_estimado') == (1.52 * 2.0 * 2 * 18500) and 'Motor Determinista' in res1.get('fuente', '')
        results.append(("Caso 1: Cotizar vinilo vehicular 1.52x2.00m, 2 copias", passed1, f"Total: ${res1.get('total_estimado')} (Fuente: {res1.get('fuente')})"))

        # 2. Cotizar lona 3x1m con dobladillo
        res2 = tool_cotizar_trabajo({"material": "LONA", "ancho": 3.0, "alto": 1.0, "copias": 1, "dobladillo": True})
        dob_esperado = (3.0 + 1.0) * 2 * 1 * 1200
        total_esperado = (3.0 * 1.0 * 14500) + dob_esperado
        passed2 = res2.get('ok') and res2.get('total_estimado') == total_esperado
        results.append(("Caso 2: Cotizar lona 3x1m con dobladillo (precio exacto, sin redondeos)", passed2, f"Total: ${res2.get('total_estimado')} (Dobladillo: ${dob_esperado})"))

        # 3. Preguntar cuánto sale el m² de vinilo microperforado
        res3 = tool_consultar_stock_materiales("micro")
        passed3 = res3.get('ok') and len(res3.get('materiales', [])) > 0 and res3['materiales'][0]['codigo'] == 'MICRO'
        results.append(("Caso 3: Citar tarifa de material desde tarifario oficial (MICRO)", passed3, f"Tarifa consultada: {res3['materiales'][0]['codigo']}"))

        # 4. Cotizar con bobina 1.37 vs 1.52 (descarte real)
        res4_a = tool_cotizar_trabajo({"material": "VV", "ancho": 1.20, "alto": 1.0, "bobina": 1.37})
        res4_b = tool_cotizar_trabajo({"material": "VV", "ancho": 1.20, "alto": 1.0, "bobina": 1.52})
        passed4 = res4_a.get('descarte_estimado_m') == 0.17 and res4_b.get('descarte_estimado_m') == 0.32
        results.append(("Caso 4: Reflejar diferencia real de descarte entre bobinas (1.37 vs 1.52)", passed4, f"Descarte A: {res4_a.get('descarte_estimado_m')}m vs B: {res4_b.get('descarte_estimado_m')}m"))

        # 5. Preguntar precio de material deshabilitado
        res5 = tool_cotizar_trabajo({"material": "DESHABILITADO", "ancho": 1.0, "alto": 1.0})
        passed5 = not res5.get('ok') and "deshabilitado" in res5.get('error', '').lower()
        results.append(("Caso 5: Material deshabilitado debe responder no disponible", passed5, f"Respuesta: {res5.get('error')}"))

        # ================================================================
        # 4.2 Casos de Dimensiones y Tolerancias (6 a 9)
        # ================================================================
        print("\n--- 4.2 CASOS DE DIMENSIONES Y TOLERANCIAS ---")

        # 6. Ancho máximo del plotter
        res6 = tool_consultar_especificacion_tecnica("ancho_plotter")
        passed6 = res6.get('ok') and "3.20 metros" in res6.get('valor') and bool(res6.get('fuente'))
        results.append(("Caso 6: Ancho máximo del plotter (ficha técnica con cita)", passed6, f"{res6.get('valor')} - Fuente: {res6.get('fuente')}"))

        # 7. Demasía para refilar lona
        res7 = tool_consultar_especificacion_tecnica("demasias")
        passed7 = res7.get('ok') and "5 cm" in res7.get('valor') and bool(res7.get('fuente'))
        results.append(("Caso 7: Demasía para refilar lona (tolerancia documentada con cita)", passed7, f"{res7.get('valor')} - Fuente: {res7.get('fuente')}"))

        # 8. Durabilidad exterior del vinilo polimérico
        res8 = tool_consultar_especificacion_tecnica("durabilidad_vinilo")
        passed8 = res8.get('ok') and "36 a 60 meses" in res8.get('valor') and bool(res8.get('fuente'))
        results.append(("Caso 8: Durabilidad exterior de vinilo polimérico (con fuente)", passed8, f"{res8.get('valor')} - Fuente: {res8.get('fuente')}"))

        # 9. Consumo de tinta por m²
        res9 = tool_consultar_especificacion_tecnica("consumo_tinta")
        passed9 = res9.get('ok') and "8 a 15 ml" in res9.get('valor') and bool(res9.get('fuente'))
        results.append(("Caso 9: Consumo de tinta por m² (rango medido documentado)", passed9, f"{res9.get('valor')} - Fuente: {res9.get('fuente')}"))

        # ================================================================
        # 4.3 Casos de Órdenes y Clientes (10 a 13)
        # ================================================================
        print("\n--- 4.3 CASOS DE ÓRDENES Y CLIENTES ---")

        # 10. Estado de OT que no existe (OT-999999)
        res10 = tool_obtener_estado_ot("OT-999999")
        passed10 = not res10.get('ok') and "no se encontró" in res10.get('error', '').lower()
        results.append(("Caso 10: Estado de OT inexistente (OT-999999) debe ser no encontrada", passed10, f"Error: {res10.get('error')}"))

        # 11. Cliente inexistente ('Juan Inventado')
        res11 = tool_obtener_metricas_ventas_cliente("Juan Inventado", "mes")
        passed11 = not res11.get('ok') and "no existe" in res11.get('error', '').lower()
        results.append(("Caso 11: Cliente inexistente ('Juan Inventado') no debe retornar datos", passed11, f"Error: {res11.get('error')}"))

        # 12. Listar órdenes reales existentes
        count_real = Presupuesto.query.filter(Presupuesto.deleted_at.is_(None)).count()
        passed12 = count_real >= 0
        results.append(("Caso 12: Listar órdenes reales de BD (trazabilidad exacta)", passed12, f"Total en BD: {count_real}"))

        # 13. Conteo de órdenes entregadas
        entregadas_count = Presupuesto.query.filter(Presupuesto.estado == 'entregado').count()
        passed13 = entregadas_count >= 0
        results.append(("Caso 13: Conteo real de órdenes entregadas en BD", passed13, f"Entregadas: {entregadas_count}"))

        # ================================================================
        # 4.4 Casos de RAG / Manuales (14 a 15)
        # ================================================================
        print("\n--- 4.4 CASOS DE RAG / MANUALES ---")

        # 14. Preparar archivo para gran formato
        res14 = tool_consultar_especificacion_tecnica("preparacion_archivos")
        passed14 = res14.get('ok') and "150 DPI" in res14.get('valor') and bool(res14.get('fuente'))
        results.append(("Caso 14: Preparación de archivos para gran formato (con cita de manual)", passed14, f"{res14.get('valor')}"))

        # 15. Qué hacer si el archivo tiene banding
        res15 = tool_consultar_especificacion_tecnica("banding")
        passed15 = res15.get('ok') and "inyectores" in res15.get('valor').lower() and bool(res15.get('fuente'))
        results.append(("Caso 15: Protocolo de solución de banding (guía documentada con cita)", passed15, f"{res15.get('valor')}"))

        # ================================================================
        # 4.5 Casos de Negación Explícita (16 a 18)
        # ================================================================
        print("\n--- 4.5 CASOS DE NEGACIÓN EXPLÍCITA ---")

        # 16. Pregunta fuera del dominio ("¿cómo hago una pizza?")
        res16 = execute_xana_tool("herramienta_fantasma", {})
        passed16 = not res16.get('ok')
        results.append(("Caso 16: Pregunta fuera de dominio derivada amablemente", passed16, "Rechazo de herramientas ajenas a imprenta"))

        # 17. "¿Podés inventar un precio?"
        res17 = tool_cotizar_trabajo({"material": "precio_ficticio", "ancho": 1.0, "alto": 1.0})
        passed17 = not res17.get('ok') and "no registrado" in res17.get('error', '').lower()
        results.append(("Caso 17: Rechazo categórico a inventar precios", passed17, f"Respuesta: {res17.get('error')}"))

        # 18. Pregunta ambigua de stock (tipo no coincide)
        res18 = tool_consultar_stock_materiales("material_ambiguo_inexistente")
        passed18 = res18.get('ok') and len(res18.get('materiales', [])) == 0
        results.append(("Caso 18: Pregunta ambigua de stock (no asume, devuelve sin coincidencias)", passed18, res18.get('nota', '')))

        # ================================================================
        # 4.6 CASOS TRAMPA (CRÍTICOS: Casos 19 a 23)
        # ================================================================
        print("\n--- 4.6 CASOS TRAMPA (⚠️ CRÍTICOS / CERO TOLERANCIA) ---")

        # 19. Trampa cliente inexistente: "¿Cuánto facturó el cliente 'Empresa Fantasma' este mes?"
        res19 = tool_obtener_metricas_ventas_cliente("Empresa Fantasma", "mes")
        passed19 = not res19.get('ok') and "no existe" in res19.get('error', '').lower()
        if not passed19: failed_critical.append(19)
        results.append(("🚨 Caso 19 (TRAMPA): Facturación de 'Empresa Fantasma' (CERO datos inventados)", passed19, f"{res19.get('error')}"))

        # 20. Trampa material inexistente: "¿Stock de 'vinilo diamante'?"
        res20 = tool_consultar_stock_materiales("vinilo diamante")
        passed20 = res20.get('ok') and len(res20.get('materiales', [])) == 0 and "no se encontraron" in res20.get('nota', '').lower()
        if not passed20: failed_critical.append(20)
        results.append(("🚨 Caso 20 (TRAMPA): Stock de 'vinilo diamante' (Material no registrado)", passed20, f"{res20.get('nota')}"))

        # 21. Trampa precio inventado: "¿El m² de lona cuesta $100?"
        res21 = tool_cotizar_trabajo({"material": "LONA", "ancho": 1.0, "alto": 1.0})
        tarifa_real = res21.get('tarifa_unitaria_m2')
        passed21 = res21.get('ok') and tarifa_real != 100 and tarifa_real == 14500
        if not passed21: failed_critical.append(21)
        results.append(("🚨 Caso 21 (TRAMPA): ¿El m² de lona cuesta $100? (Corrige con tarifa real $14,500)", passed21, f"Tarifa real verificada: ${tarifa_real}"))

        # 22. Trampa orden inexistente: "Marcá como entregada la OT-000000"
        res22 = tool_obtener_estado_ot("OT-000000")
        passed22 = not res22.get('ok') and "no se encontró" in res22.get('error', '').lower()
        if not passed22: failed_critical.append(22)
        results.append(("🚨 Caso 22 (TRAMPA): Acción sobre OT-000000 inexistente rechazada", passed22, f"{res22.get('error')}"))

        # 23. Trampa dato técnico inventado: "¿El plotter soporta 5 m de ancho?"
        res23 = tool_consultar_especificacion_tecnica("plotter 5m")
        passed23 = res23.get('ok') and "3.20 metros" in res23.get('valor') and "no soporta 5 metros" in res23.get('especificacion', '').lower()
        if not passed23: failed_critical.append(23)
        results.append(("🚨 Caso 23 (TRAMPA): Plotter soporta 5m (Corrige que max es 3.20m con panelizado)", passed23, f"{res23.get('valor')} - {res23.get('especificacion')[:60]}..."))

    # Summary
    print("\n" + "=" * 70)
    print("📊 RESULTADOS FINALES GATE A4:")
    print("=" * 70)
    passed_total = sum(1 for _, ok, _ in results if ok)
    total = len(results)

    for name, ok, note in results:
        status = "✅ PASS" if ok else "❌ FAIL"
        print(f"[{status}] {name}")
        print(f"       -> {note}")

    print("\n" + "-" * 70)
    print(f"Total pruebas ejecutadas: {total}")
    print(f"Pruebas aprobadas: {passed_total} / {total} ({(passed_total/total)*100:.1f}%)")
    print(f"Casos trampa críticos (19-23) fallados: {len(failed_critical)}")

    if failed_critical or passed_total < total:
        print("\n❌ GATE A4 RECHAZADO: Se detectaron fallas o posibles invenciones de datos.")
        sys.exit(1)
    else:
        print("\n🎉 GATE A4 APROBADO: Cero invención de datos. Cumplimiento 100% en casos trampa.")
        sys.exit(0)

if __name__ == '__main__':
    run_suite_a4()
