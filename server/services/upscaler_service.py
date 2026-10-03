"""
Servicio de Super-Resolución e Inteligencia Artificial para LuXius (Real-ESRGAN)
Escalado de imágenes para gigantografía y preimpresión en taller.
Soporta:
1. Real-ESRGAN Vulkan GPU (vía binario standalone C++ ncnn)
   - 'realesrgan-x4plus' (Fotografías y cartelería fotorrealista)
   - 'realesrgan-x4plus-anime' (Logos vectoriales rasterizados, isotipos, calcos y tipografías nítidas)
2. Motor de Contingencia / Cloud: PIL Lanczos-3 de alta precisión + Unsharp Masking adaptativo.
"""

import os
import sys
import io
import time
import subprocess
import tempfile
from typing import Dict, Any, Optional, Tuple
from PIL import Image, ImageFilter, ImageEnhance

# Rutas del motor Real-ESRGAN
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TOOLS_DIR = os.path.join(BASE_DIR, 'tools', 'realesrgan')
EXE_PATH = os.path.join(TOOLS_DIR, 'realesrgan-ncnn-vulkan.exe')

SUPPORTED_MODELS = {
    'realesrgan-x4plus': 'Fotografías generales, cartelería y retratos fotorrealistas',
    'realesrgan-x4plus-anime': 'Logos vectoriales rasterizados, isotipos, calcos y tipografías',
    'realesr-animevideov3-x4': 'Ultra rápido x4 para ilustraciones digitales'
}


def is_vulkan_available() -> bool:
    """Verifica si el ejecutable de Real-ESRGAN Vulkan está instalado y listo."""
    return os.path.exists(EXE_PATH) and os.path.isfile(EXE_PATH)


def get_engine_status() -> Dict[str, Any]:
    """Retorna el estado de disponibilidad del motor de Super-Resolución."""
    vulkan_ok = is_vulkan_available()
    models_dir = os.path.join(TOOLS_DIR, 'models')
    has_models = os.path.exists(models_dir) and len(os.listdir(models_dir)) > 0 if os.path.exists(models_dir) else False

    return {
        'vulkan_available': vulkan_ok and has_models,
        'engine_name': 'Real-ESRGAN Vulkan (GPU Accel)' if (vulkan_ok and has_models) else 'PIL Lanczos-3 HD Adaptive (Cloud CPU)',
        'supported_models': SUPPORTED_MODELS,
        'default_model': 'realesrgan-x4plus',
        'tools_path': TOOLS_DIR
    }


def calculate_dpi(width_px: int, width_m: float) -> float:
    """Calcula la resolución real en DPI dado el ancho en píxeles y ancho en metros."""
    if width_m <= 0:
        return 72.0
    inches = width_m * 39.37007874
    return round(width_px / inches, 1)


