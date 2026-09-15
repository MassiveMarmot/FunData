import { getSettings, setSetting, resolveLanguage, resolveTheme } from '../lib/settings.js';
import { loadTranslations } from '../lib/i18n.js';
import { SCORE_ICON_PATH } from '../lib/emoji.js';

const FUNDA_DETAIL_RE = /^https:\/\/www\.funda\.nl\/detail\/(koop|huur|nieuwbouw)\//;

let MESSAGES = {};
let SETTINGS = null;
let leafletMap = null; // holds the Leaflet map instance across renders, so
                        // a retry doesn't try to re-init Leaflet on a
                        // container that already has one (Leaflet throws
                        // "Map container is already initialized" otherwise).

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

function applyTheme(theme) {
  // theme is already resolved to 'light' or 'dark' by this point (see
  // resolveTheme in lib/settings.js) -- this function never sees 'auto'.
  document.documentElement.setAttribute('data-theme', theme);
  const toggle = el('theme-toggle');
  if (toggle) toggle.checked = theme === 'dark';
}

function setStaticText() {
  document.title = t('popup_title');
  el('popup-title').textContent = t('popup_title');
  el('settings-btn').setAttribute('aria-label', t('settings_button_title'));
  el('settings-btn').title = t('settings_button_title');
  el('theme-toggle-label').setAttribute('aria-label', t('theme_toggle_title'));
  el('theme-toggle-label').title = t('theme_toggle_title');
  document.querySelector('#section-leefomgeving h2').textContent = t('section_leefomgeving');
  document.querySelector('#section-buurt h2').textContent = t('section_buurt');
  el('source-note').textContent = t('data_source_note');
  el('atlas-link').textContent = t('open_in_atlas');
  el('retry-btn').textContent = t('retry');
}

function showStatus(message, { showRetry = false } = {}) {
  el('status').textContent = message;
  el('status').hidden = false;
  el('results').hidden = true;
  el('retry-btn').hidden = !showRetry;
}

function scoreBadgeClass(scoreKey) {
  if (!scoreKey) return 'badge-none';
  return 'badge-' + scoreKey.replace('score_', '');
}

// Renders either RIVM's own smiley icon or a coloured text pill for a
// score, depending on the user's scoreDisplay setting. Returns null (not
// an empty string) when there's nothing to show, so callers can safely
// check truthiness before appendChild -- rows with no score (WOZ value,
// stedelijkheid, hazard-activity list) must not get a badge element at all.
function scoreBadge(scoreKey) {
  if (!scoreKey) return null;
  if (SETTINGS.scoreDisplay === 'emoji') {
    const iconPath = SCORE_ICON_PATH[scoreKey];
    if (!iconPath) return null;
    const img = document.createElement('img');
    img.className = 'badge-icon';
    img.src = browser.runtime.getURL(iconPath);
    img.alt = t(scoreKey);
    img.width = 19;
    img.height = 19;
    return img;
  }
  const span = document.createElement('span');
  span.className = 'badge ' + scoreBadgeClass(scoreKey);
  span.textContent = t(scoreKey);
  return span;
}

function formatValue(row) {
  if (row.noData) return t('no_data');
  switch (row.kind) {
    case 'pm25':
      return `${row.value} \u00b5g PM2,5 / m\u00b3`;
    case 'no2':
      return `${row.value} \u00b5g NO\u2082 / m\u00b3`;
    case 'geluid':
      return row.raw < 46 ? t('geluid_below') : `${Math.round(row.raw)} dB`;
    case 'hitte':
      return t('hitte_display', row.raw.toFixed(1));
    case 'percentSurface':
      return `${row.raw.toFixed(0)}${t('unit_percent_surface')}`;
    case 'overstroming':
      return t(row.overstromingLabelKey);
    case 'stars':
      return `${row.value} ${t('unit_stars_visible')}`;
    case 'freeTextOrNone':
      return row.text || t('no_hazard_activities');
    case 'euroThousands':
      return formatEuroThousands(row.raw);
    case 'categorical':
      return t(row.categoryKey);
    case 'km':
      return `${row.raw.toFixed(1)} ${t('unit_km')}`;
    case 'metersToKm':
      return `${(row.raw / 1000).toFixed(1)} ${t('unit_km')}`;
    case 'scoreWordOnly':
      // The score badge/icon itself carries the information for this row
      // -- no separate value text needed (matches original site's single
      // "Redelijk"-style cell, just rendered via the shared badge logic
      // instead of a bespoke text-only path).
      return '';
    default:
      return t('no_data');
  }
}

