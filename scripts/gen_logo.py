import base64

with open(r'C:\Users\Admin\.gemini\antigravity-ide\brain\b3d7f359-07e7-4998-8947-f36e3897d58f\.user_uploaded\media_1786893480641.png', 'rb') as f:
    b64_str = 'data:image/png;base64,' + base64.b64encode(f.read()).decode('utf-8')

with open(r'F:\Sitio XignuX\scripts\template.ts', 'r', encoding='utf-8') as f:
    template = f.read()

final = template.replace('<LOGO_B64>', b64_str)
final = final.replace('\\`', '`').replace('$\\{', '${')

with open(r'F:\Sitio XignuX\src\utils\presupuestoPdf.ts', 'w', encoding='utf-8') as f:
    f.write(final)

with open(r'F:\XignuX Print Den\src\utils\presupuestoPdf.ts', 'w', encoding='utf-8') as f:
    f.write(final)

print('Successfully regenerated PDF with correct logo (uncompressed)!')
