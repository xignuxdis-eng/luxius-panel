import os
import hashlib
import zipfile
import logging
import struct
from io import BytesIO
from PIL import Image

logger = logging.getLogger(__name__)

class PreviewService:
    def __init__(self, uploads_dir, previews_dir):
        self.uploads_dir = uploads_dir
        self.previews_dir = previews_dir
        os.makedirs(self.previews_dir, exist_ok=True)

    def _get_file_hash(self, file_path):
        """Generates a SHA-256 hash of the file content."""
        hasher = hashlib.sha256()
        try:
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hasher.update(chunk)
            return hasher.hexdigest()
        except Exception as e:
            logger.error(f"Error hashing file {file_path}: {e}")
            return None

    def get_preview(self, original_filename):
        """
        Main entry point to get a preview for a given uploaded file.
        Returns the filename of the generated preview (e.g. 'hash.webp')
        or None if it cannot be generated.
        """
        file_path = os.path.join(self.uploads_dir, original_filename)
        if not os.path.exists(file_path):
            return None

        # 1. Generate identity hash based on file content
        file_hash = self._get_file_hash(file_path)
        if not file_hash:
            return None

        preview_filename = f"{file_hash}.webp"
        preview_path = os.path.join(self.previews_dir, preview_filename)

        # 2. Check cache
        if os.path.exists(preview_path):
            return preview_filename

        # 3. Generate preview if not in cache
        ext = os.path.splitext(original_filename)[1].lower()
        success = False

        if ext in ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif', '.bmp']:
            success = self._generate_bitmap_preview(file_path, preview_path)
        elif ext == '.cdr':
            success = self._generate_cdr_preview(file_path, preview_path)
        elif ext in ['.pdf', '.ai']:
            success = self._generate_pdf_preview(file_path, preview_path)
        elif ext == '.eps':
            success = self._generate_eps_preview(file_path, preview_path)
        elif ext == '.svg':
            success = self._generate_svg_preview(file_path, preview_path)

        return preview_filename if success else None

    def _generate_bitmap_preview(self, input_path, output_path):
        """Resizes and converts a bitmap image to WebP."""
        try:
            with Image.open(input_path) as img:
                if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                    pass
                elif img.mode != 'RGB':
                    img = img.convert('RGB')
                
                img.thumbnail((600, 600), Image.Resampling.LANCZOS)
                img.save(output_path, 'WEBP', quality=85)
            return True
        except Exception as e:
            logger.error(f"Error generating bitmap preview for {input_path}: {e}")
            return False

    def _generate_cdr_preview(self, input_path, output_path):
        """Extracts the embedded thumbnail from a CorelDRAW (.cdr) ZIP structure."""
        try:
            if not zipfile.is_zipfile(input_path):
                logger.warning(f"{input_path} is not a valid ZIP-based CDR.")
                return False

            with zipfile.ZipFile(input_path, 'r') as zf:
                possible_paths = [
                    'previews/thumbnail.png',
                    'previews/thumbnail.bmp',
                    'metadata/thumbnails/thumbnail.png',
                    'metadata/thumbnails/thumbnail.bmp',
                    'color/preview.bmp',
                    'preview.png',
                    'preview.bmp'
                ]
                
                thumbnail_data = None
                for path in possible_paths:
                    try:
                        thumbnail_data = zf.read(path)
                        break
                    except KeyError:
                        continue
                
                if not thumbnail_data:
                    # Search any thumbnail file in zip
                    for name in zf.namelist():
                        if 'thumbnail' in name.lower() or 'preview' in name.lower():
                            if name.lower().endswith(('.png', '.bmp', '.jpg', '.jpeg')):
                                try:
                                    thumbnail_data = zf.read(name)
                                    break
                                except Exception:
                                    continue

                if thumbnail_data:
                    with Image.open(BytesIO(thumbnail_data)) as img:
                        if img.mode != 'RGB' and img.mode != 'RGBA':
                            img = img.convert('RGB')
                        img.thumbnail((600, 600), Image.Resampling.LANCZOS)
                        img.save(output_path, 'WEBP', quality=85)
                    return True
                else:
                    logger.warning(f"No embedded thumbnail found in CDR: {input_path}")
                    return False
        except Exception as e:
            logger.error(f"Error extracting CDR thumbnail for {input_path}: {e}")
            return False

    def _generate_pdf_preview(self, input_path, output_path):
        """Renders page 1 of a PDF (or PDF-compatible .AI) to WebP."""
        try:
            import pypdfium2 as pdfium
            pdf = pdfium.PdfDocument(input_path)
            if len(pdf) > 0:
                page = pdf[0]
                image = page.render(scale=2).to_pil()
                if image.mode != 'RGB':
                    image = image.convert('RGB')
                image.thumbnail((600, 600), Image.Resampling.LANCZOS)
                image.save(output_path, 'WEBP', quality=85)
                return True
        except ImportError:
            logger.info("pypdfium2 not installed, attempting fallback for PDF/AI")
        except Exception as e:
            logger.warning(f"pypdfium2 failed for {input_path}: {e}")

        # Fallback: check if Pillow can open it (e.g. some EPS/PDF setups)
        try:
            with Image.open(input_path) as img:
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                img.thumbnail((600, 600), Image.Resampling.LANCZOS)
                img.save(output_path, 'WEBP', quality=85)
                return True
        except Exception as e:
            logger.debug(f"Pillow fallback failed for PDF/AI {input_path}: {e}")

        return False

    def _generate_eps_preview(self, input_path, output_path):
        """Extracts TIFF thumbnail from binary EPS header or renders via Pillow."""
        try:
            # 1. Check for standard DOS EPS binary header (0xC5D0D3C6)
            with open(input_path, 'rb') as f:
                header = f.read(30)
                if len(header) >= 30 and header[0:4] == b'\xC5\xD0\xD3\xC6':
                    # Little endian TIFF offset and length
                    tiff_offset = struct.unpack('<I', header[20:24])[0]
                    tiff_length = struct.unpack('<I', header[24:28])[0]
                    if tiff_offset > 0 and tiff_length > 0:
                        f.seek(tiff_offset)
                        tiff_data = f.read(tiff_length)
                        with Image.open(BytesIO(tiff_data)) as img:
                            if img.mode != 'RGB':
                                img = img.convert('RGB')
                            img.thumbnail((600, 600), Image.Resampling.LANCZOS)
                            img.save(output_path, 'WEBP', quality=85)
                        return True
        except Exception as e:
            logger.warning(f"Error extracting binary EPS thumbnail for {input_path}: {e}")

        # Fallback: attempt Pillow open
        try:
            with Image.open(input_path) as img:
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                img.thumbnail((600, 600), Image.Resampling.LANCZOS)
                img.save(output_path, 'WEBP', quality=85)
                return True
        except Exception as e:
            logger.debug(f"Pillow EPS fallback failed: {e}")

        return False

    def _generate_svg_preview(self, input_path, output_path):
        """Generates a raster WebP preview of an SVG file."""
        try:
            with Image.open(input_path) as img:
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                img.thumbnail((600, 600), Image.Resampling.LANCZOS)
                img.save(output_path, 'WEBP', quality=85)
            return True
        except Exception:
            return False
