"""
Xana Knowledge Base — Capa Estructurada + RAG Pragmático (Fase 2)
------------------------------------------------------------------
* Capa Estructurada: Fichas técnicas, anchos de bobina, precios, tolerancias.
  Reutiliza el motor de precios existente (pricingCalculator.ts / precios en BD).
* Capa RAG: Índice plano persistente solo para manuales y guías operativas.
  Sin dependencias pesadas (Qdrant/ChromaDB/LlamaIndex). Embeddings con
  sentence-transformers (all-MiniLM-L6-v2, ~22MB, CPU-friendly).
* Citas obligatorias en respuestas RAG.
* Telemetría de latencia (Gate A3: ≤300ms, corpus ≤500 docs/5MB).
"""

import os
import json
import time
import re
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path

from models import db, ConfigGlobal
from sqlalchemy import text

# ================================================================
# CONFIGURACIÓN
# ================================================================

# Corpus RAG: carpeta con manuales/guías (.md, .txt, .pdf)
RAG_CORPUS_DIR = os.environ.get('XANA_RAG_CORPUS_DIR', 'server/rag_corpus')
# Índice plano persistente (JSON)
RAG_INDEX_PATH = os.environ.get('XANA_RAG_INDEX_PATH', 'server/rag_index.json')
# Modelo de embeddings (ligero, CPU)
EMBEDDING_MODEL = os.environ.get('XANA_EMBEDDING_MODEL', 'all-MiniLM-L6-v2')
# Umbral de similitud para recuperación
RAG_SIMILARITY_THRESHOLD = float(os.environ.get('XANA_RAG_SIMILARITY_THRESHOLD', '0.35'))
# Top-K resultados
RAG_TOP_K = int(os.environ.get('XANA_RAG_TOP_K', '4'))
# Límite de corpus (Gate A3)
MAX_CORPUS_DOCS = int(os.environ.get('XANA_MAX_CORPUS_DOCS', '500'))
MAX_CORPUS_MB = float(os.environ.get('XANA_MAX_CORPUS_MB', '5'))

# Claves ConfigGlobal
KEY_STRUCTURED_KB = 'xana_structured_kb'
KEY_RAG_INDEX = 'xana_rag_index'
KEY_RAG_TELEMETRY = 'xana_rag_telemetry'

# ================================================================
# CAPA ESTRUCTURADA — Materiales, Precios, Especificaciones
# ================================================================

# Esquema de ficha técnica estructurada
STRUCTURED_KB_SCHEMA = {
    "version": "1.0",
    "updated_at": None,
    "materials": {},      # codigo -> ficha completa
    "bobinas": {},        # ancho -> {materiales_compatibles, precios_referencia}
    "precios_m2": {},     # codigo_material -> precio_por_m2
    "tolerancias": {},    # regla -> valor
    "procedimientos": {}  # nombre -> pasos/resumen
}

DEFAULT_STRUCTURED_KB = {
    "version": "1.0",
    "updated_at": datetime.now(timezone.utc).isoformat(),
    "materials": {},
    "bobinas": {},
    "precios_m2": {},
    "tolerancias": {
        "margen_seguridad_cm": 1.0,
        "desperdicio_maximo_pct": 15,
        "dpi_minimo_impresion": 72,
        "dpi_recomendado": 150,
        "escala_max_gigantografia": 10
    },
    "procedimientos": {}
}


def get_structured_kb() -> Dict[str, Any]:
    """Obtiene la base de conocimiento estructurada desde ConfigGlobal."""
    try:
        row = ConfigGlobal.query.filter_by(clave=KEY_STRUCTURED_KB).first()
        if row and isinstance(row.valor, dict):
            kb = row.valor
            # Asegurar todas las claves
            for k, v in DEFAULT_STRUCTURED_KB.items():
                if k not in kb:
                    kb[k] = v
            return kb
    except Exception as e:
        print(f"[Xana KB] Error leyendo KB estructurada: {e}")
    return DEFAULT_STRUCTURED_KB.copy()


def save_structured_kb(kb: Dict[str, Any]) -> bool:
    """Guarda la base de conocimiento estructurada en ConfigGlobal."""
    try:
        kb['updated_at'] = datetime.now(timezone.utc).isoformat()
        row = ConfigGlobal.query.filter_by(clave=KEY_STRUCTURED_KB).first()
        if not row:
            row = ConfigGlobal(clave=KEY_STRUCTURED_KB, valor=kb)
            db.session.add(row)
        else:
            row.valor = kb
        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        print(f"[Xana KB] Error guardando KB estructurada: {e}")
        return False


