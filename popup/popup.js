import { getSettings, setSetting, resolveLanguage, resolveTheme } from '../lib/settings.js';
import { loadTranslations } from '../lib/i18n.js';
import { createRenderer } from '../lib/render-pipeline.js';

const FUNDA_DETAIL_RE = /^https:\/\/www\.funda\.nl\/detail\/(koop|huur|nieuwbouw)\//;

let MESSAGES = {};
let SETTINGS = null;
let renderer = null;

// Manual {0}/{1} substitution -- see lib/i18n.js header comment for why we
// don't use WebExtension's native $1-style substitution here.
function t(key, ...args) {
  let msg = MESSAGES[key] || key;
  args.forEach((arg, i) => {
    msg = msg.replace(new RegExp(`\\{${i}\\}`, 'g'), String(arg));
  });
  return msg;
}

function el(id) {
  return document.getElementById(id);
}

function addressToString(addr) {
  return `${addr.street}, ${addr.postcode} ${addr.city}`;
}

async function getActiveFundaTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !FUNDA_DETAIL_RE.test(tab.url)) {
    return null;
  }
  return tab;
}

async function main() {
  SETTINGS = await getSettings();
  // Apply theme before the (slightly slower) translation-file fetch, to
  // minimize the light-theme flash for dark-theme users on a fresh popup.
  renderer.applyTheme(await resolveTheme(SETTINGS.theme));
  MESSAGES = await loadTranslations(resolveLanguage(SETTINGS.language));

  renderer.setStaticText();
  renderer.showStatus(t('loading'));

  const tab = await getActiveFundaTab();
  if (!tab) {
    renderer.showStatus(t('error_not_funda_listing'));
    return;
  }

  // No content script runs on nieuwbouw pages, so GET_ADDRESS would fail
  // with a generic error; say what's actually going on instead.
  if (/\/detail\/nieuwbouw\//.test(tab.url)) {
    renderer.showStatus(t('error_nieuwbouw'));
    return;
  }

  let addressResponse;
  try {
    addressResponse = await browser.tabs.sendMessage(tab.id, { type: 'GET_ADDRESS' });
  } catch (err) {
    renderer.showStatus(t('error_generic'), { showRetry: true });
    return;
  }

  if (addressResponse?.error === 'NIEUWBOUW') {
    renderer.showStatus(t('error_nieuwbouw'));
    return;
  }
  if (!addressResponse?.address) {
    renderer.showStatus(t('error_no_address'));
    return;
  }

  const addressText = addressToString(addressResponse.address);

  let checkResponse;
  try {
    checkResponse = await browser.runtime.sendMessage({ type: 'CHECK_PLEK', address: addressText });
  } catch (err) {
    renderer.showStatus(t('error_generic'), { showRetry: true });
    return;
  }

  if (!checkResponse?.ok) {
    if (checkResponse?.code === 'NOT_FOUND') {
      renderer.showStatus(t('error_geocode_not_found'));
    } else {
      renderer.showStatus(t('error_generic'), { showRetry: true });
    }
    return;
  }

  renderer.renderResults(checkResponse.data, addressText, SETTINGS);
}

renderer = createRenderer({ root: document, t, themeTarget: document.documentElement, doc: document });

el('retry-btn').addEventListener('click', () => main());
el('settings-btn').addEventListener('click', () => browser.runtime.openOptionsPage());
el('theme-toggle').addEventListener('change', async (e) => {
  const newTheme = e.target.checked ? 'dark' : 'light';
  renderer.applyTheme(newTheme);
  await setSetting('theme', newTheme);
});

// React live if the OS/browser theme changes while set to 'auto', without
// needing the popup to be reopened.
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
    if (SETTINGS && SETTINGS.theme === 'auto') {
      renderer.applyTheme(await resolveTheme('auto'));
    }
  });
}

main();
