// Regressão: Knight e Sorcerer/Druid não podem ter mudado com a reestruturação
// que deu Magic Level ao Paladino. Testa a função de domínio direto (pura).
const T = await import('../src/domain/training.js?v=chk');
const esperado = {
  knight:   ['sword', 'axe', 'club'],
  paladin:  ['distance', 'magic'],
  sorcerer: ['magic'],
  druid:    ['magic'],
};
let falhas = [];
for (const [voc, exp] of Object.entries(esperado)) {
  const got = T.onlineTrainableSkills(voc);
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  console.log(`${voc.padEnd(9)} -> ${got.join(', ')} ${ok ? '' : ' <-- ESPERADO: ' + exp.join(', ')}`);
  if (!ok) falhas.push(voc);
}
console.log(falhas.length ? `\nRESULTADO: FALHOU (${falhas.join(', ')})` : '\nRESULTADO: PASSOU');