def sync_materials_to_kb() -> Dict[str, Any]:
    """
    Sincroniza materiales desde collection_materiales (ConfigGlobal) a la KB estructurada.
    Reutiliza datos existentes en lugar de duplicarlos.
    """
    from services.xana_tools import _get_materiales
    
    kb = get_structured_kb()
    materiales = _get_materiales()
    
    for m in materiales:
        codigo = m.get('codigo', '')
        if not codigo:
            continue
            
        # Construir ficha técnica completa
        ficha = {
            "codigo": codigo,
            "descripcion": m.get('descripcion', ''),
            "tipo": m.get('tipo', ''),
            "tipoCobro": m.get('tipoCobro', 'm2'),
            "unidad": m.get('unidad', 'm2'),
            "anchos_disponibles": [b.get('ancho') for b in (m.get('bobinas', []) or []) if b.get('ancho')],
            "stock_actual": m.get('stockActual', 0),
            "stock_minimo": m.get('stockMinimo', 10),
            "botellas_cerradas": m.get('botellasCerradas', 0),
            "botellas_ml": m.get('botellasMl', 0),
            "precio_m2": m.get('precio', m.get('precio_m2', 0)),
            "precios_especiales": m.get('preciosEspeciales', {}),
            "especificaciones": {
                "gramaje": m.get('gramaje'),
                "acabado": m.get('acabado'),
                "durabilidad": m.get('durabilidad'),
                "aplicacion": m.get('aplicacion'),
            },
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        kb['materials'][codigo] = ficha
        
        # Indexar anchos de bobina
        for bobina in (m.get('bobinas', []) or []):
            ancho = bobina.get('ancho')
            if ancho:
                if ancho not in kb['bobinas']:
                    kb['bobinas'][ancho] = {"materiales_compatibles": [], "precios_referencia": {}}
                if codigo not in kb['bobinas'][ancho]['materiales_compatibles']:
                    kb['bobinas'][ancho]['materiales_compatibles'].append(codigo)
                precio = m.get('precio', m.get('precio_m2', 0))
                if precio:
                    kb['bobinas'][ancho]['precios_referencia'][codigo] = precio
        
        # Indexar precio por m2
        precio_m2 = m.get('precio', m.get('precio_m2', 0))
        if precio_m2:
            kb['precios_m2'][codigo] = precio_m2
    
    save_structured_kb(kb)
    return kb


def query_structured_kb(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Consulta difusa sobre la KB estructurada (materiales, bobinas, precios).
    Retorna fichas técnicas relevantes con cita de fuente.
    """
    kb = get_structured_kb()
    q = (query or '').lower().strip()
    if not q:
        return []
    
    results = []
    
    # Buscar en materiales
    for codigo, ficha in kb.get('materials', {}).items():
        score = 0
        haystack = ' '.join([
            ficha.get('codigo', ''),
            ficha.get('descripcion', ''),
            ficha.get('tipo', ''),
            ' '.join(ficha.get('anchos_disponibles', [])),
            str(ficha.get('precio_m2', ''))
        ]).lower()
        
        # Coincidencias por tokens
        for token in q.split():
            if token in haystack:
                score += 1
        
        if score > 0:
            results.append({
                'tipo': 'material',
                'codigo': codigo,
                'score': score,
                'data': ficha,
                'citacion': f"KB:materiales:{codigo}"
            })
    
    # Buscar en bobinas
    for ancho, info in kb.get('bobinas', {}).items():
        score = 0
        haystack = f"{ancho} {' '.join(info.get('materiales_compatibles', []))}".lower()
        for token in q.split():
            if token in haystack:
                score += 1
        if score > 0:
            results.append({
                'tipo': 'bobina',
                'ancho': ancho,
                'score': score,
                'data': info,
                'citacion': f"KB:bobinas:{ancho}"
            })
    
    # Buscar en procedimientos
    for nombre, proc in kb.get('procedimientos', {}).items():
        score = 0
        haystack = f"{nombre} {json.dumps(proc, ensure_ascii=False)}".lower()
        for token in q.split():
            if token in haystack:
                score += 1
        if score > 0:
            results.append({
                'tipo': 'procedimiento',
                'nombre': nombre,
                'score': score,
                'data': proc,
                'citacion': f"KB:procedimientos:{nombre}"
            })
    
    # Ordenar por score descendente
    results.sort(key=lambda x: x['score'], reverse=True)
    return results[:top_k]


# ================================================================
# CAPA RAG — Índice Plano para Manuales/Guías
# ================================================================

class FlatRAGIndex:
    """Índice RAG plano y ligero sin dependencias externas pesadas."""
    
    def __init__(self):
        self.index_path = RAG_INDEX_PATH
        self.corpus_dir = RAG_CORPUS_DIR
        self.embeddings = None
        self.documents = []  # List[Dict: {id, content, metadata, embedding}]
        self._model = None
        self._load_index()
    
    def _get_model(self):
        """Lazy load del modelo de embeddings."""
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(EMBEDDING_MODEL)
            except ImportError:
                print("[Xana RAG] sentence-transformers no instalado. Instalar con: pip install sentence-transformers")
                return None
            except Exception as e:
                print(f"[Xana RAG] Error cargando modelo: {e}")
                return None
        return self._model
    
    def _load_index(self):
        """Carga el índice desde disco o ConfigGlobal."""
        try:
            # Intentar cargar desde archivo JSON primero
            if os.path.exists(self.index_path):
                with open(self.index_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.documents = data.get('documents', [])
                    return
            
            # Fallback a ConfigGlobal
            row = ConfigGlobal.query.filter_by(clave=KEY_RAG_INDEX).first()
            if row and isinstance(row.valor, dict):
                self.documents = row.valor.get('documents', [])
        except Exception as e:
            print(f"[Xana RAG] Error cargando índice: {e}")
            self.documents = []
    
    def _save_index(self):
        """Guarda el índice en archivo JSON y ConfigGlobal."""
        try:
            data = {
                'version': '1.0',
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'doc_count': len(self.documents),
                'documents': self.documents
            }
            # Archivo JSON
            os.makedirs(os.path.dirname(self.index_path), exist_ok=True)
            with open(self.index_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            # ConfigGlobal como backup
            row = ConfigGlobal.query.filter_by(clave=KEY_RAG_INDEX).first()
            if not row:
                row = ConfigGlobal(clave=KEY_RAG_INDEX, valor=data)
                db.session.add(row)
            else:
                row.valor = data
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"[Xana RAG] Error guardando índice: {e}")
    
    def _chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """Divide texto en chunks con overlap."""
        if len(text) <= chunk_size:
            return [text]
        
        chunks = []
        start = 0
        while start < len(text):
            end = min(start + chunk_size, len(text))
            # Buscar fin de oración cerca del límite
            if end < len(text):
                last_period = text.rfind('.', start, end)
                if last_period > start + chunk_size // 2:
                    end = last_period + 1
            chunks.append(text[start:end].strip())
            start = end - overlap
        return chunks
    
    def ingest_file(self, file_path: str, metadata: Optional[Dict] = None) -> int:
        """Ingiere un archivo al índice RAG."""
        model = self._get_model()
        if model is None:
            return 0
        
        path = Path(file_path)
        if not path.exists():
            return 0
        
        # Leer contenido según extensión
        ext = path.suffix.lower()
        content = ""
        
        if ext in ['.md', '.txt', '.py', '.js', '.ts', '.json', '.yaml', '.yml']:
            content = path.read_text(encoding='utf-8', errors='ignore')
        elif ext == '.pdf':
            try:
                import pypdfium2 as pdfium
                pdf = pdfium.PdfDocument(str(path))
                for page in pdf:
                    text_page = page.get_textpage()
                    content += text_page.get_text_range() or ""
                    content += "\n\n"
            except Exception as e:
                print(f"[Xana RAG] Error leyendo PDF {path}: {e}")
                return 0
        else:
            return 0
        
        if not content.strip():
            return 0
        
        # Verificar límites de corpus (Gate A3)
        total_chars = sum(len(d['content']) for d in self.documents)
        total_mb = total_chars / (1024 * 1024)
        if len(self.documents) >= MAX_CORPUS_DOCS or total_mb >= MAX_CORPUS_MB:
            print(f"[Xana RAG] Límite de corpus alcanzado: {len(self.documents)} docs, {total_mb:.1f}MB")
            return 0
        
        # Chunking
        chunks = self._chunk_text(content)
        doc_id_base = hashlib.md5(str(path).encode()).hexdigest()[:12]
        
        new_docs = 0
        for i, chunk in enumerate(chunks):
            if not chunk.strip():
                continue
            
            embedding = model.encode(chunk).tolist()
            
            doc = {
                'id': f"{doc_id_base}_{i}",
                'source': str(path),
                'source_name': path.name,
                'chunk_index': i,
                'content': chunk,
                'metadata': metadata or {},
                'embedding': embedding,
                'ingested_at': datetime.now(timezone.utc).isoformat()
            }
            self.documents.append(doc)
            new_docs += 1
        
        if new_docs > 0:
            self._save_index()
        
        return new_docs
    
    def ingest_directory(self, directory: Optional[str] = None) -> int:
        """Ingiere todos los archivos soportados en un directorio."""
        target_dir = directory or self.corpus_dir
        if not os.path.exists(target_dir):
            print(f"[Xana RAG] Directorio no existe: {target_dir}")
            return 0
        
        total = 0
        for ext in ['.md', '.txt', '.pdf']:
            for file_path in Path(target_dir).rglob(f'*{ext}'):
                total += self.ingest_file(str(file_path))
        return total
    
    def search(self, query: str, top_k: int = RAG_TOP_K, threshold: float = RAG_SIMILARITY_THRESHOLD) -> List[Dict[str, Any]]:
        """Búsqueda semántica en el índice RAG con telemetría de latencia."""
        start_time = time.perf_counter()
        
        model = self._get_model()
        if model is None or not self.documents:
            latency_ms = (time.perf_counter() - start_time) * 1000
            self._log_telemetry(query, 0, latency_ms, 'no_model_or_empty')
            return []
        
        try:
            # Embedding de la query
            query_embedding = model.encode(query).tolist()
            
            # Similitud coseno simple
            import numpy as np
            query_vec = np.array(query_embedding)
            
            results = []
            for doc in self.documents:
                doc_vec = np.array(doc['embedding'])
                # Cosine similarity
                sim = float(np.dot(query_vec, doc_vec) / (np.linalg.norm(query_vec) * np.linalg.norm(doc_vec)))
                if sim >= threshold:
                    results.append({
                        'id': doc['id'],
                        'source': doc['source'],
                        'source_name': doc['source_name'],
                        'chunk_index': doc['chunk_index'],
                        'content': doc['content'],
                        'metadata': doc.get('metadata', {}),
                        'score': sim,
                        'citacion': f"RAG:{doc['source_name']}:chunk{doc['chunk_index']}"
                    })
            
            # Ordenar por similitud
            results.sort(key=lambda x: x['score'], reverse=True)
            results = results[:top_k]
            
            latency_ms = (time.perf_counter() - start_time) * 1000
            self._log_telemetry(query, len(results), latency_ms, 'success')
            
            return results
        except Exception as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            self._log_telemetry(query, 0, latency_ms, f'error:{str(e)[:50]}')
            print(f"[Xana RAG] Error en búsqueda: {e}")
            return []
    
    def _log_telemetry(self, query: str, results_count: int, latency_ms: float, status: str):
        """Registra telemetría de búsqueda para Gate A3."""
        try:
            row = ConfigGlobal.query.filter_by(clave=KEY_RAG_TELEMETRY).first()
            logs = row.valor if row and isinstance(row.valor, list) else []
            
            logs.append({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'query': query[:100],
                'results_count': results_count,
                'latency_ms': round(latency_ms, 2),
                'status': status,
                'corpus_size': len(self.documents)
            })
            
            # Mantener solo últimas 1000 entradas
            if len(logs) > 1000:
                logs = logs[-1000:]
            
            if row:
                row.valor = logs
            else:
                row = ConfigGlobal(clave=KEY_RAG_TELEMETRY, valor=logs)
                db.session.add(row)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"[Xana RAG] Error logging telemetry: {e}")
    
    def get_telemetry_stats(self) -> Dict[str, Any]:
        """Estadísticas de telemetría para Gate A3."""
        try:
            row = ConfigGlobal.query.filter_by(clave=KEY_RAG_TELEMETRY).first()
            logs = row.valor if row and isinstance(row.valor, list) else []
            
            if not logs:
                return {'total_queries': 0, 'avg_latency_ms': 0, 'p95_latency_ms': 0, 'corpus_size': len(self.documents)}
            
            latencies = [l.get('latency_ms', 0) for l in logs if l.get('status') == 'success']
            latencies.sort()
            
            return {
                'total_queries': len(logs),
                'successful_queries': len(latencies),
                'avg_latency_ms': round(sum(latencies) / len(latencies), 2) if latencies else 0,
                'p95_latency_ms': round(latencies[int(len(latencies) * 0.95)], 2) if latencies else 0,
                'corpus_size': len(self.documents),
                'corpus_mb': round(sum(len(d['content']) for d in self.documents) / (1024 * 1024), 2)
            }
        except Exception as e:
            print(f"[Xana RAG] Error getting telemetry: {e}")
            return {'error': str(e)}


# Instancia global del índice RAG
rag_index = FlatRAGIndex()


# ================================================================
# TOOLS DE CONOCIMIENTO PARA FUNCTION CALLING
# ================================================================

KNOWLEDGE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "consultar_ficha_tecnica",
            "description": "Consulta la ficha técnica estructurada de un material (especificaciones, anchos, precios, stock).",
            "parameters": {
                "type": "object",
                "properties": {
                    "material_codigo": {"type": "string", "description": "Código del material (ej. VV, LONA, MICRO, VINILO)"}
                },
                "required": ["material_codigo"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "consultar_bobinas_disponibles",
            "description": "Lista los anchos de bobina disponibles y qué materiales son compatibles con cada ancho.",
            "parameters": {
                "type": "object",
                "properties": {
                    "ancho_minimo": {"type": "number", "description": "Ancho mínimo en metros (opcional)"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "consultar_precio_material",
            "description": "Obtiene el precio por m² de un material específico, incluyendo precios especiales por cliente si se proporciona.",
            "parameters": {
                "type": "object",
                "properties": {
                    "material_codigo": {"type": "string", "description": "Código del material"},
                    "cliente_id": {"type": "integer", "description": "ID del cliente para precio especial (opcional)"}
                },
                "required": ["material_codigo"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "buscar_en_manuales",
            "description": "Busca en los manuales y guías operativas indexados (RAG) usando búsqueda semántica. Útil para procedimientos, tolerancias, guías de taller.",
            "parameters": {
                "type": "object",
                "properties": {
                    "consulta": {"type": "string", "description": "Pregunta o términos de búsqueda en lenguaje natural"}
                },
                "required": ["consulta"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "consultar_procedimiento",
            "description": "Consulta un procedimiento operativo documentado en la KB estructurada.",
            "parameters": {
                "type": "object",
                "properties": {
                    "nombre": {"type": "string", "description": "Nombre del procedimiento (ej. 'cambio_bobina', 'calibracion_tinta', 'preparacion_archivo')"}
                },
                "required": ["nombre"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "consultar_tolerancias",
            "description": "Consulta las tolerancias y reglas técnicas del sistema (márgenes, DPI, escalas, desperdicios).",
            "parameters": {
                "type": "object",
                "properties": {
                    "regla": {"type": "string", "description": "Nombre de la regla específica (opcional, si se omite devuelve todas)"}
                },
                "required": []
            }
        }
    }
]


# ================================================================
# EJECUTORES DE TOOLS DE CONOCIMIENTO
# ================================================================

def tool_consultar_ficha_tecnica(material_codigo: str) -> Dict[str, Any]:
    """Consulta ficha técnica completa de un material."""
    kb = get_structured_kb()
    codigo = (material_codigo or '').strip().upper()
    
    if codigo not in kb.get('materials', {}):
        # Intentar búsqueda difusa
        results = query_structured_kb(codigo, top_k=1)
        if results and results[0]['tipo'] == 'material':
            ficha = results[0]['data']
            return {"ok": True, "ficha": ficha, "citacion": results[0]['citacion']}
        return {"ok": False, "error": f"No se encontró ficha técnica para material '{material_codigo}'."}
    
    ficha = kb['materials'][codigo]
    return {
        "ok": True,
        "ficha": ficha,
        "citacion": f"KB:materiales:{codigo}"
    }


def tool_consultar_bobinas_disponibles(ancho_minimo: float = 0) -> Dict[str, Any]:
    """Lista bobinas disponibles con materiales compatibles."""
    kb = get_structured_kb()
    bobinas = kb.get('bobinas', {})
    
    resultados = []
    for ancho_str, info in sorted(bobinas.items(), key=lambda x: float(x[0])):
        ancho = float(ancho_str)
        if ancho >= ancho_minimo:
            resultados.append({
                "ancho_m": ancho,
                "materiales_compatibles": info.get('materiales_compatibles', []),
                "precios_referencia_m2": info.get('precios_referencia', {})
            })
    
    if not resultados:
        return {"ok": True, "bobinas": [], "nota": f"No hay bobinas con ancho >= {ancho_minimo}m"}
    
    return {
        "ok": True,
        "bobinas": resultados,
        "citacion": "KB:bobinas"
    }


def tool_consultar_precio_material(material_codigo: str, cliente_id: Optional[int] = None) -> Dict[str, Any]:
    """Consulta precio por m² de un material."""
    kb = get_structured_kb()
    codigo = (material_codigo or '').strip().upper()
    
    precio_base = kb.get('precios_m2', {}).get(codigo)
    ficha = kb.get('materials', {}).get(codigo, {})
    precios_especiales = ficha.get('precios_especiales', {})
    
    if precio_base is None and not precios_especiales:
        return {"ok": False, "error": f"No hay precio registrado para material '{material_codigo}'."}
    
    resultado = {
        "material": codigo,
        "precio_base_m2": precio_base,
        "citacion": f"KB:precios_m2:{codigo}"
    }
    
    if cliente_id and str(cliente_id) in precios_especiales:
        resultado["precio_especial_m2"] = precios_especiales[str(cliente_id)]
        resultado["citacion"] += f" + especial:cliente:{cliente_id}"
    
    return {"ok": True, **resultado}


def tool_buscar_en_manuales(consulta: str) -> Dict[str, Any]:
    """Búsqueda semántica en manuales/guías (RAG)."""
    results = rag_index.search(consulta, top_k=RAG_TOP_K)
    
    if not results:
        return {"ok": True, "resultados": [], "nota": "No se encontraron pasajes relevantes en los manuales."}
    
    return {
        "ok": True,
        "resultados": results,
        "citacion": " | ".join(r['citacion'] for r in results)
    }


def tool_consultar_procedimiento(nombre: str) -> Dict[str, Any]:
    """Consulta un procedimiento de la KB estructurada."""
    kb = get_structured_kb()
    procs = kb.get('procedimientos', {})
    
    # Búsqueda exacta primero
    if nombre in procs:
        return {"ok": True, "procedimiento": procs[nombre], "citacion": f"KB:procedimientos:{nombre}"}
    
    # Búsqueda difusa
    for key, proc in procs.items():
        if nombre.lower() in key.lower() or key.lower() in nombre.lower():
            return {"ok": True, "procedimiento": proc, "citacion": f"KB:procedimientos:{key}"}
    
    return {"ok": False, "error": f"Procedimiento '{nombre}' no encontrado."}


def tool_consultar_tolerancias(regla: Optional[str] = None) -> Dict[str, Any]:
    """Consulta tolerancias técnicas."""
    kb = get_structured_kb()
    tolerancias = kb.get('tolerancias', {})
    
    if regla:
        if regla in tolerancias:
            return {"ok": True, "regla": regla, "valor": tolerancias[regla], "citacion": f"KB:tolerancias:{regla}"}
        return {"ok": False, "error": f"Regla '{regla}' no encontrada."}
    
    return {"ok": True, "tolerancias": tolerancias, "citacion": "KB:tolerancias"}


KNOWLEDGE_TOOL_EXECUTORS = {
    "consultar_ficha_tecnica": tool_consultar_ficha_tecnica,
    "consultar_bobinas_disponibles": tool_consultar_bobinas_disponibles,
    "consultar_precio_material": tool_consultar_precio_material,
    "buscar_en_manuales": tool_buscar_en_manuales,
    "consultar_procedimiento": tool_consultar_procedimiento,
    "consultar_tolerancias": tool_consultar_tolerancias
}


def execute_knowledge_tool(name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    """Despacha una llamada a tool de conocimiento."""
    fn = KNOWLEDGE_TOOL_EXECUTORS.get(name)
    if not fn:
        return {"ok": False, "error": f"Herramienta de conocimiento desconocida: {name}"}
    try:
        return fn(**args)
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ================================================================
# FORMATTER PARA RESULTADOS DE TOOLS DE CONOCIMIENTO
# ================================================================

def format_knowledge_tool_result(name: str, result: Dict[str, Any]) -> str:
    """Formatea resultado de tool de conocimiento para respuesta al usuario."""
    if not result.get('ok'):
        return f"⚠️ {result.get('error', 'Error en la consulta.')}"
    
    citacion = result.get('citacion', '')
    
    if name == 'consultar_ficha_tecnica':
        f = result['ficha']
        lines = [
            f"📋 **Ficha Técnica: {f.get('codigo')} — {f.get('descripcion')}**",
            f"• Tipo: {f.get('tipo')} | Cobro: {f.get('tipoCobro')} | Unidad: {f.get('unidad')}",
            f"• Anchos disponibles: {', '.join(f'{a}m' for a in f.get('anchos_disponibles', [])) or '—'}",
            f"• Stock: {f.get('stock_actual')} {f.get('unidad')} (mín: {f.get('stock_minimo')})",
        ]
        if f.get('botellas_cerradas') or f.get('botellas_ml'):
            lines.append(f"• Botellas: {f.get('botellas_cerradas', 0)} cerradas ({f.get('botellas_ml', 0)} ml)")
        if f.get('precio_m2'):
            lines.append(f"• Precio base: ${f.get('precio_m2'):,.2f}/m²")
        if f.get('precios_especiales'):
            lines.append(f"• Precios especiales: {len(f['precios_especiales'])} cliente(s)")
        if citacion:
            lines.append(f"📎 Fuente: `{citacion}`")
        return '\n'.join(lines)
    
    if name == 'consultar_bobinas_disponibles':
        bobinas = result.get('bobinas', [])
        if not bobinas:
            return result.get('nota', 'Sin bobinas.')
        lines = ["📦 **Bobinas Disponibles:**"]
        for b in bobinas:
            mats = ', '.join(b['materiales_compatibles'][:5])
            if len(b['materiales_compatibles']) > 5:
                mats += f" (+{len(b['materiales_compatibles']) - 5} más)"
            precios = ', '.join(f"{k}: ${v:,.0f}/m²" for k, v in b.get('precios_referencia_m2', {}).items())
            lines.append(f"• **{b['ancho_m']}m**: {mats} | Ref: {precios or '—'}")
        if citacion:
            lines.append(f"📎 Fuente: `{citacion}`")
        return '\n'.join(lines)
    
    if name == 'consultar_precio_material':
        lines = [
            f"💰 **Precio: {result.get('material')}**",
            f"• Base: ${result.get('precio_base_m2', 0):,.2f}/m²"
        ]
        if 'precio_especial_m2' in result:
            lines.append(f"• Especial (cliente): ${result['precio_especial_m2']:,.2f}/m²")
        if citacion:
            lines.append(f"📎 Fuente: `{citacion}`")
        return '\n'.join(lines)
    
    if name == 'buscar_en_manuales':
        resultados = result.get('resultados', [])
        if not resultados:
            return result.get('nota', 'Sin resultados.')
        lines = [f"📚 **Resultados en Manuales ({len(resultados)}):**"]
        for i, r in enumerate(resultados, 1):
            snippet = r['content'][:200].replace('\n', ' ') + ('...' if len(r['content']) > 200 else '')
            lines.append(f"{i}. **{r['source_name']}** (chunk {r['chunk_index']}, score: {r['score']:.2f})")
            lines.append(f"   {snippet}")
        if citacion:
            lines.append(f"📎 Fuentes: `{citacion}`")
        return '\n'.join(lines)
    
    if name == 'consultar_procedimiento':
        proc = result.get('procedimiento', {})
        lines = [f"📋 **Procedimiento: {result.get('nombre', '—')}**"]
        if isinstance(proc, dict):
            for k, v in proc.items():
                lines.append(f"• {k}: {v}")
        else:
            lines.append(str(proc))
        if citacion:
            lines.append(f"📎 Fuente: `{citacion}`")
        return '\n'.join(lines)
    
    if name == 'consultar_tolerancias':
        if 'regla' in result:
            return f"⚙️ **Tolerancia: {result['regla']}** = {result['valor']}\n📎 Fuente: `{citacion}`"
        lines = ["⚙️ **Tolerancias del Sistema:**"]
        for k, v in result.get('tolerancias', {}).items():
            lines.append(f"• {k}: {v}")
        if citacion:
            lines.append(f"📎 Fuente: `{citacion}`")
        return '\n'.join(lines)
    
    return "✅ Consulta completada."