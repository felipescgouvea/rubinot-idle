"""
Fase 2 — MONSTROS. Substitui assets/sprites/monsters/<Nome>.webp pelo outfit REAL
do cliente Tibia 15.x (via looktype do Crystal Server), animação de caminhada
virada pra SUL (o monstro encara o jogador embaixo). Mantém o atual onde não
casa, onde é lookTypeEx (parece item) ou onde o outfit usa layers=2 (precisa de
tint de cor — tratado numa fase seguinte).

Uso: python scripts/extract-monsters.py [--preview | --write]
"""
import os, sys, glob, re
from PIL import Image
import lib_tibia_assets as L

REPO = os.path.join(os.path.dirname(__file__), "..")
MON_DIR = os.path.join(REPO, "assets", "sprites", "monsters")
MODE = "--write" if "--write" in sys.argv else "--preview"
CANVAS = 64
FILL = 0.82
SOUTH = 2

# CS: nome-normalizado -> lookType
CS = {}
for p in glob.glob(os.path.join(REPO, "reference", "crystalserver", "data-global", "monster", "**", "*.lua"), recursive=True):
    try: txt = open(p, encoding="latin1").read()
    except: continue
    mn = re.search(r'createMonsterType\("([^"]+)"', txt)
    lt = re.search(r'lookType\s*=\s*(\d+)', txt)
    if mn and lt and int(lt.group(1)) > 0:
        CS[L.norm(mn.group(1))] = int(lt.group(1))
BY_LT = L.outfit_by_looktype()

def render(lt):
    """Animação de caminhada (sul) do outfit como lista de frames 64x64, + durs.
    Retorna (frames, durs) ou None se não for layers=1 renderizável."""
    ap = L.appearance(BY_LT[lt])
    walk = next((g for g in ap["groups"] if g["fgid"] == 1 and g["phases"]), None)
    idle = next((g for g in ap["groups"] if g["fgid"] == 0), None)
    g = walk or idle
    if not g or g["layers"] != 1 or not g["ids"]: return None
    pw = g["pw"]
    nf = max(1, len(g["phases"]))
    raw = []
    for f in range(nf):
        idx = f * pw + SOUTH
        if idx >= len(g["ids"]): idx = SOUTH if SOUTH < len(g["ids"]) else 0
        s = L.sprite(g["ids"][idx])
        if s is not None: raw.append(s)
    if not raw: return None
    # bbox união -> recorte -> escala pra ~82% do canvas -> centraliza
    boxes = [im.getbbox() for im in raw if im.getbbox()]
    if not boxes: return None
    x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
    x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
    bw, bh = x1 - x0, y1 - y0
    scale = (CANVAS * FILL) / max(bw, bh)
    frames = []
    for im in raw:
        crop = im.crop((x0, y0, x1, y1))
        nw, nh = max(1, round(bw * scale)), max(1, round(bh * scale))
        crop = crop.resize((nw, nh), Image.NEAREST)
        canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
        canvas.paste(crop, ((CANVAS - nw) // 2, (CANVAS - nh) // 2), crop)
        frames.append(canvas)
    durs = [g["phases"][f] if f < len(g["phases"]) else 100 for f in range(len(frames))]
    return frames, durs

files = sorted(f for f in os.listdir(MON_DIR) if f.endswith(".webp"))
tasks = []
for f in files:
    lt = CS.get(L.norm(f[:-5]))
    if lt and lt in BY_LT:
        tasks.append((f, lt))
print(f"monstros: {len(files)} | casam looktype: {len(tasks)}")

if MODE == "--preview":
    sample = tasks[::max(1, len(tasks)//40)][:40]
    cell = 68; cols = 8; rows = (len(sample)+cols-1)//cols
    sheet = Image.new("RGBA", (cell*cols*2+4, cell*rows+4), (28,28,36,255))
    n_render = 0
    for i,(f,lt) in enumerate(sample):
        cx=(i%cols)*cell*2+2; cy=(i//cols)*cell+2
        cur = Image.open(os.path.join(MON_DIR,f)).convert("RGBA"); cur.thumbnail((cell-4,cell-4)); sheet.paste(cur,(cx,cy),cur)
        r = render(lt)
        if r: sheet.paste(r[0][0],(cx+cell,cy),r[0][0]); n_render+=1
    out = os.environ.get("PREVIEW_OUT", os.path.join(os.path.dirname(__file__),"mon_preview.png"))
    sheet.save(out)
    print(f"preview (esq=atual, dir=cliente): {out}  | renderizados no sample: {n_render}/{len(sample)}")
else:
    ok=skip=0
    for f,lt in tasks:
        try:
            r = render(lt)
            if not r: skip+=1; continue
            frames,durs = r
            frames[0].save(os.path.join(MON_DIR,f), save_all=True, append_images=frames[1:],
                           duration=durs, loop=0, lossless=True, disposal=2)
            ok+=1
        except Exception:
            skip+=1
    print(f"gravados: {ok} | pulados (layers=2/sem outfit/erro, mantêm atual): {skip}")