def upscale_image(
    image_bytes: bytes,
    scale: int = 4,
    model_name: str = 'realesrgan-x4plus',
    tile_size: int = 256
) -> Dict[str, Any]:
    """
    Escala una imagen mediante Real-ESRGAN (o fallback Lanczos-3 de alta precisión).
    
    Args:
        image_bytes: Contenido binario de la imagen original.
        scale: Factor de ampliación (2 o 4).
        model_name: 'realesrgan-x4plus' o 'realesrgan-x4plus-anime'.
        tile_size: Tamaño de mosaico para evitar desbordes de memoria VRAM (default: 256).
    
    Returns:
        Dict con { ok, image_bytes, format, original_dims, upscaled_dims, scale, engine, elapsed_ms }
    """
    t_start = time.perf_counter()
    
    # 1. Inspeccionar imagen de entrada con PIL
    try:
        orig_img = Image.open(io.BytesIO(image_bytes))
        orig_w, orig_h = orig_img.size
        img_format = (orig_img.format or 'PNG').upper()
    except Exception as e:
        return {
            'ok': False,
            'error': f"Formato de imagen inválido o corrupto: {str(e)}"
        }

    # Validar modelo
    if model_name not in SUPPORTED_MODELS:
        model_name = 'realesrgan-x4plus'
    if scale not in (2, 4):
        scale = 4

    # 2. Intentar ejecución con Real-ESRGAN Vulkan
    if is_vulkan_available():
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                in_path = os.path.join(tmpdir, 'input.png')
                out_path = os.path.join(tmpdir, 'output.png')

                # Guardar imagen en PNG temporal para preservar canales RGBA
                orig_img.save(in_path, format='PNG')

                cmd = [
                    EXE_PATH,
                    '-i', in_path,
                    '-o', out_path,
                    '-s', str(scale),
                    '-n', model_name,
                    '-t', str(tile_size),
                    '-m', os.path.join(TOOLS_DIR, 'models')
                ]

                # Ejecutar binario Vulkan con timeout de 90 segundos
                proc = subprocess.run(
                    cmd,
                    cwd=TOOLS_DIR,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=90
                )

                if proc.returncode == 0 and os.path.exists(out_path):
                    with open(out_path, 'rb') as f:
                        upscaled_bytes = f.read()

                    up_img = Image.open(io.BytesIO(upscaled_bytes))
                    up_w, up_h = up_img.size
                    elapsed_ms = round((time.perf_counter() - t_start) * 1000, 1)

                    return {
                        'ok': True,
                        'image_bytes': upscaled_bytes,
                        'format': 'PNG',
                        'mime_type': 'image/png',
                        'original_dims': {'width': orig_w, 'height': orig_h},
                        'upscaled_dims': {'width': up_w, 'height': up_h},
                        'scale': scale,
                        'model': model_name,
                        'engine': f'Real-ESRGAN Vulkan GPU ({model_name})',
                        'elapsed_ms': elapsed_ms
                    }
                else:
                    err_msg = proc.stderr.decode('utf-8', errors='ignore')
                    print(f"[Real-ESRGAN Vulkan Warning] Código {proc.returncode}: {err_msg}. Pasando a fallback.", file=sys.stderr)
        except Exception as e:
            print(f"[Real-ESRGAN Exception]: {e}. Activando fallback PIL.", file=sys.stderr)

    # 3. Fallback inteligente: PIL Lanczos-3 + Filtro de Convolución Unsharp Masking
    try:
        new_w, new_h = orig_w * scale, orig_h * scale
        
        # Modo RGBA o RGB
        if orig_img.mode not in ('RGB', 'RGBA'):
            orig_img = orig_img.convert('RGBA' if 'transparency' in orig_img.info else 'RGB')

        # Remuestreo Lanczos-3 (alta precisión)
        upscaled = orig_img.resize((new_w, new_h), Image.Resampling.LANCZOS)

        # Filtro de micro-enfoque adaptativo para bordes nítidos sin generar ruido
        upscaled = upscaled.filter(ImageFilter.UnsharpMask(radius=2, percent=140, threshold=3))

        # Ligero ajuste de contraste para recuperar rango dinámico perdido en compresión
        if upscaled.mode == 'RGB':
            enhancer = ImageEnhance.Contrast(upscaled)
            upscaled = enhancer.enhance(1.04)

        buf = io.BytesIO()
        upscaled.save(buf, format='PNG', optimize=True)
        buf.seek(0)
        upscaled_bytes = buf.getvalue()
        elapsed_ms = round((time.perf_counter() - t_start) * 1000, 1)

        return {
            'ok': True,
            'image_bytes': upscaled_bytes,
            'format': 'PNG',
            'mime_type': 'image/png',
            'original_dims': {'width': orig_w, 'height': orig_h},
            'upscaled_dims': {'width': new_w, 'height': new_h},
            'scale': scale,
            'model': 'lanczos-adaptive',
            'engine': 'PIL Lanczos-3 HD Adaptive (CPU Cloud)',
            'elapsed_ms': elapsed_ms
        }
    except Exception as e:
        return {
            'ok': False,
            'error': f"Error en procesamiento de super-resolución: {str(e)}"
        }
