import { getSettings, setSetting, SUPPORTED_LANGUAGES, resolveLanguage, resolveTheme } from '../lib/settings.js';
import { loadTranslations } from '../lib/i18n.js';
import { hasHostAccess, requestHostAccess } from '../lib/host-access.js';

function el(id) {
  return document.getElementById(id);
}

let bound = false; // main() re-runs on language change; attach listeners once

async function main() {
  const settings = await getSettings();
  document.documentElement.setAttribute('data-theme', await resolveTheme(settings.theme));
  // The options page's own UI language: same "resolve auto via browser UI
  // language" logic as the popup, so the settings screen itself is legible
  // before the user has necessarily chosen a language.
  const messages = await loadTranslations(resolveLanguage(settings.language));
  const t = (key) => messages[key] || key;

  document.title = t('options_title');
  el('title').textContent = t('options_title');
  el('host-access-text').textContent = t('host_access_notice');
  el('host-access-btn').textContent = t('host_access_grant');
  el('host-access-denied').textContent = t('host_access_denied');
  el('label-language').textContent = t('settings_language_label');
  el('label-score-display').textContent = t('settings_score_display_label');
  el('label-emoji').textContent = t('settings_score_display_emoji');
  el('label-labels').textContent = t('settings_score_display_labels');
  el('label-map-mode').textContent = t('settings_map_mode_label');
  el('label-dynamic').textContent = t('settings_map_mode_dynamic');
  el('label-static').textContent = t('settings_map_mode_static');
  el('label-theme').textContent = t('settings_theme_label');
  el('label-theme-auto').textContent = t('settings_theme_auto');
  el('label-theme-light').textContent = t('settings_theme_light');
  el('label-theme-dark').textContent = t('settings_theme_dark');
  el('label-toolbar').textContent = t('settings_toolbar_label');
  el('label-toolbar-panel').textContent = t('settings_toolbar_panel');
  el('label-toolbar-popup').textContent = t('settings_toolbar_popup');

  // Show the notice when Firefox hasn't granted the manifest's host
  // permissions (temporary add-on, or revoked in about:addons).
  const hasAccess = await hasHostAccess();
  el('host-access-notice').hidden = hasAccess;
  el('host-access-denied').hidden = true;

  const languageSelect = el('language');
  languageSelect.replaceChildren();
  for (const { code, labelKey } of SUPPORTED_LANGUAGES) {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = t(labelKey);
    languageSelect.appendChild(opt);
  }
  languageSelect.value = settings.language;
  if (!bound) languageSelect.addEventListener('change', async () => {
    await setSetting('language', languageSelect.value);
    // Re-render this page's own text immediately in the newly chosen language.
    main();
  });

  for (const input of document.querySelectorAll('input[name="scoreDisplay"]')) {
    input.checked = input.value === settings.scoreDisplay;
    if (!bound) input.addEventListener('change', () => setSetting('scoreDisplay', input.value));
  }

  for (const input of document.querySelectorAll('input[name="mapMode"]')) {
    input.checked = input.value === settings.mapMode;
    if (!bound) input.addEventListener('change', () => setSetting('mapMode', input.value));
  }

  for (const input of document.querySelectorAll('input[name="toolbarMode"]')) {
    input.checked = input.value === settings.toolbarMode;
    if (!bound) input.addEventListener('change', () => setSetting('toolbarMode', input.value));
  }

  for (const input of document.querySelectorAll('input[name="theme"]')) {
    input.checked = input.value === settings.theme;
    if (!bound) input.addEventListener('change', async () => {
      await setSetting('theme', input.value);
      document.documentElement.setAttribute('data-theme', await resolveTheme(input.value));
    });
  }

  if (!bound) {
    // requestHostAccess() (browser.permissions.request) must run directly
    // inside the user-gesture handler, with nothing awaited before it --
    // Firefox only shows the prompt from a user action.
    el('host-access-btn').addEventListener('click', async () => {
      let granted = false;
      try {
        granted = await requestHostAccess();
      } catch (err) {
        granted = false; // request() rejects rather than resolving false
      }
      if (granted) {
        el('host-access-notice').hidden = true;
      } else {
        el('host-access-denied').hidden = false;
      }
    });

    // Follow grants/revocations made in about:addons while this page is
    // open: main() re-checks access and shows/hides the notice.
    browser.permissions.onAdded.addListener(() => main());
    browser.permissions.onRemoved.addListener(() => main());
  }

  bound = true;
}

main();