function formatEuroThousands(value) {
  const n = Math.round(1000 * value);
  const digits = String(n);
  let grouped = '';
  let remaining = digits;
  while (remaining.length > 3) {
    grouped = ' ' + remaining.slice(-3) + grouped;
    remaining = remaining.slice(0, -3);
  }
  grouped = remaining + grouped;
  return `\u20ac ${grouped}`;
}

function renderRows(tbody, rows) {
  tbody.innerHTML = '';
  for (const row of rows) {
    const valueText = formatValue(row);
    const badge = !row.noData ? scoreBadge(row.scoreKey) : null;

    // Long free-text rows (currently just "activiteiten") get a label row
    // plus a full-width wrapped value row, instead of being squeezed into
    // the narrow right-hand value column where they'd overflow the popup.
    if (row.kind === 'freeTextOrNone') {
      const labelRow = document.createElement('tr');
      labelRow.className = 'wrap-label';
      const labelTd = document.createElement('td');
      labelTd.colSpan = 2;
      labelTd.textContent = t(row.labelKey) + ':';
      labelRow.appendChild(labelTd);
      tbody.appendChild(labelRow);

      const valueRow = document.createElement('tr');
      valueRow.className = 'wrap-value';
      const valueTd = document.createElement('td');
      valueTd.colSpan = 2;
      valueTd.textContent = valueText;
      valueRow.appendChild(valueTd);
      tbody.appendChild(valueRow);
      continue;
    }

    const tr = document.createElement('tr');

    const labelTd = document.createElement('td');
    labelTd.className = 'label';
    labelTd.textContent = t(row.labelKey) + ':';

    const valueTd = document.createElement('td');
    valueTd.className = 'value';
    const valueSpan = document.createElement('span');
    valueSpan.className = 'value-text';
    valueSpan.textContent = valueText;
    valueTd.appendChild(valueSpan);
    if (badge) valueTd.appendChild(badge);

    tr.appendChild(labelTd);
    tr.appendChild(valueTd);
    tbody.appendChild(tr);
  }
}

function buildAtlasUrl(addressText) {
  const b64 = btoa(unescape(encodeURIComponent(addressText)));
  return `https://www.atlasleefomgeving.nl/check-je-plek?adres=${b64}`;
}

// PDOK BRT achtergrondkaart, EPSG:3857 (standard Web Mercator) tile matrix
// set -- confirmed against PDOK's WMTSCapabilities.xml to use the exact
// same origin/scale doubling as the universal XYZ slippy-map scheme, so
// Leaflet's default CRS lines up with it with no reprojection needed. The
// only wrinkle is PDOK's zoom identifiers are zero-padded two-digit
// strings ("00".."19"), which Leaflet's {z} placeholder doesn't do on its
// own -- handled with a small TileLayer subclass, reused for the
// kadastrale kaart overlay too (same grid, different resource path).
const PdokTileLayer = L.TileLayer.extend({
  getTileUrl(coords) {
    const z = String(coords.z).padStart(2, '0');
    return this.options.pdokUrlTemplate
      .replace('{z}', z)
      .replace('{x}', coords.x)
      .replace('{y}', coords.y);
  },
});

const BASEMAP_URL_TEMPLATE =
  'https://service.pdok.nl/kadaster/brt-achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png';
// Real tile host confirmed from PDOK's own WMTSCapabilities.xml -- differs
// from the "kadaster/kadastralekaart" path the human-facing docs advertise,
// same pattern as the basemap's own capabilities-vs-tiles host mismatch.
const KADASTER_URL_TEMPLATE =
  'https://service.pdok.nl/kadaster/brk-kadastralekaart/wmts/v5_0/Kadastralekaart/EPSG:3857/{z}/{x}/{y}.png';

