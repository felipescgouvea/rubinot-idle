"""
Fase 1 — ITENS. Substitui assets/sprites/items/<Nome>.webp pelo sprite REAL do
cliente Tibia 15.x quando o nome casa com um objeto nomeado do cliente. O que
não casa (inventado/variação de nome) fica com o sprite atual (TibiaWiki).

Uso:
  python scripts/extract-items.py --preview   # grade cliente vs atual (não grava)
  python scripts/extract-items.py --write      # grava os que casam
"""
import os, sys, re
from PIL import Image
import lib_tibia_assets as L

REPO = os.path.join(os.path.dirname(__file__), "..")
ITEMS_DIR = os.path.join(REPO, "assets", "sprites", "items")
MODE = "--write" if "--write" in sys.argv else "--preview"

# índice nome-normalizado -> appearance-dict (menor id em repetido)
print("indexando objetos do cliente...")
NAMED = {}
for _, raw in L.OBJECTS:
    ap = L.parse(raw)
    nm = ap.get(4)
    if not nm: continue
    key = L.norm(nm[0][1].decode("latin1"))
    oid = ap.get(1, [(0, 0)])[0][1]
    if key and (key not in NAMED or oid < NAMED[key]):
        NAMED[key] = oid
BYID = {L.parse(raw).get(1, [(0, 0)])[0][1]: raw for _, raw in L.OBJECTS}
print(f"  {len(NAMED)} objetos nomeados")

def icon_for(oid):
    ap = L.appearance(BYID[oid])
    grp = next((g for g in ap["groups"] if g["fgid"] == 0), None) or (ap["groups"][0] if ap["groups"] else None)
    if not grp or not grp["ids"]: return None
    s0 = L.sprite(grp["ids"][0])
    if s0 is None: return None
    img = L.compose_layers(grp["ids"], 0, max(1, grp["layers"]), s0.size)
    return L.trim(img)

files = sorted(f for f in os.listdir(ITEMS_DIR) if f.endswith(".webp"))
tasks = []
for f in files:
    key = L.norm(f[:-5])
    if key in NAMED:
        tasks.append((f, NAMED[key]))
print(f"itens: {len(files)} | casam: {len(tasks)} ({100*len(tasks)//len(files)}%)")

# ordena por sprite id (LRU das folhas)
def first_sid(oid):
    ap = L.appearance(BYID[oid])
    for g in ap["groups"]:
        if g["ids"]: return g["ids"][0]
    return 0
tasks.sort(key=lambda t: first_sid(t[1]))

if MODE == "--preview":
    sample = tasks[::max(1, len(tasks)//48)][:48]
    cell = 40; cols = 8; rows = (len(sample)+cols-1)//cols
    sheet = Image.new("RGBA", (cell*cols*2+4, cell*rows+4), (32,32,40,255))
    for i,(f,oid) in enumerate(sample):
        cx = (i%cols)*cell*2+2; cy=(i//cols)*cell+2
        cur = Image.open(os.path.join(ITEMS_DIR,f)).convert("RGBA")
        cur.thumbnail((cell-4,cell-4)); sheet.paste(cur,(cx,cy),cur)
        new = icon_for(oid)
        if new:
            new = new.copy(); new.thumbnail((cell-4,cell-4)); sheet.paste(new,(cx+cell,cy),new)
    out = os.environ.get("PREVIEW_OUT", os.path.join(os.path.dirname(__file__), "items_preview.png"))
    sheet.save(out)
    print("preview (esq=atual, dir=cliente):", out)
else:
    ok = skip = 0
    for f, oid in tasks:
        try:
            img = icon_for(oid)
            if img is None or img.getbbox() is None: skip += 1; continue
            img.save(os.path.join(ITEMS_DIR, f), lossless=True)
            ok += 1
        except Exception as e:
            skip += 1
    print(f"gravados: {ok} | pulados: {skip}")
