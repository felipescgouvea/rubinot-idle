"""
Biblioteca de extração de assets do cliente oficial Tibia 15.x.
Compartilhada pelos extratores (itens, monstros, outfits, efeitos, missiles).

Fonte dos assets: %LOCALAPPDATA%\\Tibia\\packages\\Tibia\\assets (cliente oficial
instalado). Ver memória [[extrair-sprites-cliente-tibia]] e o header de
scripts/extract-client-attack-fx.py pro formato CIP .bmp.lzma e o protobuf.
"""
import os, glob, json, struct, lzma, io, re
from collections import OrderedDict
from PIL import Image

ASSETS = os.environ.get("TIBIA_ASSETS") or os.path.join(
    os.environ.get("LOCALAPPDATA", ""), "Tibia", "packages", "Tibia", "assets")
SPR_DIM = {0: (32, 32), 1: (32, 64), 2: (64, 32), 3: (64, 64)}

# ---------------- folhas de sprite (LRU pra não estourar RAM) ----------------
_cat = json.load(open(os.path.join(ASSETS, "catalog-content.json")))
SHEETS = sorted([e for e in _cat if e.get("type") == "sprite"], key=lambda e: e["firstspriteid"])
_lru = OrderedDict()
_LRU_MAX = 12

def _decomp(fname):
    if fname in _lru:
        _lru.move_to_end(fname); return _lru[fname]
    b = open(os.path.join(ASSETS, fname), "rb").read()
    p = b.find(bytes([0x70, 0x0A, 0xFA, 0x80, 0x24])) + 5
    while b[p] & 0x80: p += 1
    p += 1
    props = b[p]; lc, r = props % 9, props // 9; lp, pb = r % 5, r // 5
    ds = struct.unpack("<I", b[p + 1:p + 5])[0]
    filt = [{"id": lzma.FILTER_LZMA1, "dict_size": ds, "lc": lc, "lp": lp, "pb": pb}]
    raw = lzma.LZMADecompressor(format=lzma.FORMAT_RAW, filters=filt).decompress(b[p + 13:])
    img = Image.open(io.BytesIO(raw)).convert("RGBA")
    _lru[fname] = img
    if len(_lru) > _LRU_MAX: _lru.popitem(last=False)
    return img

def _sheet_of(sid):
    lo, hi = 0, len(SHEETS) - 1
    while lo <= hi:
        m = (lo + hi) // 2; e = SHEETS[m]
        if sid < e["firstspriteid"]: hi = m - 1
        elif sid > e["lastspriteid"]: lo = m + 1
        else: return e
    return None

