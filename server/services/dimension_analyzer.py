"""
Servicio de Analisis Tecnico de Dimensiones, Metadatos y Motor Heuristico 3D de Escalas
LuXius System - XignuX
"""

import os
import re
import sys
import time
import math
import hashlib
import mimetypes
from PIL import Image

try:
    import pypdfium2 as pdfium
except ImportError:
    pdfium = None


# Allow massive image files without DecompressionBombError for wide format printing
Image.MAX_IMAGE_PIXELS = None

LARGE_FORMAT_KEYWORDS = {
    'lona', 'front', 'back', 'vehicular', 'vv', 'cartel', 'gigantografia',
    'micro', 'microperforado', 'mesh', 'blackout', 'banner', 'vial', 'frontlight',
    'backlight', 'bastidor', 'marquesina', 'vidriera_grande', 'plotter'
}

SMALL_FORMAT_KEYWORDS = {
    'calco', 'calcos', 'sticker', 'stickers', 'etiqueta', 'etiquetas',
    'fotografico', 'foto', 'iman_chico', 'tarjeta', 'folleto', 'credencial'
}

STANDARD_ROLL_WIDTHS = [1.00, 1.05, 1.27, 1.37, 1.52, 1.60, 1.80, 2.20, 2.50, 3.20]

def compute_sha256(filepath: str) -> str:
    """Calcula el hash SHA-256 de un archivo en disco."""
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def detect_scale_in_text(text: str) -> int:
    """Busca patrones de escala comunes en texto o nombres de archivo."""
    if not text:
        return 1
    t = text.lower()
    
    if re.search(r'\b(escala\s*1[.:/]?10|esc\s*1[.:/]?10|1[.:/]?10|10%|al\s*10%)\b', t):
        return 10
    if re.search(r'\b(escala\s*1[.:/]?20|esc\s*1[.:/]?20|1[.:/]?20|20%|al\s*20%)\b', t):
        return 20
    if re.search(r'\b(escala\s*1[.:/]?5|esc\s*1[.:/]?5|1[.:/]?5|5%)\b', t):
        return 5
        
    return 1