// Leaflet's default marker icon (L.Icon.Default) always prepends its own
// `imagePath` onto whatever iconUrl/shadowUrl you give it, even a complete
// absolute URL -- confirmed the hard way: patching L.Icon.Default via
// mergeOptions with full moz-extension:// URLs produced a *doubled* URL
// (imagePath + our already-complete URL) and a broken marker icon. Using
// a plain L.icon() instead avoids that prepending entirely, since the base
// Icon class's _getIconUrl just returns the URL as given.
function buildMarkerIcon() {
  return L.icon({
    iconUrl: browser.runtime.getURL('lib/vendor/leaflet/images/marker-icon.png'),
    iconRetinaUrl: browser.runtime.getURL('lib/vendor/leaflet/images/marker-icon-2x.png'),
    shadowUrl: browser.runtime.getURL('lib/vendor/leaflet/images/marker-shadow.png'),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

function renderDynamicMap(lat, lon) {
  el('map-dynamic').hidden = false;
  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
  }
  leafletMap = L.map('map-dynamic', {
    attributionControl: true,
    zoomControl: true,
  }).setView([lat, lon], 16);

  const baseLayer = new PdokTileLayer('', {
    pdokUrlTemplate: BASEMAP_URL_TEMPLATE,
    maxZoom: 19,
    attribution: '&copy; Kadaster / PDOK (BRT Achtergrondkaart)',
  }).addTo(leafletMap);

  const kadasterLayer = new PdokTileLayer('', {
    pdokUrlTemplate: KADASTER_URL_TEMPLATE,
    maxZoom: 19,
    opacity: 0.8,
    attribution: '&copy; Kadaster (Kadastrale kaart, CC-BY 4.0)',
  }).addTo(leafletMap);

  L.marker([lat, lon], { icon: buildMarkerIcon() }).addTo(leafletMap);

  L.control
    .layers(
      null,
      {
        [t('map_layer_control_kadaster')]: kadasterLayer,
      },
      { collapsed: true }
    )
    .addTo(leafletMap);

  // Leaflet needs a layout pass after becoming visible in a freshly-opened
  // popup, or tiles can render at the wrong size until the next interaction.
  setTimeout(() => leafletMap && leafletMap.invalidateSize(), 0);
}

function renderStaticMap(staticMap) {
  const mapImg = el('map-img');
  mapImg.src = staticMap.url;
  mapImg.alt = t('map_alt');
  el('map-wrap').hidden = false;

  const pin = el('map-pin');
  pin.style.left = `${(staticMap.markerX / staticMap.tileSize) * 100}%`;
  pin.style.top = `${(staticMap.markerY / staticMap.tileSize) * 100}%`;
}

function renderResults(data, addressText) {
  el('status').hidden = true;
  el('results').hidden = false;

  if (SETTINGS.mapMode === 'dynamic' && data.lat != null && data.lon != null) {
    renderDynamicMap(data.lat, data.lon);
  } else {
    renderStaticMap(data.staticMap);
  }

  renderRows(el('leefomgeving-rows'), data.leefomgeving);
  renderRows(el('buurt-rows'), data.buurt);

  el('atlas-link').href = buildAtlasUrl(addressText);
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
  applyTheme(await resolveTheme(SETTINGS.theme));
  MESSAGES = await loadTranslations(resolveLanguage(SETTINGS.language));

  setStaticText();
  showStatus(t('loading'));

  const tab = await getActiveFundaTab();
  if (!tab) {
    showStatus(t('error_not_funda_listing'));
    return;
  }

  let addressResponse;
  try {
    addressResponse = await browser.tabs.sendMessage(tab.id, { type: 'GET_ADDRESS' });
  } catch (err) {
    showStatus(t('error_generic'), { showRetry: true });
    return;
  }

  if (addressResponse?.error === 'NIEUWBOUW') {
    showStatus(t('error_nieuwbouw'));
    return;
  }
  if (!addressResponse?.address) {
    showStatus(t('error_no_address'));
    return;
  }

  const addressText = addressToString(addressResponse.address);

  let checkResponse;
  try {
    checkResponse = await browser.runtime.sendMessage({ type: 'CHECK_PLEK', address: addressText });
  } catch (err) {
    showStatus(t('error_generic'), { showRetry: true });
    return;
  }

  if (!checkResponse?.ok) {
    if (checkResponse?.code === 'NOT_FOUND') {
      showStatus(t('error_geocode_not_found'));
    } else {
      showStatus(t('error_generic'), { showRetry: true });
    }
    return;
  }

  renderResults(checkResponse.data, addressText);
}

el('retry-btn').addEventListener('click', () => main());
el('settings-btn').addEventListener('click', () => browser.runtime.openOptionsPage());
el('theme-toggle').addEventListener('change', async (e) => {
  const newTheme = e.target.checked ? 'dark' : 'light';
  applyTheme(newTheme);
  await setSetting('theme', newTheme);
});

// React live if the OS/browser theme changes while set to 'auto', without
// needing the popup to be reopened.
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
    if (SETTINGS && SETTINGS.theme === 'auto') {
      applyTheme(await resolveTheme('auto'));
    }
  });
}

main();
