import { ZONES, MONSTERS } from '../src/domain/bestiary.js';
// Heurística: dedup monstros; força = xp (fallback hp). Comuns (fracos) mais
// frequentes; boss da zona raro. Depois arredonda somando exatamente 100.
function strength(id){ const m=MONSTERS[id]||{}; return (m.xp||0)*1000 + (m.hp||0); }
function genZone(z){
  const ids=[...new Set(z.monsters)];
  if(ids.length===1) return { [ids[0]]: 100 };
  const boss=z.boss && ids.includes(z.boss) ? z.boss : null;
  const others=ids.filter(id=>id!==boss);
  const bossPct = boss ? (others.length>=3?5: others.length===2?8:12) : 0;
  // peso por rank inverso de força (mais fraco = maior peso)
  const ranked=[...others].sort((a,b)=>strength(a)-strength(b)); // fraco->forte
  const k=ranked.length; const w={}; let sw=0;
  ranked.forEach((id,i)=>{ w[id]=k-i; sw+=w[id]; }); // fraco peso k, forte peso 1
  const remain=100-bossPct;
  const raw={}; ids.forEach(id=>{ raw[id]= id===boss? bossPct : remain*w[id]/sw; });
  // arredonda pra inteiro somando 100
  const out={}; let acc=0; const keys=ids.slice();
  keys.forEach(id=>{ out[id]=Math.max(1,Math.round(raw[id])); acc+=out[id]; });
  // ajusta o maior (não-boss) pra fechar em 100
  let diff=100-acc;
  if(diff!==0){ const big=others.sort((a,b)=>out[b]-out[a])[0]||ids[0]; out[big]=Math.max(1,out[big]+diff); }
  return out;
}
const table={};
for(const [id,z] of Object.entries(ZONES)) table[id]=genZone(z);
// imprime como literal, ordenado por spawn desc pra leitura
let s='export const ZONE_SPAWN = {\n';
for(const [id,sp] of Object.entries(table)){
  const entries=Object.entries(sp).sort((a,b)=>b[1]-a[1]).map(([m,p])=>`${m}: ${p}`).join(', ');
  const sum=Object.values(sp).reduce((a,b)=>a+b,0);
  s+=`  ${id}: { ${entries} },` + (sum!==100?`  // ⚠ soma=${sum}`:'') + '\n';
}
s+='};\n';
console.log(s);
