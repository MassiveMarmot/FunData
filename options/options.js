import { getSettings, setSetting, SUPPORTED_LANGUAGES, resolveLanguage, resolveTheme } from '../lib/settings.js';
import { loadTranslations } from '../lib/i18n.js';

function el(id) {
  return document.getElementById(id);
}

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

  const languageSelect = el('language');
  languageSelect.innerHTML = '';
  for (const { code, labelKey } of SUPPORTED_LANGUAGES) {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = t(labelKey);
    languageSelect.appendChild(opt);
  }
  languageSelect.value = settings.language;
  languageSelect.addEventListener('change', async () => {
    await setSetting('language', languageSelect.value);
    // Re-render this page's own text immediately in the newly chosen language.
    main();
  });

  for (const input of document.querySelectorAll('input[name="scoreDisplay"]')) {
    input.checked = input.value === settings.scoreDisplay;
    input.addEventListener('change', () => setSetting('scoreDisplay', input.value));
  }

  for (const input of document.querySelectorAll('input[name="mapMode"]')) {
    input.checked = input.value === settings.mapMode;
    input.addEventListener('change', () => setSetting('mapMode', input.value));
  }

  for (const input of document.querySelectorAll('input[name="theme"]')) {
    input.checked = input.value === settings.theme;
    input.addEventListener('change', async () => {
      await setSetting('theme', input.value);
      document.documentElement.setAttribute('data-theme', await resolveTheme(input.value));
    });
  }
}

main();
