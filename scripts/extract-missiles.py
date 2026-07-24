"""
Fase 3 — MISSILES. Substitui assets/sprites/missiles/<nome>.webp pelo projétil
REAL do cliente Tibia 15.x. Mapa nome->id CONST_ANI (ShootType_t do Crystal
Server). Extrai o sprite apontando pro NORTE (o jogo rotaciona a partir daí).
Uso: python scripts/extract-missiles.py [--preview | --write]
"""
import os, sys
from PIL import Image
import lib_tibia_assets as L

REPO = os.path.join(os.path.dirname(__file__), "..")
MIS_DIR = os.path.join(REPO, "assets", "sprites", "missiles")
MODE = "--write" if "--write" in sys.argv else "--preview"
NORTH = 1  # 3x3: y=0,x=1

# nome do nosso arquivo -> id CONST_ANI (ShootType_t, utils_definitions.hpp)
M = {
  'spear':1,'bolt':2,'arrow':3,'fire':4,'energy':5,'poison_arrow':6,'burst_arrow':7,
  'death':32,'power_bolt':14,'infernal_bolt':16,'onyx_arrow':23,'piercing_bolt':24,
  'ice':29,'earth':30,'holy':31,'flash_arrow':33,'flaming_arrow':34,'shiver_arrow':35,
  'earth_arrow':40,'tarsal_arrow':44,'vortex_bolt':45,'prismatic_bolt':48,
  'crystalline_arrow':49,'drill_bolt':50,'envenomed_arrow':51,'simple_arrow':54,
  'diamond_arrow':57,'spectral_bolt':58,'sniper_arrow':22,'shatterstorm_arrow':64,
  'firestorm_arrow':65,'terrastorm_arrow':66,'froststorm_arrow':67,'thunderstorm_arrow':68,
}
BYID = {L.parse(raw).get(1, [(0, 0)])[0][1]: raw for _, raw in L.MISSILES}

def north_sprite(mid):
    if mid not in BYID: return None
    ap = L.appearance(BYID[mid]); g = ap["groups"][0]
    if NORTH >= len(g["ids"]): return None
    s = L.sprite(g["ids"][NORTH])
    return L.trim(s) if s else None

files = sorted(f for f in os.listdir(MIS_DIR) if f.endswith(".webp"))
if MODE == "--preview":
    cell = 40; cols = 6; rows = (len(files)+cols-1)//cols
    sheet = Image.new("RGBA", (cell*cols*2+4, cell*rows+4), (28,28,36,255))
    for i,f in enumerate(files):
        cx=(i%cols)*cell*2+2; cy=(i//cols)*cell+2
        cur=Image.open(os.path.join(MIS_DIR,f)).convert("RGBA"); cur.thumbnail((cell-4,cell-4)); sheet.paste(cur,(cx,cy),cur)
        mid=M.get(f[:-5])
        if mid:
            n=north_sprite(mid)
            if n: n=n.copy(); n.thumbnail((cell-4,cell-4)); sheet.paste(n,(cx+cell,cy),n)
    out=os.environ.get("PREVIEW_OUT", os.path.join(os.path.dirname(__file__),"mis_preview.png"))
    sheet.save(out); print("preview (esq=atual, dir=cliente):", out, "| itens:", len(files))
else:
    ok=skip=0
    for f in files:
        mid=M.get(f[:-5])
        n=north_sprite(mid) if mid else None
        if n is None or n.getbbox() is None: skip+=1; continue
        n.save(os.path.join(MIS_DIR,f), lossless=True); ok+=1
    print(f"gravados: {ok} | pulados (mantêm atual): {skip}")
