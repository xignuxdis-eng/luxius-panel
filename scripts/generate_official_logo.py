from PIL import Image
import os, io, base64

src_path = r'C:\Users\Admin\.gemini\antigravity-ide\brain\53098386-965f-49d7-a694-18bbe20d227a\.user_uploaded\media_1790206044541.png'
im = Image.open(src_path)

# Target width 260px (height ~278px) -> ultra sharp for 60-120px display, preserves all splash details
target_w = 260
target_h = int(im.size[1] * (target_w / im.size[0]))
resized = im.resize((target_w, target_h), Image.Resampling.LANCZOS)

# Save as PNG
buf = io.BytesIO()
resized.save(buf, format='PNG', optimize=True)
png_bytes = buf.getvalue()
print(f'PNG size: {len(png_bytes)} bytes ({len(png_bytes)/1024:.1f} KB)')

# Save to public and assets
os.makedirs('public', exist_ok=True)
resized.save('public/xignux_logo.png', format='PNG', optimize=True)
print('Saved public/xignux_logo.png')

os.makedirs('src/assets', exist_ok=True)
resized.save('src/assets/logo-light.png', format='PNG', optimize=True)
resized.save('src/assets/xignux_logo.png', format='PNG', optimize=True)
print('Saved src/assets/logo-light.png and xignux_logo.png')

# Base64 string
b64_str = base64.b64encode(png_bytes).decode('utf-8')
data_url = f'data:image/png;base64,{b64_str}'

# Write src/utils/logoBase64.ts
content_ts = f'''// Logo oficial XignuX optimizado (PNG 32-bit con transparencia y alta nitidez)
// Generado automáticamente desde el logo oficial adjunto por el usuario
export const XIGNUX_LOGO_BASE64 = "{data_url}";
export const XIGNUX_LOGO_LIGHT = XIGNUX_LOGO_BASE64;
'''
with open('src/utils/logoBase64.ts', 'w', encoding='utf-8') as f:
    f.write(content_ts)
print('Wrote src/utils/logoBase64.ts')

# Write src/utils/logoBase64Light.ts
content_light_ts = f'''// Logo oficial XignuX liviano para PDFs — PNG optimizado (~{len(png_bytes)/1024:.1f}KB)
// Compatible con todos los motores de renderizado e impresión
export const XIGNUX_LOGO_LIGHT = "{data_url}";
export const XIGNUX_LOGO_BASE64 = XIGNUX_LOGO_LIGHT;
'''
with open('src/utils/logoBase64Light.ts', 'w', encoding='utf-8') as f:
    f.write(content_light_ts)
print('Wrote src/utils/logoBase64Light.ts')
