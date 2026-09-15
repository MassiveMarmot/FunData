// WebExtension's built-in browser.i18n.getMessage() always follows the
// browser's own UI language and can't be overridden at runtime — but we
// want a user-facing language *setting* independent of that. So we load
// the same _locales/*/messages.json files ourselves and pick the language
// explicitly, falling back to English for any key a locale is missing.

const cache = {};

async function loadLocaleFile(langCode) {
  if (cache[langCode]) return cache[langCode];
  const url = browser.runtime.getURL(`_locales/${langCode}/messages.json`);
  const res = await fetch(url);
  const raw = await res.json();
  const flat = {};
  for (const [key, entry] of Object.entries(raw)) {
    flat[key] = entry.message;
  }
  cache[langCode] = flat;
  return flat;
}

/**
 * @param {string} langCode - 'en' or 'nl' (already resolved from 'auto' by
 *   lib/settings.js's resolveLanguage — this module doesn't know about the
 *   'auto' setting on purpose, to keep it a pure "give me this language"
 *   loader).
 * @returns {Promise<object>} flat { key: messageString } dict, English used
 *   to fill in any key missing from a non-English locale.
 */
export async function loadTranslations(langCode) {
  const english = await loadLocaleFile('en');
  if (langCode === 'en') return english;
  try {
    const other = await loadLocaleFile(langCode);
    return { ...english, ...other };
  } catch {
    // Locale file missing/broken — English is always a safe fallback.
    return english;
  }
}
