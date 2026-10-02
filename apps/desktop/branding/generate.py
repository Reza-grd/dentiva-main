"""
Membuat aset branding installer dari logo Dentiva.
    python apps/desktop/branding/generate.py
Hasil di apps/desktop/src-tauri/installer/ (NSIS, WiX/MSI, DMG) dan
apps/desktop/branding/icon-source.png (sumber `npm run icon`, logo tanpa ruang kosong berlebih).
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
LOGO = ROOT / "apps/clinic/public/dentiva-logo.png"
OUT = ROOT / "apps/desktop/src-tauri/installer"
OUT.mkdir(parents=True, exist_ok=True)

NAVY = (30, 58, 95)
NAVY_DARK = (15, 32, 56)
GOLD = (196, 160, 82)
INK = (51, 65, 85)
WHITE = (255, 255, 255)
SOFT = (246, 248, 251)

FONTS = Path("C:/Windows/Fonts")
def font(bold, size):
    for name in (["segoeuib.ttf", "arialbd.ttf"] if bold else ["segoeui.ttf", "arial.ttf"]):
        p = FONTS / name
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()

logo = Image.open(LOGO).convert("RGBA")
# Buang latar putih/transparan di sekitar logo
px = logo.load()
for y in range(logo.height):
    for x in range(logo.width):
        r, g, b, a = px[x, y]
        if a > 0 and r > 235 and g > 235 and b > 235:
            px[x, y] = (255, 255, 255, 0)
logo = logo.crop(logo.getbbox())

def logo_fit(size):
    l = logo.copy()
    l.thumbnail((size, size), Image.LANCZOS)
    return l

def paste_center(img, l, cx, cy):
    img.paste(l, (int(cx - l.width / 2), int(cy - l.height / 2)), l)

# Sumber ikon aplikasi: ubin ikon resmi (app-icon-original.jpg) tanpa latar putih & bayangan.
# Ubin berupa persegi membulat: kiri 126, kanan 1123, atas 87, bawah 1127, radius ±230 px.
ORIG = ROOT / "apps/desktop/branding/app-icon-original.jpg"
if ORIG.exists():
    src = Image.open(ORIG).convert("RGBA")
    # inset 6 px: buang garis tepi terang bawaan gambar asli (terlihat di latar gelap)
    L, T, R, B, RAD = 127 + 6, 88 + 6, 1123 - 6, 1126 - 6, 224
    SS = 4  # supersampling untuk tepi halus
    mask = Image.new("L", (src.width * SS, src.height * SS), 0)
    ImageDraw.Draw(mask).rounded_rectangle([L * SS, T * SS, R * SS, B * SS], radius=RAD * SS, fill=255)
    mask = mask.resize(src.size, Image.LANCZOS)
    src.putalpha(mask)
    tile = src.crop((L, T, R + 1, B + 1))
    side = int(max(tile.size) * 1.04)  # sedikit ruang agar tidak terpotong di ikon kecil
    icon = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    icon.paste(tile, ((side - tile.width) // 2, (side - tile.height) // 2), tile)
else:
    side = int(max(logo.size) * 1.16)
    icon = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    paste_center(icon, logo, side / 2, side / 2)
icon.resize((1024, 1024), Image.LANCZOS).save(ROOT / "apps/desktop/branding/icon-source.png")

def text_center(d, cx, y, s, f, fill):
    w = d.textlength(s, font=f)
    d.text((cx - w / 2, y), s, font=f, fill=fill)

# NSIS: gambar samping halaman sambutan/selesai (164x314)
side_img = Image.new("RGB", (164, 314), WHITE)
d = ImageDraw.Draw(side_img)
for y in range(314):  # gradasi lembut di bawah
    t = y / 313
    c = tuple(int(WHITE[i] * (1 - t) + SOFT[i] * t) for i in range(3))
    d.line([(0, y), (163, y)], fill=c)
paste_center(side_img, logo_fit(104), 82, 112)
text_center(d, 82, 182, "Dentiva", font(True, 24), NAVY)
d.line([(57, 218), (107, 218)], fill=GOLD, width=2)
text_center(d, 82, 228, "Klinik Gigi Digital", font(False, 12), INK)
d.rectangle([0, 304, 163, 313], fill=NAVY)
side_img.save(OUT / "nsis-sidebar.bmp")

# NSIS: header kanan atas (150x57)
head = Image.new("RGB", (150, 57), WHITE)
d = ImageDraw.Draw(head)
paste_center(head, logo_fit(40), 30, 28)
d.text((56, 14), "Dentiva", font=font(True, 20), fill=NAVY)
head.save(OUT / "nsis-header.bmp")

# WiX/MSI: banner atas (493x58) — teks dialog WiX di kiri, logo di kanan
banner = Image.new("RGB", (493, 58), WHITE)
d = ImageDraw.Draw(banner)
paste_center(banner, logo_fit(42), 462, 29)
d.line([(0, 57), (492, 57)], fill=GOLD, width=1)
banner.save(OUT / "wix-banner.bmp")

# WiX/MSI: gambar dialog sambutan (493x312) — 164 px kiri bergambar, sisanya putih untuk teks
dialog = Image.new("RGB", (493, 312), WHITE)
d = ImageDraw.Draw(dialog)
d.rectangle([0, 0, 163, 311], fill=SOFT)
paste_center(dialog, logo_fit(100), 82, 115)
text_center(d, 82, 180, "Dentiva", font(True, 24), NAVY)
d.line([(57, 216), (107, 216)], fill=GOLD, width=2)
d.rectangle([0, 302, 163, 311], fill=NAVY)
dialog.save(OUT / "wix-dialog.bmp")

# DMG macOS: latar jendela (660x400), app di x=180, Applications di x=480 (y=200)
dmg = Image.new("RGB", (660, 400), WHITE)
d = ImageDraw.Draw(dmg)
for y in range(400):
    t = y / 399
    c = tuple(int(WHITE[i] * (1 - t) + SOFT[i] * t) for i in range(3))
    d.line([(0, y), (659, y)], fill=c)
paste_center(dmg, logo_fit(44), 236, 52)
d.text((266, 34), "Dentiva", font=font(True, 28), fill=NAVY)
text_center(d, 330, 300, "Seret Dentiva ke folder Applications untuk memasang", font(False, 15), INK)
# panah
d.line([(262, 200), (392, 200)], fill=GOLD, width=4)
d.polygon([(392, 188), (412, 200), (392, 212)], fill=GOLD)
d.rectangle([0, 390, 659, 399], fill=NAVY)
dmg.save(OUT / "dmg-background.png")
print("ok", sorted(p.name for p in OUT.iterdir()))
