"""
Extração TARGETED de monstros do cliente do Tibia (tamanho NATIVO 1:1), pra
corrigir criaturas que ficaram com sprite de fonte não-cliente (Regra 2.1 do
spec). Reusa a mesma render de extract-monsters.py, mas só pros nomes passados.

Uso: python scripts/extract-monsters-targeted.py Valkyrie "Smuggler Baron Silvertoe" [--write]
     (sem --write = só gera preview scripts/targeted_preview.png; esq=atual, dir=cliente)
"""
import os, sys, glob, re
from PIL import Image
import lib_tibia_assets as L

REPO = os.path.join(os.path.dirname(__file__), "..")
MON_DIR = os.path.join(REPO, "assets", "sprites", "monsters")
WRITE = "--write" in sys.argv
names = [a for a in sys.argv[1:] if not a.startswith("--")]
CANVAS = 64
SOUTH = 2

CS = {}
for p in glob.glob(os.path.join(REPO, "reference", "crystalserver", "data-global", "monster", "**", "*.lua"), recursive=True):
    try: txt = open(p, encoding="latin1").read()
    except: continue
    mn = re.search(r'createMonsterType\("([^"]+)"', txt)
    lt = re.search(r'lookType\s*=\s*(\d+)', txt)
    if mn and lt and int(lt.group(1)) > 0:
        def gi(k):
            m = re.search(k + r'\s*=\s*(\d+)', txt); return int(m.group(1)) if m else 0
        CS[L.norm(mn.group(1))] = (int(lt.group(1)), (gi("lookHead"), gi("lookBody"), gi("lookLegs"), gi("lookFeet")))
BY_LT = L.outfit_by_looktype()

def render(lt, colors):
    ap = L.appearance(BY_LT[lt])
    walk = next((g for g in ap["groups"] if g["fgid"] == 1 and g["phases"]), None)
    idle = next((g for g in ap["groups"] if g["fgid"] == 0), None)
    g = walk or idle
    if not g or g["layers"] not in (1, 2) or not g["ids"]: return None
    pw = g["pw"]; ly = g["layers"]
    nf = max(1, len(g["phases"]))
    raw = []
    for f in range(nf):
        cell = (f * pw + SOUTH) * ly
        if cell + ly - 1 >= len(g["ids"]): cell = SOUTH * ly if SOUTH * ly + ly - 1 < len(g["ids"]) else 0
        if ly == 1:
            s = L.sprite(g["ids"][cell])
        else:
            b = L.sprite(g["ids"][cell]); m = L.sprite(g["ids"][cell + 1])
            s = L.colorize(b, m, colors) if (b is not None and m is not None) else b
        if s is not None: raw.append(s)
    if not raw: return None
    boxes = [im.getbbox() for im in raw if im.getbbox()]
    if not boxes: return None
    x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
    x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
    bw, bh = x1 - x0, y1 - y0
    scale = 1.0 if max(bw, bh) <= CANVAS else CANVAS / max(bw, bh)
    frames = []
    for im in raw:
        crop = im.crop((x0, y0, x1, y1))
        if scale != 1.0:
            nw, nh = max(1, round(bw * scale)), max(1, round(bh * scale))
            crop = crop.resize((nw, nh), Image.LANCZOS)
        else:
            nw, nh = bw, bh
        canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
        canvas.paste(crop, ((CANVAS - nw) // 2, (CANVAS - nh) // 2), crop)
        frames.append(canvas)
    durs = [g["phases"][f] if f < len(g["phases"]) else 100 for f in range(len(frames))]
    return frames, durs

results = []
for name in names:
    ent = CS.get(L.norm(name))
    if not ent: print(f"  {name}: SEM lookType no Crystal — pular"); continue
    lt, colors = ent
    if lt not in BY_LT: print(f"  {name}: lookType {lt} não está no cliente — pular"); continue
    r = render(lt, colors)
    if not r: print(f"  {name}: render vazio (layers/ids) — pular"); continue
    fname = name.replace(" ", "_") + ".webp"
    results.append((name, fname, lt, r))
    print(f"  {name}: lookType {lt}, {len(r[0])} frames OK")

# preview lado a lado (esq = atual, dir = cliente)
cell = 72
sheet = Image.new("RGBA", (cell*2+4, cell*max(1,len(results))+4), (28,32,46,255))
for i,(name,fname,lt,r) in enumerate(results):
    cy = i*cell+2
    cur_p = os.path.join(MON_DIR, fname)
    if os.path.exists(cur_p):
        cur = Image.open(cur_p).convert("RGBA"); cur.thumbnail((cell-8,cell-8)); sheet.paste(cur,(2,cy),cur)
    newf = r[0][0]
    sheet.paste(newf, (cell+2, cy), newf)
sheet.save(os.path.join(os.path.dirname(__file__), "targeted_preview.png"))
print("preview: scripts/targeted_preview.png (esq=atual, dir=cliente)")

if WRITE:
    for name,fname,lt,r in results:
        frames,durs = r
        frames[0].save(os.path.join(MON_DIR, fname), save_all=True, append_images=frames[1:],
                       duration=durs, loop=0, lossless=True, disposal=2)
        print(f"  ESCRITO {fname}")
