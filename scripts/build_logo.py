import base64, shutil

src_img = r"C:\Users\Admin\.gemini\antigravity-ide\brain\2de0e73f-3be0-4db0-8d41-48163e95768f\media__1785104295291.png"
dst_img = r"f:\XignuX Print Den\public\xignux_logo.png"

shutil.copy(src_img, dst_img)

with open(dst_img, "rb") as f:
    b64 = base64.b64encode(f.read()).decode("utf-8")

with open(r"f:\XignuX Print Den\src\utils\logoBase64.ts", "w") as f:
    f.write(f'export const XIGNUX_LOGO_BASE64 = "data:image/png;base64,{b64}";\n')

print("Successfully generated logoBase64.ts!")
