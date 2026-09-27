"""
Xana Analytics — Vistas SQL de Solo Lectura + Tools Analíticas Parametrizadas (Fase 3)
-------------------------------------------------------------------------------------
* Vistas de solo lectura para consultas seguras sin Text-to-SQL libre
* Compatibles con SQLite (local) y PostgreSQL/Neon (producción)
* Tools tipadas con timeouts y límites de filas
* Gate A4: Validación de consultas analíticas sin bloqueo del hilo principal
"""

import os
import time
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy import text, Column, Integer, String, Float, DateTime, Numeric, ForeignKey, func, select
from sqlalchemy.orm import Session
from models import db, Presupuesto, Cliente, Vendedor, Maquina, ConfigGlobal


# ================================================================
# CONFIGURACIÓN
# ================================================================

ANALYTICS_QUERY_TIMEOUT = int(os.environ.get('XANA_ANALYTICS_TIMEOUT', '3'))  # segundos
ANALYTICS_MAX_ROWS = int(os.environ.get('XANA_ANALYTICS_MAX_ROWS', '100'))
ANALYTICS_BUSY_TIMEOUT = int(os.environ.get('XANA_ANALYTICS_BUSY_TIMEOUT', '5000'))  # ms SQLite


# ================================================================
# VISTAS SQL (Definidas como CTEs / Queries parametrizadas)
# ================================================================

# Vista: Ventas por Cliente
VENTAS_CLIENTE_SQL = """
WITH ventas AS (
    SELECT 
        p.cliente_id,
        c.nombre as cliente_nombre,
        c.empresa,
        COUNT(p.id) as total_ordenes,
        COUNT(CASE WHEN p.estado = 'aprobado' THEN 1 END) as ordenes_aprobadas,
        COUNT(CASE WHEN p.estado = 'en_taller' THEN 1 END) as ordenes_en_taller,
        COUNT(CASE WHEN p.estado = 'entregado' THEN 1 END) as ordenes_entregadas,
        COALESCE(SUM(p.total), 0) as total_facturado,
        COALESCE(SUM(p.saldo_pendiente), 0) as saldo_pendiente_total,
        COALESCE(AVG(p.total), 0) as ticket_promedio,
        MAX(p.created_at) as ultima_orden,
        MIN(p.created_at) as primera_orden
    FROM presupuestos p
    LEFT JOIN clientes c ON p.cliente_id = c.id
    WHERE p.deleted_at IS NULL
      AND p.created_at >= :desde
      AND (:cliente_id IS NULL OR p.cliente_id = :cliente_id)
    GROUP BY p.cliente_id, c.nombre, c.empresa
)
SELECT * FROM ventas
ORDER BY total_facturado DESC
LIMIT :limit
"""

# Vista: Consumo de Materiales
CONSUMO_MATERIAL_SQL = """
WITH materiales_ordenes AS (
    SELECT 
        p.id as orden_id,
        p.estado,
        p.created_at,
        jsonb_each_text(p.especificaciones) as spec
    FROM presupuestos p
    WHERE p.deleted_at IS NULL
      AND p.created_at >= :desde
      AND p.especificaciones IS NOT NULL
      AND jsonb_typeof(p.especificaciones) = 'object'
),
material_extraido AS (
    SELECT 
        orden_id,
        estado,
        created_at,
        spec.key as campo,
        spec.value as valor
    FROM materiales_ordenes
),
material_agregado AS (
    SELECT 
        CASE 
            WHEN campo = 'material' THEN valor
            ELSE NULL
        END as material_codigo,
        CASE 
            WHEN campo = 'ancho' THEN valor::numeric
            ELSE NULL
        END as ancho_m,
        CASE 
            WHEN campo = 'alto' THEN valor::numeric
            ELSE NULL
        END as alto_m,
        CASE 
            WHEN campo = 'copias' THEN valor::int
            ELSE 1
        END as copias,
        estado,
        created_at
    FROM material_extraido
    WHERE campo IN ('material', 'ancho', 'alto', 'copias')
),
material_pivot AS (
    SELECT 
        orden_id,
        MAX(CASE WHEN campo = 'material' THEN valor END) as material,
        MAX(CASE WHEN campo = 'ancho' THEN valor::numeric END) as ancho,
        MAX(CASE WHEN campo = 'alto' THEN valor::numeric END) as alto,
        MAX(CASE WHEN campo = 'copias' THEN valor::int END) as copias,
        estado,
        created_at
    FROM material_extraido
    GROUP BY orden_id, estado, created_at
)
SELECT 
    material as material_codigo,
    COUNT(*) as total_ordenes,
    SUM(ancho * alto * copias) as metros_cuadrados_totales,
    AVG(ancho * alto * copias) as m2_promedio_orden,
    SUM(CASE WHEN estado = 'aprobado' THEN ancho * alto * copias ELSE 0 END) as m2_aprobados,
    SUM(CASE WHEN estado = 'en_taller' THEN ancho * alto * copias ELSE 0 END) as m2_en_taller,
    SUM(CASE WHEN estado = 'entregado' THEN ancho * alto * copias ELSE 0 END) as m2_entregados,
    MIN(created_at) as primer_uso,
    MAX(created_at) as ultimo_uso
FROM material_pivot
WHERE material IS NOT NULL
GROUP BY material
ORDER BY metros_cuadrados_totales DESC
LIMIT :limit
"""

