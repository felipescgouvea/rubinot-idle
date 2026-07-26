// Sistema de idiomas do jogo: padrão inglês (igual ao Tibia real — nomes de
// criatura/item/magia são sempre em inglês, só a interface muda de idioma).
// Detecta o idioma do navegador no primeiro acesso (pt* -> português, resto
// -> inglês) e deixa o jogador trocar em Configurações (ver ui/settingsPanel.js
// e a chamada setLocale). A escolha fica salva à parte do save do jogo — é
// preferência de interface, não progresso.
import en from './locales/en.js?v=365';
import pt from './locales/pt.js?v=365';

const LOCALES = { en, pt };
export const LOCALE_NAMES = { en: 'English', pt: 'Português' };
const STORAGE_KEY = 'rubinot_locale';

function detectBrowserLocale() {
  const langs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || navigator.userLanguage || 'en'];
  for (const lang of langs) {
    if (/^pt/i.test(lang)) return 'pt';
  }
  return 'en'; // padrão do jogo (não é o idioma do navegador — é o fallback quando o navegador não é pt*)
}

let currentLocale = localStorage.getItem(STORAGE_KEY) || detectBrowserLocale();
if (!LOCALES[currentLocale]) currentLocale = 'en';

export function getLocale() {
  return currentLocale;
}

// Recarrega a página de propósito: strings traduzidas estão espalhadas por
// HTML estático (index.html) e centenas de template strings já renderizados
// (innerHTML) — um reload garante que TUDO reflete o novo idioma de uma vez,
// em vez de precisar de lógica reativa em cada render do jogo inteiro.
export function setLocale(loc) {
  if (!LOCALES[loc] || loc === currentLocale) return;
  localStorage.setItem(STORAGE_KEY, loc);
  location.reload();
}

// t('settings.title') -> string traduzida. t('hunt.killedMonster', { name: 'Rat' })
// troca {name} pelo valor. Cai no inglês se a chave faltar na tradução atual
// (nunca deveria faltar, mas evita string quebrada em produção), e na própria
// chave se nem no inglês existir (fica óbvio no lugar de sumir em silêncio).
export function t(key, vars) {
  let str = LOCALES[currentLocale][key] ?? LOCALES.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) str = str.split(`{${k}}`).join(v);
  }
  return str;
}

// Traduz o HTML estático (index.html), que não passa pelo t() diretamente
// porque não é gerado via template string. Convenção:
//   data-i18n="key"       -> substitui o textContent do elemento
//   data-i18n-html="key"  -> substitui o innerHTML (quando a tradução tem tags)
//   data-i18n-attr="title:key1,placeholder:key2" -> traduz atributos
// Chamado uma vez no boot, antes de qualquer render dinâmico do jogo.
export function applyStaticTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  root.querySelectorAll('[data-i18n-attr]').forEach(el => {
    el.dataset.i18nAttr.split(',').forEach(pair => {
      const [attr, key] = pair.split(':').map(s => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });
}
