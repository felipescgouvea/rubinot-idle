"""Gerador procedural de caverna estilo Tibia (marrom).
- Rocha = massa CONECTADA (ruido multi-oitava + automato celular), passagem serpenteia.
- Parede = Dirt Wall (rocha marrom real do Tibia).
- Chao = MISTURA de varios pisos marrons em manchas (nao repete: o chao muda enquanto anda).
- Sombra de contato (AO) na base da rocha + pedras/entulho espalhados.
- Alto (1024) e periodico em Y => rola sem emenda e demora a repetir.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
import random

SP = "C:/Users/Felipe/AppData/Local/Temp/claude/c--workspace-rubinot-idle/2bf6b911-58f2-43c8-8823-2fc423f2156d/scratchpad/"
OUT = "C:/workspace/rubinot-idle/assets/sprites/ui/scenes/"

# ---- configuravel por bioma ----
NAME       = sys.argv[1] if len(sys.argv) > 1 else "cave"
WALL_TILE  = sys.argv[2] if len(sys.argv) > 2 else "b_DirtWall.gif"
FLOOR_MIX  = (sys.argv[3].split(",") if len(sys.argv) > 3
              else ["cf_floor.gif", "b_Dirt__Heavy_.gif", "b_DirtMed.gif", "b_Muddy_Floor__Dark_.gif"])
SEED       = int(sys.argv[4]) if len(sys.argv) > 4 else 23

W, H = 560, 1024
rng = np.random.default_rng(SEED)
random.seed(SEED)

def coarse(gw, gh):
    """ruido bilinear grosseiro, periodico em Y"""
    g = rng.random((gh, gw))
    g[-1] = g[0]
    im = Image.fromarray((g * 255).astype("uint8")).resize((W, H), Image.BICUBIC)
    return np.asarray(im, float) / 255

# ---------- campo de ruido ----------
field = np.zeros((H, W)); amp = 0.0
for gw, gh, a in [(5, 9, 1.0), (9, 17, 0.55), (17, 33, 0.28), (33, 65, 0.14)]:
    field += coarse(gw, gh) * a; amp += a
field /= amp

# ---------- forma: passagem serpenteia, largura varia ----------
ys = np.arange(H)[:, None]
center = 0.5 + np.sin(2*np.pi*ys/H)*0.045 + np.sin(6*np.pi*ys/H + 1.1)*0.03
xs = np.linspace(0, 1, W)[None, :]
dist = np.abs(xs - center) / 0.5
halfw = 0.46 + 0.17 * (field - 0.5)
rock = (dist - halfw) + (field - 0.5) * 0.55 > 0.0
rock[:, :int(W*0.02)] = True; rock[:, -int(W*0.02):] = True

def ca(m, iters):
    m = m.copy()
    for _ in range(iters):
        s = np.zeros(m.shape, int)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy == 0 and dx == 0: continue
                s += np.roll(np.roll(m.astype(int), dy, 0), dx, 1)
        m = np.where(s >= 5, True, np.where(s <= 2, False, m))
    return m
rock = ca(rock, 5)

# passagem garantida (largura irregular por linha)
pw = 66 + (coarse(7, 13)[:, 0] * 30).astype(int)
for y in range(H):
    c = int(center[y, 0] * W); half = int(pw[y])
    rock[y, max(0, c-half):min(W, c+half)] = False
rock = ca(rock, 1)
rock[:, :int(W*0.02)] = True; rock[:, -int(W*0.02):] = True

# ---------- texturas ----------
def tile_of(fn):
    img = Image.open(SP + fn).convert("RGB")
    t = Image.new("RGB", (W, H))
    for x in range(0, W, img.width):
        for y in range(0, H, img.height): t.paste(img, (x, y))
    return np.asarray(t, float)

# CHAO: mistura de varios pisos em manchas (mata a repeticao)
sel = coarse(4, 7)
floors = [tile_of(f) for f in FLOOR_MIX]
n = len(floors)
fa = floors[0].copy()
for i in range(1, n):
    lo = i / n
    fa = np.where((sel >= lo)[..., None], floors[i], fa)
# variacao fina de brilho
fa = np.clip(fa + (coarse(13, 25) - 0.5)[..., None] * 40, 0, 255)

# ROCHA: tile base + PEDACOS de rocha espalhados (quebra o padrao regular do tile)
_base = Image.open(SP + WALL_TILE).convert("RGB")
_rock_img = Image.new("RGB", (W, H))
for x in range(0, W, _base.width):
    for y in range(0, H, _base.height): _rock_img.paste(_base, (x, y))
_mw = Image.open(SP + "w_mountain.gif").convert("RGBA")
_r, _g, _b, _a = _mw.split()          # tinge a rocha (cinza) de MARROM
_mw = Image.merge("RGBA", (_r.point(lambda v: min(255, int(v*1.08))),
                           _g.point(lambda v: int(v*0.70)),
                           _b.point(lambda v: int(v*0.46)), _a))
for _ in range(140):
    _x = random.randrange(-40, W); _y = random.randrange(-40, H)
    _s = random.uniform(0.6, 1.4)
    _m = _mw.resize((max(8, int(_mw.width*_s)), max(8, int(_mw.height*_s))), Image.NEAREST)
    for _dy in (0, -H, H): _rock_img.paste(_m, (_x, _y + _dy), _m)
ra = np.asarray(_rock_img, float) * 0.44          # rocha escura => caminho contrasta
ra = np.clip(ra + (coarse(11, 21) - 0.5)[..., None] * 40, 0, 255)

scene = np.where(rock[..., None], ra, fa)

# ---------- sombra de contato do chao junto da rocha ----------
d = ndimage.distance_transform_edt(~rock)[..., None]
scene = np.where(rock[..., None], scene, scene * (0.48 + 0.52 * np.clip(d / 18.0, 0, 1)))

img = Image.fromarray(np.clip(scene, 0, 255).astype("uint8")).convert("RGBA")

# ---------- pedras / entulho ----------
sprites = [Image.open(SP + s).convert("RGBA") for s in
           ["r_Debris__Rubble_.gif", "r_Stone_Pile__Small_.gif", "r_Loose_Stone_Pile.gif", "r_Rubble.gif"]]
dnp = ndimage.distance_transform_edt(~rock)
pts = np.argwhere(~rock)

def put(sp_img, cx, cy, sc):
    s = sp_img.resize((max(4, int(sp_img.width*sc)), max(4, int(sp_img.height*sc))), Image.NEAREST)
    for dy in (0, -H, H):
        img.paste(s, (cx - s.width//2, cy - s.height//2 + dy), s)

edge = pts[dnp[pts[:, 0], pts[:, 1]] < 5]
for _ in range(150):
    y, x = edge[random.randrange(len(edge))]
    put(random.choice(sprites), int(x), int(y), random.uniform(0.28, 0.5))
openp = pts[dnp[pts[:, 0], pts[:, 1]] > 9]
for _ in range(85):
    y, x = openp[random.randrange(len(openp))]
    put(random.choice(sprites), int(x), int(y), random.uniform(0.22, 0.42))

out_img = img.convert("RGB").quantize(colors=192, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG)
out_img.save(OUT + "scene-%s.png" % NAME, optimize=True)
print("scene-%s.png ok %s | rocha %.0f%%" % (NAME, img.size, 100*rock.mean()))