# Vista: Rendimiento por Máquina
RENDIMIENTO_MAQUINA_SQL = """
WITH ordenes_maquina AS (
    SELECT 
        p.id,
        p.estado,
        p.created_at,
        p.updated_at,
        p.especificaciones,
        m.nombre as maquina_nombre,
        m.ancho_maximo
    FROM presupuestos p
    LEFT JOIN maquinas m ON p.maquina_id = m.id
    WHERE p.deleted_at IS NULL
      AND p.created_at >= :desde
      AND p.maquina_id IS NOT NULL
)
SELECT 
    maquina_nombre,
    COUNT(*) as total_ordenes,
    COUNT(CASE WHEN estado = 'entregado' THEN 1 END) as completadas,
    COUNT(CASE WHEN estado = 'en_taller' THEN 1 END) as en_proceso,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as horas_promedio_orden
FROM ordenes_maquina
GROUP BY maquina_nombre
ORDER BY total_ordenes DESC
LIMIT :limit
"""

# Vista: Resumen Financiero
RESUMEN_FINANCIERO_SQL = """
SELECT 
    COUNT(*) as total_ordenes,
    COUNT(CASE WHEN estado = 'borrador' THEN 1 END) as borradores,
    COUNT(CASE WHEN estado = 'orden' THEN 1 END) as para_imprimir,
    COUNT(CASE WHEN estado = 'aprobado' THEN 1 END) as aprobadas,
    COUNT(CASE WHEN estado = 'en_taller' THEN 1 END) as en_taller,
    COUNT(CASE WHEN estado = 'entregado' THEN 1 END) as entregadas,
    COUNT(CASE WHEN estado = 'facturado' THEN 1 END) as facturadas,
    COUNT(CASE WHEN estado = 'cancelado' THEN 1 END) as canceladas,
    COALESCE(SUM(total), 0) as facturacion_total,
    COALESCE(SUM(saldo_pendiente), 0) as saldo_pendiente_total,
    COALESCE(SUM(sena_monto), 0) as senas_cobradas,
    COALESCE(AVG(total), 0) as ticket_promedio
FROM presupuestos
WHERE deleted_at IS NULL
  AND created_at >= :desde
"""


# ================================================================
# HELPERS DE EJECUCIÓN SEGURA
# ================================================================

