// Settings shared between popup.js and options.js, persisted via
// browser.storage.local (not storage.sync — addresses/preferences here are
// not something we want silently propagating to a synced account by
// default; local keeps behaviour predictable and matches the "no data
// leaves the browser beyond the APIs we call" stance in REVIEW.md).

export const DEFAULT_SETTINGS = {
  // 'auto' = follow the browser's own UI language (falls back to English
  // for anything we haven't translated); otherwise an explicit locale code
  // from SUPPORTED_LANGUAGES below.
  language: 'auto',
  // 'emoji' | 'labels'
  scoreDisplay: 'emoji',
  // 'dynamic' | 'static'
  mapMode: 'dynamic',
  // 'auto' | 'light' | 'dark' -- 'auto' follows prefers-color-scheme; the
  // popup's toggle switch sets an explicit override when used.
  theme: 'auto',
  // 'panel' = toolbar button toggles the in-page side panel; 'popup' = it
  // opens the classic toolbar pop-out instead.
  toolbarMode: 'panel',
};

export const SUPPORTED_LANGUAGES = [
  { code: 'auto', labelKey: 'lang_auto' },
  { code: 'en', labelKey: 'lang_en' },
  { code: 'nl', labelKey: 'lang_nl' },
];

export const SUPPORTED_THEMES = [
  { code: 'auto', labelKey: 'settings_theme_auto' },
  { code: 'light', labelKey: 'settings_theme_light' },
  { code: 'dark', labelKey: 'settings_theme_dark' },
];

const STORAGE_KEY = 'settings';

export async function getSettings() {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  return { ...DEFAULT_SETTINGS, ...(stored[STORAGE_KEY] || {}) };
}

export async function setSetting(key, value) {
  const current = await getSettings();
  const next = { ...current, [key]: value };
  await browser.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

/** Resolves 'auto' to an actual supported locale code, based on browser UI language. */
export function resolveLanguage(languageSetting) {
  if (languageSetting !== 'auto') return languageSetting;
  const uiLang = (browser.i18n.getUILanguage() || 'en').toLowerCase();
  return uiLang.startsWith('nl') ? 'nl' : 'en';
}

/** Resolves 'auto' to 'light' or 'dark' based on the OS/browser's own
 * prefers-color-scheme setting; otherwise returns the explicit choice. */
export async function resolveTheme(themeSetting) {
  if (themeSetting !== 'auto') return themeSetting;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}