def analyze_file_dimensions(file_path: str, material_code: str = "VV", custom_filename: str = ""):
    """
    Analiza un archivo gráfico (PDF, JPG, PNG, TIF, etc.), extrae dimensiones en cm, DPI,
    modo de color, genera thumbnail y aplica la Heurística Tridimensional de Escala.
    """
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"Archivo no encontrado: {file_path}")

    filename = custom_filename or os.path.basename(file_path)
    ext = os.path.splitext(filename)[1].lower()
    file_size = os.path.getsize(file_path)
    sha256_hash = compute_sha256(file_path)

    width_cm = 0.0
    height_cm = 0.0
    dpi = 72
    color_mode = "RGB"
    detected_format = ext.replace('.', '').upper()
    extracted_text = ""
    thumbnail_data_url = None

    # 1. Analisis para archivos PDF
    if ext == '.pdf':
        try:
            pdf = pdfium.PdfDocument(file_path)
            page_count = len(pdf)
            if page_count > 0:
                page = pdf[0]
                pt_w, pt_h = page.get_size()
                # 72 points = 1 inch = 2.54 cm
                width_cm = round((pt_w / 72.0) * 2.54, 2)
                height_cm = round((pt_h / 72.0) * 2.54, 2)
                dpi = 72
                
                # Extraer texto de la primera pagina para buscar menciones de escala
                try:
                    text_page = page.get_textpage()
                    extracted_text = text_page.get_text_range() or ""
                except Exception:
                    extracted_text = ""

                # Generar thumbnail renderizado a 150 DPI
                try:
                    bitmap = page.render(scale=1.5)
                    pil_img = bitmap.to_pil()
                    pil_img.thumbnail((400, 400))
                    
                    from app import UPLOADS_DIR
                    thumb_name = f"thumb_{int(os.path.getmtime(file_path))}_{os.path.splitext(os.path.basename(file_path))[0]}.jpg"
                    thumb_path = os.path.join(UPLOADS_DIR, thumb_name)
                    pil_img.save(thumb_path, "JPEG", quality=85)
                    
                    # Subir thumbnail a R2
                    try:
                        from services.r2_storage import r2_storage
                        r2_storage.upload_file(thumb_path, f"thumbnails/{thumb_name}", content_type="image/jpeg")
                    except Exception:
                        pass
                        
                    thumbnail_data_url = f"/uploads/{thumb_name}"
                except Exception as thumb_err:
                    print(f"[PDF Thumbnail] Error: {thumb_err}", file=sys.stderr)
        except Exception as pdf_e:
            print(f"[PDF Parse Error] {pdf_e}", file=sys.stderr)

    # 2. Analisis para archivos de Imagen Raster (JPG, PNG, TIF, BMP, PSD, etc.)
    else:
        try:
            with Image.open(file_path) as img:
                detected_format = (img.format or ext.replace('.', '')).upper()
                px_w, px_h = img.size
                
                # DPI Extraction
                info_dpi = img.info.get('dpi')
                if info_dpi and isinstance(info_dpi, (tuple, list)) and len(info_dpi) >= 2:
                    dpi = int(round(info_dpi[0])) or 72
                elif info_dpi and isinstance(info_dpi, (int, float)):
                    dpi = int(round(info_dpi)) or 72
                else:
                    dpi = 72

                if dpi <= 0:
                    dpi = 72

                width_cm = round((px_w / dpi) * 2.54, 2)
                height_cm = round((px_h / dpi) * 2.54, 2)
                color_mode = img.mode

                # Generar Thumbnail de bajo consumo de memoria (Draft Mode)
                try:
                    from app import UPLOADS_DIR
                    thumb_name = f"thumb_{int(time.time()*1000)}_{os.path.splitext(os.path.basename(file_path))[0]}.jpg"
                    thumb_path = os.path.join(UPLOADS_DIR, thumb_name)
                    
                    try:
                        # Intento con draft mode (decodifica directo a baja resolucion sin consumir RAM)
                        with Image.open(file_path) as thumb_img:
                            thumb_img.draft('RGB', (400, 400))
                            rgb_thumb = thumb_img.convert('RGB')
                            rgb_thumb.thumbnail((400, 400), Image.Resampling.LANCZOS if hasattr(Image, 'Resampling') else Image.ANTIALIAS)
                            rgb_thumb.save(thumb_path, "JPEG", quality=80, optimize=True)
                    except Exception:
                        # Fallback seguro
                        img.thumbnail((400, 400))
                        rgb_fallback = img.convert('RGB')
                        rgb_fallback.save(thumb_path, "JPEG", quality=80)
                    
                    try:
                        from services.r2_storage import r2_storage
                        r2_storage.upload_file(thumb_path, f"thumbnails/{thumb_name}", content_type="image/jpeg")
                    except Exception:
                        pass
                        
                    thumbnail_data_url = f"/uploads/{thumb_name}"
                except Exception as img_thumb_err:
                    print(f"[Image Thumbnail] Error: {img_thumb_err}", file=sys.stderr)
                    thumbnail_data_url = None

        except Exception as img_e:
            print(f"[Image Parse Error] {img_e}", file=sys.stderr)

    # 3. HEURISTICA TRIDIMENSIONAL DE ESCALA (DPI x Medida x Material/Uso)
    mat_lower = (material_code or "").lower()
    fn_lower = filename.lower()
    
    is_small_format = any(k in mat_lower or k in fn_lower for k in SMALL_FORMAT_KEYWORDS)
    is_large_format = any(k in mat_lower or k in fn_lower for k in LARGE_FORMAT_KEYWORDS) or not is_small_format
    
    scale_factor = 1
    scale_alert = False
    scale_reason = "Tamaño real 1:1"

    # Verificar si el texto del PDF o nombre de archivo indica escala explícita
    text_scale = detect_scale_in_text(filename)
    if text_scale == 1 and extracted_text:
        text_scale = detect_scale_in_text(extracted_text)

    if text_scale > 1:
        scale_factor = text_scale
        scale_alert = True
        scale_reason = f"Detectado en nombre o capas de texto ('Escala 1:{text_scale}')"
    elif is_large_format:
        # Cruce de Densidad: Alta resolucion (DPI >= 250) con medidas chicas (< 200 cm) en gigantografia
        max_dim = max(width_cm, height_cm)
        if dpi >= 250 and max_dim <= 200 and max_dim > 0:
            scale_factor = 10
            scale_alert = True
            scale_reason = f"Densidad alta ({dpi} DPI) para gigantografía con lienzo de {width_cm:.1f}x{height_cm:.1f} cm (Sugerida Escala 1:10)"
        elif max_dim > 0 and max_dim < 30 and dpi >= 150:
            scale_factor = 10
            scale_alert = True
            scale_reason = f"Lienzo muy reducido ({width_cm:.1f}x{height_cm:.1f} cm) en material de gran formato"

    # Medidas con escala aplicada
    final_width_cm = round(width_cm * scale_factor, 2)
    final_height_cm = round(height_cm * scale_factor, 2)

    # 4. Calculo de Bobina Optima
    min_dim_m = min(final_width_cm, final_height_cm) / 100.0
    max_dim_m = max(final_width_cm, final_height_cm) / 100.0
    
    assigned_bobina = 1.37
    best_waste = 999.0
    for roll in STANDARD_ROLL_WIDTHS:
        if roll >= min_dim_m:
            waste = roll - min_dim_m
            if waste < best_waste:
                best_waste = waste
                assigned_bobina = roll

    return {
        "fileName": filename,
        "fileSize": file_size,
        "sha256": sha256_hash,
        "raw_width_cm": width_cm,
        "raw_height_cm": height_cm,
        "final_width_cm": final_width_cm,
        "final_height_cm": final_height_cm,
        "dpi": dpi,
        "colorMode": color_mode,
        "format": detected_format,
        "thumbnailUrl": thumbnail_data_url,
        "scaleFactor": scale_factor,
        "scaleAlert": scale_alert,
        "scaleReason": scale_reason,
        "assignedBobina": assigned_bobina,
        "minDimM": round(min_dim_m, 3),
        "maxDimM": round(max_dim_m, 3)
    }