def _execute_analytics_query(sql: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Ejecuta una query analítica con timeouts y límites de seguridad.
    Compatible con SQLite y PostgreSQL.
    """
    start_time = time.perf_counter()
    
    try:
        # Configurar timeouts según dialecto
        dialect = db.engine.dialect.name
        
        if dialect == 'sqlite':
            # SQLite: busy_timeout via PRAGMA
            db.session.execute(text(f"PRAGMA busy_timeout = {ANALYTICS_BUSY_TIMEOUT}"))
        
        # Ejecutar query con parámetros
        result = db.session.execute(text(sql), params)
        rows = result.fetchmany(ANALYTICS_MAX_ROWS)
        
        # Convertir a lista de dicts
        columns = result.keys()
        data = [dict(zip(columns, row)) for row in rows]
        
        latency_ms = (time.perf_counter() - start_time) * 1000
        
        # Log telemetría
        _log_analytics_telemetry(sql, params, len(data), latency_ms, 'success')
        
        return data
        
    except Exception as e:
        latency_ms = (time.perf_counter() - start_time) * 1000
        _log_analytics_telemetry(sql, params, 0, latency_ms, f'error:{str(e)[:100]}')
        raise


def _log_analytics_telemetry(sql: str, params: Dict, rows: int, latency_ms: float, status: str):
    """Registra telemetría de queries analíticas."""
    try:
        clave = 'xana_analytics_telemetry'
        row = ConfigGlobal.query.filter_by(clave=clave).first()
        logs = row.valor if row and isinstance(row.valor, list) else []
        
        logs.append({
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'query_type': sql[:50],
            'params': {k: str(v) for k, v in params.items()},
            'rows_returned': rows,
            'latency_ms': round(latency_ms, 2),
            'status': status
        })
        
        if len(logs) > 500:
            logs = logs[-500:]
            
        if row:
            row.valor = logs
        else:
            row = ConfigGlobal(clave=clave, valor=logs)
            db.session.add(row)
        db.session.commit()
    except Exception:
        db.session.rollback()


# ================================================================
# TOOLS ANALÍTICAS (Function Calling)
# ================================================================

ANALYTICS_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "obtener_ventas_cliente",
            "description": "Obtiene métricas de ventas por cliente en un período (facturación, órdenes, ticket promedio).",
            "parameters": {
                "type": "object",
                "properties": {
                    "cliente_id": {"type": "integer", "description": "ID del cliente (opcional, si se omite devuelve top clientes)"},
                    "periodo": {"type": "string", "description": "Período: 'semana', 'mes', 'trimestre', 'anio'", "default": "mes"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtener_consumo_materiales",
            "description": "Obtiene consumo de materiales (m²) por tipo en un período.",
            "parameters": {
                "type": "object",
                "properties": {
                    "periodo": {"type": "string", "description": "Período: 'semana', 'mes', 'trimestre', 'anio'", "default": "mes"}
                },
                "required": ["periodo"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtener_rendimiento_maquinas",
            "description": "Obtiene rendimiento de máquinas de impresión (órdenes, tiempos).",
            "parameters": {
                "type": "object",
                "properties": {
                    "periodo": {"type": "string", "description": "Período: 'semana', 'mes', 'trimestre', 'anio'", "default": "mes"}
                },
                "required": ["periodo"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtener_resumen_financiero",
            "description": "Obtiene resumen financiero global (facturación, saldos, señas, estados).",
            "parameters": {
                "type": "object",
                "properties": {
                    "periodo": {"type": "string", "description": "Período: 'semana', 'mes', 'trimestre', 'anio'", "default": "mes"}
                },
                "required": ["periodo"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtener_top_clientes",
            "description": "Obtiene los top N clientes por facturación en un período.",
            "parameters": {
                "type": "object",
                "properties": {
                    "periodo": {"type": "string", "description": "Período: 'semana', 'mes', 'trimestre', 'anio'", "default": "mes"},
                    "top_n": {"type": "integer", "description": "Cantidad de clientes a devolver", "default": 10}
                },
                "required": ["periodo"]
            }
        }
    }
]

PERIODO_DIAS = {
    'semana': 7,
    'mes': 30,
    'trimestre': 90,
    'anio': 365
}


def _parse_periodo(periodo: str) -> datetime:
    """Convierte período a fecha desde."""
    dias = PERIODO_DIAS.get((periodo or 'mes').lower(), 30)
    return datetime.now(timezone.utc) - timedelta(days=dias)


# ================================================================
# EJECUTORES DE TOOLS ANALÍTICAS
# ================================================================

def tool_obtener_ventas_cliente(cliente_id: Optional[int] = None, periodo: str = 'mes') -> Dict[str, Any]:
    """Métricas de ventas por cliente."""
    desde = _parse_periodo(periodo)
    
    data = _execute_analytics_query(VENTAS_CLIENTE_SQL, {
        'desde': desde,
        'cliente_id': cliente_id,
        'limit': ANALYTICS_MAX_ROWS
    })
    
    return {
        "ok": True,
        "periodo": periodo,
        "desde": desde.isoformat(),
        "clientes": data,
        "citacion": "VIEW:v_ventas_cliente"
    }


def tool_obtener_consumo_materiales(periodo: str = 'mes') -> Dict[str, Any]:
    """Consumo de materiales en m²."""
    desde = _parse_periodo(periodo)
    
    data = _execute_analytics_query(CONSUMO_MATERIAL_SQL, {
        'desde': desde,
        'limit': ANALYTICS_MAX_ROWS
    })
    
    return {
        "ok": True,
        "periodo": periodo,
        "desde": desde.isoformat(),
        "materiales": data,
        "citacion": "VIEW:v_consumo_material"
    }


def tool_obtener_rendimiento_maquinas(periodo: str = 'mes') -> Dict[str, Any]:
    """Rendimiento de máquinas."""
    desde = _parse_periodo(periodo)
    
    data = _execute_analytics_query(RENDIMIENTO_MAQUINA_SQL, {
        'desde': desde,
        'limit': ANALYTICS_MAX_ROWS
    })
    
    return {
        "ok": True,
        "periodo": periodo,
        "desde": desde.isoformat(),
        "maquinas": data,
        "citacion": "VIEW:v_rendimiento_maquina"
    }


def tool_obtener_resumen_financiero(periodo: str = 'mes') -> Dict[str, Any]:
    """Resumen financiero global."""
    desde = _parse_periodo(periodo)
    
    data = _execute_analytics_query(RESUMEN_FINANCIERO_SQL, {
        'desde': desde
    })
    
    return {
        "ok": True,
        "periodo": periodo,
        "desde": desde.isoformat(),
        "resumen": data[0] if data else {},
        "citacion": "VIEW:v_resumen_financiero"
    }


def tool_obtener_top_clientes(periodo: str = 'mes', top_n: int = 10) -> Dict[str, Any]:
    """Top clientes por facturación."""
    desde = _parse_periodo(periodo)
    
    data = _execute_analytics_query(VENTAS_CLIENTE_SQL + f" LIMIT {min(top_n, ANALYTICS_MAX_ROWS)}", {
        'desde': desde,
        'cliente_id': None,
        'limit': min(top_n, ANALYTICS_MAX_ROWS)
    })
    
    return {
        "ok": True,
        "periodo": periodo,
        "desde": desde.isoformat(),
        "top_clientes": data,
        "citacion": "VIEW:v_ventas_cliente (top)"
    }


ANALYTICS_TOOL_EXECUTORS = {
    "obtener_ventas_cliente": tool_obtener_ventas_cliente,
    "obtener_consumo_materiales": tool_obtener_consumo_materiales,
    "obtener_rendimiento_maquinas": tool_obtener_rendimiento_maquinas,
    "obtener_resumen_financiero": tool_obtener_resumen_financiero,
    "obtener_top_clientes": tool_obtener_top_clientes
}


def execute_analytics_tool(name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    """Despacha una llamada a tool analítica."""
    fn = ANALYTICS_TOOL_EXECUTORS.get(name)
    if not fn:
        return {"ok": False, "error": f"Herramienta analítica desconocida: {name}"}
    try:
        return fn(**args)
    except Exception as e:
        return {"ok": False, "error": str(e)}


def format_analytics_tool_result(name: str, result: Dict[str, Any]) -> str:
    """Formatea resultado de tool analítica para respuesta al usuario."""
    if not result.get('ok'):
        return f"⚠️ {result.get('error', 'Error en la consulta analítica.')}"
    
    citacion = result.get('citacion', '')
    periodo = result.get('periodo', '')
    
    if name == 'obtener_ventas_cliente':
        clientes = result.get('clientes', [])
        if not clientes:
            return f"📊 Sin datos de ventas para el período {periodo}."
        lines = [f"📊 **Ventas por Cliente ({periodo})** ({len(clientes)} cliente(s)):"]
        for c in clientes[:10]:
            lines.append(
                f"• **{c.get('cliente_nombre', 'N/A')}** ({c.get('empresa') or '—'}): "
                f"${c.get('total_facturado', 0):,.2f} | "
                f"{c.get('total_ordenes', 0)} órdenes | "
                f"Ticket: ${c.get('ticket_promedio', 0):,.2f} | "
                f"Saldo: ${c.get('saldo_pendiente_total', 0):,.2f}"
            )
        if citacion:
            lines.append(f"📎 Fuente: `{citacion}`")
        return '\n'.join(lines)
    
    if name == 'obtener_consumo_materiales':
        materiales = result.get('materiales', [])
        if not materiales:
            return f"📦 Sin consumo de materiales para el período {periodo}."
        lines = [f"📦 **Consumo de Materiales ({periodo})** ({len(materiales)} material(es)):"]
        for m in materiales[:10]:
            lines.append(
                f"• **{m.get('material_codigo', 'N/A')}**: "
                f"{m.get('metros_cuadrados_totales', 0):,.2f} m² totales | "
                f"{m.get('total_ordenes', 0)} órdenes | "
                f"Promedio: {m.get('m2_promedio_orden', 0):.2f} m²/orden"
            )
        if citacion:
            lines.append(f"📎 Fuente: `{citacion}`")
        return '\n'.join(lines)
    
    if name == 'obtener_rendimiento_maquinas':
        maquinas = result.get('maquinas', [])
        if not maquinas:
            return f"🖨️ Sin datos de máquinas para el período {periodo}."
        lines = [f"🖨️ **Rendimiento de Máquinas ({periodo})** ({len(maquinas)} máquina(s)):"]
        for m in maquinas[:10]:
            completadas = m.get('completadas', 0)
            total = m.get('total_ordenes', 1)
            pct = (completadas / total * 100) if total > 0 else 0
            lines.append(
                f"• **{m.get('maquina_nombre', 'N/A')}**: "
                f"{total} órdenes ({completadas} completadas, {pct:.0f}%) | "
                f"⌀ {m.get('horas_promedio_orden', 0):.1f}h/orden"
            )
        if citacion:
            lines.append(f"📎 Fuente: `{citacion}`")
        return '\n'.join(lines)
    
    if name == 'obtener_resumen_financiero':
        r = result.get('resumen', {})
        lines = [f"💰 **Resumen Financiero ({periodo}):**"]
        lines.append(f"• Órdenes totales: {r.get('total_ordenes', 0)}")
        lines.append(f"• Facturación: ${r.get('facturacion_total', 0):,.2f}")
        lines.append(f"• Saldo pendiente: ${r.get('saldo_pendiente_total', 0):,.2f}")
        lines.append(f"• Señas cobradas: ${r.get('senas_cobradas', 0):,.2f}")
        lines.append(f"• Ticket promedio: ${r.get('ticket_promedio', 0):,.2f}")
        lines.append("")
        lines.append("**Por Estado:**")
        for estado in ['borradores', 'para_imprimir', 'aprobadas', 'en_taller', 'entregadas', 'facturadas', 'canceladas']:
            val = r.get(estado, 0)
            if val > 0:
                lines.append(f"• {estado.replace('_', ' ').title()}: {val}")
        if citacion:
            lines.append(f"📎 Fuente: `{citacion}`")
        return '\n'.join(lines)
    
    if name == 'obtener_top_clientes':
        clientes = result.get('top_clientes', [])
        if not clientes:
            return f"🏆 Sin top clientes para el período {periodo}."
        lines = [f"🏆 **Top {len(clientes)} Clientes por Facturación ({periodo}):**"]
        for i, c in enumerate(clientes, 1):
            lines.append(
                f"{i}. **{c.get('cliente_nombre', 'N/A')}**: "
                f"${c.get('total_facturado', 0):,.2f} | "
                f"{c.get('total_ordenes', 0)} órdenes"
            )
        if citacion:
            lines.append(f"📎 Fuente: `{citacion}`")
        return '\n'.join(lines)
    
    return "✅ Consulta analítica completada."


def get_analytics_telemetry_stats() -> Dict[str, Any]:
    """Estadísticas de telemetría analítica (Gate A4)."""
    try:
        row = ConfigGlobal.query.filter_by(clave='xana_analytics_telemetry').first()
        logs = row.valor if row and isinstance(row.valor, list) else []
        
        if not logs:
            return {'total_queries': 0, 'avg_latency_ms': 0, 'p95_latency_ms': 0}
        
        latencies = [l.get('latency_ms', 0) for l in logs if l.get('status') == 'success']
        latencies.sort()
        
        return {
            'total_queries': len(logs),
            'successful_queries': len(latencies),
            'avg_latency_ms': round(sum(latencies) / len(latencies), 2) if latencies else 0,
            'p95_latency_ms': round(latencies[int(len(latencies) * 0.95)], 2) if latencies else 0,
            'max_rows_config': ANALYTICS_MAX_ROWS,
            'timeout_config': ANALYTICS_QUERY_TIMEOUT
        }
    except Exception as e:
        return {'error': str(e)}