def sprite(sid):
    """Recorta o sprite `sid` (RGBA) no tamanho nativo da folha (32/64)."""
    e = _sheet_of(sid)
    if not e: return None
    sw, sh = SPR_DIM[e["spritetype"]]
    img = _decomp(e["file"]); cols = img.width // sw
    k = sid - e["firstspriteid"]; x, y = (k % cols) * sw, (k // cols) * sh
    return img.crop((x, y, x + sw, y + sh))

# ---------------- protobuf appearances ----------------
def _rv(b, i):
    r = s = 0
    while True:
        c = b[i]; i += 1; r |= (c & 0x7F) << s
        if not c & 0x80: return r, i
        s += 7

def parse(b):
    i, n, out = 0, len(b), {}
    while i < n:
        t, i = _rv(b, i); fn, wt = t >> 3, t & 7
        if wt == 0: v, i = _rv(b, i)
        elif wt == 2:
            ln, i = _rv(b, i); v = b[i:i + ln]; i += ln
        elif wt == 1: v = b[i:i + 8]; i += 8
        elif wt == 5: v = b[i:i + 4]; i += 4
        else: raise ValueError(wt)
        out.setdefault(fn, []).append((wt, v))
    return out

def ulist(f5):
    ids = []
    for wt, v in f5 or []:
        if wt == 0: ids.append(v)
        elif wt == 2:
            j = 0
            while j < len(v):
                x, j = _rv(v, j); ids.append(x)
    return ids

_ROOT = parse(open(glob.glob(os.path.join(ASSETS, "appearances-*.dat"))[0], "rb").read())
OBJECTS = _ROOT.get(1, [])
OUTFITS = _ROOT.get(2, [])
EFFECTS = _ROOT.get(3, [])
MISSILES = _ROOT.get(4, [])

def appearance(raw):
    """Appearance -> dict {id, name, groups:[sprite_info...]}. sprite_info tem
    ids[], layers, pw, ph, pd, frames, phases[], w/h nativos do 1o sprite."""
    ap = parse(raw)
    out = {"id": ap.get(1, [(0, 0)])[0][1], "name": None, "groups": []}
    nm = ap.get(4)
    if nm: out["name"] = nm[0][1].decode("latin1")
    for _, fgraw in ap.get(2, []):
        fg = parse(fgraw)
        fgid = fg.get(1, [(0, 0)])[0][1]          # FIXED_FRAME_GROUP (0=idle,1=walk)
        for _, siraw in fg.get(3, []):
            si = parse(siraw)
            ids = ulist(si.get(5))
            phases = []
            if si.get(6):
                a = parse(si[6][0][1])
                for _, pr in a.get(6, []):
                    phases.append(parse(pr).get(1, [(0, 100)])[0][1])
            out["groups"].append({
                "fgid": fgid,
                "ids": ids,
                "pw": si.get(1, [(0, 1)])[0][1],
                "ph": si.get(2, [(0, 1)])[0][1],
                "pd": si.get(3, [(0, 1)])[0][1],
                "layers": si.get(4, [(0, 1)])[0][1],
                "phases": phases,
            })
    return out

# ---------------- índices por nome / id ----------------
def norm(s):
    """Normalização agressiva pra casar nomes: só [a-z0-9]."""
    return re.sub(r'[^a-z0-9]', '', s.lower())

def object_name_index():
    """nome-normalizado -> id do objeto (menor id em caso de repetido)."""
    idx = {}
    for _, raw in OBJECTS:
        ap = parse(raw)
        nm = ap.get(4)
        if not nm: continue
        key = norm(nm[0][1].decode("latin1"))
        oid = ap.get(1, [(0, 0)])[0][1]
        if key and (key not in idx or oid < idx[key]):
            idx[key] = oid
    return idx

def outfit_by_looktype():
    """looktype (id) -> raw da Appearance do outfit."""
    return {parse(raw).get(1, [(0, 0)])[0][1]: raw for _, raw in OUTFITS}

def object_by_id():
    return {parse(raw).get(1, [(0, 0)])[0][1]: raw for _, raw in OBJECTS}

# ---------------- composição ----------------
def compose_layers(ids, base_index, layers, size):
    """Empilha as `layers` (base + overlays) de um mesmo pattern/frame."""
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    for l in range(layers):
        s = sprite(ids[base_index + l])
        if s is None: continue
        if s.size != size:
            c2 = Image.new("RGBA", size, (0, 0, 0, 0))
            c2.paste(s, (size[0] - s.width, size[1] - s.height), s)  # ancora inf-dir (tiles Tibia)
            s = c2
        canvas = Image.alpha_composite(canvas, s)
    return canvas

def trim(img):
    bb = img.getbbox()
    return img.crop(bb) if bb else img

# ---------------- colorização de outfit (paleta 133 cores + template) ----------------
# Paleta HSI do Tibia/OTClient: 19 matizes x 7 níveis de saturação/brilho = 133.
# Réplica de Outfit::getColor (OTClient) — ver [[extrair-sprites-cliente-tibia]].
_HSI_H = 19
def _outfit_color(c):
    if c >= 7 * _HSI_H: c = 0
    loc1 = loc2 = loc3 = 0.0
    if c % _HSI_H != 0:
        loc1 = (c % _HSI_H) * (1.0 / 18.0)
        loc2 = 1.0; loc3 = 1.0
    tier = c // _HSI_H
    if   tier == 0: loc2 = 0.25
    elif tier == 1: loc2 = 0.50
    elif tier == 2: loc2 = 0.75
    elif tier == 3: loc3 = 0.75
    elif tier == 4: loc3 = 0.50
    elif tier == 5: loc2 = 0.75; loc3 = 0.50
    else:           loc2 = 0.50; loc3 = 0.50
    if loc2 == 0:
        v = int(loc3 * 255); return (v, v, v)
    # HSV -> RGB (h=loc1, s=loc2, v=loc3)
    h = loc1 * 6.0
    if h >= 6.0: h = 0.0
    i = int(h); f = h - i
    p = loc3 * (1 - loc2); q = loc3 * (1 - loc2 * f); t = loc3 * (1 - loc2 * (1 - f))
    r, g, b = [(loc3, t, p), (q, loc3, p), (p, loc3, t), (p, q, loc3), (t, p, loc3), (loc3, p, q)][i]
    return (int(r * 255), int(g * 255), int(b * 255))

def colorize(base, mask, colors):
    """Aplica as cores de outfit ao `base` usando a `mask` de template.
    colors = (head, body, legs, feet) índices 0-132. Regiões da máscara:
    amarelo=head, vermelho=body, verde=legs, azul=feet."""
    head, body, legs, feet = (_outfit_color(colors[0]), _outfit_color(colors[1]),
                              _outfit_color(colors[2]), _outfit_color(colors[3]))
    bp = base.load(); mp = mask.load()
    out = base.copy(); op = out.load()
    W, H = base.size
    for y in range(H):
        for x in range(W):
            br, bg, bb, ba = bp[x, y]
            if ba == 0: continue
            mr, mg, mb, ma = mp[x, y] if (x < mask.width and y < mask.height) else (0, 0, 0, 0)
            if ma == 0: continue
            ry = mr > 127; gy = mg > 127; by = mb > 127
            if ry and gy:   cr, cg, cb = head
            elif ry:        cr, cg, cb = body
            elif gy:        cr, cg, cb = legs
            elif by:        cr, cg, cb = feet
            else:           continue
            op[x, y] = (br * cr // 255, bg * cg // 255, bb * cb // 255, ba)
    return out
