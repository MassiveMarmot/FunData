// Shared render pipeline for the results view: everything from "apply
// theme" down to "draw the map + tables" is identical between the popup
// and the injected in-page panel, so both entry points call into this
// module instead of keeping two copies that can drift apart.
//
// `root` must support getElementById — either `document` (popup) or a
// shadow root (panel). `themeTarget` is the element `data-theme` gets set
// on: `document.documentElement` for the popup, the shadow host for the
// panel (CSS variables are scoped there, not to the outer Funda page).
// `doc` is the Document to create elements with. This can't default to the
// module's own ambient `document`: when this module is dynamically
// imported into a content script (the panel), Firefox evaluates it in a
// realm tied to the extension's own origin, not the content script's page
// realm -- so a bare `doc.createElement(...)` here would create nodes
// belonging to the wrong document. Symptom if this is wrong: elements
// render, but setting an <img> src to a blob: URL created by the caller
// throws "Content at moz-extension://... may not load data from
// blob:https://...". The popup passes its own `document` (no mismatch
// there, since popup.js imports this module normally); the panel passes
// its own content-script `document` (the actual page document it shares).

import { SCORE_ICON_PATH } from './emoji.js';

// Leaflet's default marker icon (L.Icon.Default) always prepends its own
// `imagePath` onto whatever iconUrl/shadowUrl you give it, even a complete
// absolute URL. Using a plain L.icon() instead avoids that prepending
// entirely, since the base Icon class's _getIconUrl just returns the URL
// as given. Used by the popup (an extension page, so browser.runtime.getURL
// images load with no manifest changes needed); the panel passes its own
// divIcon-based builder instead (see content-scripts/panel.js).
function defaultBuildMarkerIcon() {
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

export function createRenderer({
  root,
  t,
  themeTarget,
  doc,
  // Overridable so the page-injected panel can swap in an inline-SVG
  // divIcon (see content-scripts/panel.js) instead of Leaflet's bundled PNG
  // marker images, which would otherwise need a web_accessible_resources
  // entry once loaded from a page-visible <img> in that context.
  buildMarkerIcon = defaultBuildMarkerIcon,
  // Overridable so the panel can resolve bundled assets (RIVM score icons)
  // to pre-fetched blob URLs instead of a raw moz-extension:// URL, for the
  // same web_accessible_resources reason.
  resolveAssetUrl = (path) => browser.runtime.getURL(path),
}) {
  // Holds the Leaflet map instance across renders/retries for *this*
  // renderer instance, so a retry doesn't try to re-init Leaflet on a
  // container that already has one (Leaflet throws "Map container is
  // already initialized" otherwise). Scoped per-renderer so the popup and
  // an open panel never share/clobber each other's map instance.
  let leafletMap = null;

  function el(id) {
    return root.getElementById(id);
  }

  function applyTheme(theme) {
    // theme is already resolved to 'light' or 'dark' by the caller (see
    // resolveTheme in lib/settings.js) -- this function never sees 'auto'.
    themeTarget.setAttribute('data-theme', theme);
    const toggle = el('theme-toggle');
    if (toggle) toggle.checked = theme === 'dark';
  }

  function setStaticText() {
    if (root === doc) doc.title = t('popup_title');
    el('popup-title').textContent = t('popup_title');
    el('settings-btn').setAttribute('aria-label', t('settings_button_title'));
    el('settings-btn').title = t('settings_button_title');
    el('theme-toggle-label').setAttribute('aria-label', t('theme_toggle_title'));
    el('theme-toggle-label').title = t('theme_toggle_title');
    root.querySelector('#section-leefomgeving h2').textContent = t('section_leefomgeving');
    root.querySelector('#section-buurt h2').textContent = t('section_buurt');
    el('source-note').textContent = t('data_source_note');
    el('atlas-link').textContent = t('open_in_atlas');
    el('leefbaarometer-link').textContent = t('open_in_leefbaarometer');
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
  // stedelijkheid, hazard-activity list) must not get a badge element.
  function scoreBadge(scoreKey, scoreDisplay) {
    if (!scoreKey) return null;
    if (scoreDisplay === 'emoji') {
      const iconPath = SCORE_ICON_PATH[scoreKey];
      if (!iconPath) return null;
      const img = doc.createElement('img');
      img.className = 'badge-icon';
      img.src = resolveAssetUrl(iconPath);
      img.alt = t(scoreKey);
      img.width = 19;
      img.height = 19;
      return img;
    }
    const span = doc.createElement('span');
    span.className = 'badge ' + scoreBadgeClass(scoreKey);
    span.textContent = t(scoreKey);
    return span;
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
        // -- no separate value text needed.
        return '';
      default:
        return t('no_data');
    }
  }

  function renderRows(tbody, rows, scoreDisplay) {
    tbody.replaceChildren();
    for (const row of rows) {
      const valueText = formatValue(row);
      const badge = !row.noData ? scoreBadge(row.scoreKey, scoreDisplay) : null;

      // Long free-text rows (currently just "activiteiten") get a label row
      // plus a full-width wrapped value row, instead of being squeezed into
      // the narrow right-hand value column where they'd overflow.
      if (row.kind === 'freeTextOrNone') {
        const labelRow = doc.createElement('tr');
        labelRow.className = 'wrap-label';
        const labelTd = doc.createElement('td');
        labelTd.colSpan = 2;
        labelTd.textContent = t(row.labelKey) + ':';
        labelRow.appendChild(labelTd);
        tbody.appendChild(labelRow);

        const valueRow = doc.createElement('tr');
        valueRow.className = 'wrap-value';
        const valueTd = doc.createElement('td');
        valueTd.colSpan = 2;
        valueTd.textContent = valueText;
        valueRow.appendChild(valueTd);
        tbody.appendChild(valueRow);
        continue;
      }

      const tr = doc.createElement('tr');

      const labelTd = doc.createElement('td');
      labelTd.className = 'label';
      labelTd.textContent = t(row.labelKey) + ':';

      const valueTd = doc.createElement('td');
      valueTd.className = 'value';
      const valueSpan = doc.createElement('span');
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

  // leefbaarometer.nl's map page. No documented deep-link parameters for
  // centering on a location were found, so this opens the map itself; when
  // the URL scheme is confirmed, build it here from lat/lon (or RD x/y).
  function buildLeefbaarometerUrl(/* lat, lon */) {
    return 'https://www.leefbaarometer.nl/kaart/#kaart';
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
  const KADASTER_URL_TEMPLATE =
    'https://service.pdok.nl/kadaster/brk-kadastralekaart/wmts/v5_0/Kadastralekaart/EPSG:3857/{z}/{x}/{y}.png';
  // Classic WMS (not WMTS like the two above), so it's added with Leaflet's
  // built-in L.tileLayer.wms rather than the PdokTileLayer subclass --
  // that subclass exists only to work around PDOK's zero-padded WMTS zoom
  // identifiers, which don't apply here. "score24_schaalafhankelijk" (lbm3
  // workspace, overall score for 2024) is scale-dependent (gemeente/wijk/
  // buurt/grid detail by zoom), so one layer covers every zoom level. The
  // year is part of the literal layer name: bump it when a new year is
  // published (WMS has no "latest"). Data is
  // public-domain (RIGO/Atlas voor Gemeenten via the Leefbaarometer
  // program); the tile server itself is operated by Sogelink, a private
  // company, not a government body directly -- named as such in the
  // attribution rather than implying otherwise.
  const LEEFBAAROMETER_WMS_URL = 'https://geo.leefbaarometer.nl/lbm3/ows';
  const LEEFBAAROMETER_LAYER_NAME = 'score24_schaalafhankelijk';

  function renderDynamicMap(lat, lon) {
    const mapEl = el('map-dynamic');
    mapEl.hidden = false;
    if (leafletMap) {
      leafletMap.remove();
      leafletMap = null;
    }
    leafletMap = L.map(mapEl, {
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

    // Off by default (not .addTo'd here) -- the layer control's checkbox
    // adds it only if the user opts in, same mechanism Leaflet already uses
    // for any overlay passed to L.control.layers that isn't pre-added.
    const leefbaarometerLayer = L.tileLayer.wms(LEEFBAAROMETER_WMS_URL, {
      layers: LEEFBAAROMETER_LAYER_NAME,
      format: 'image/png',
      transparent: true,
      version: '1.3.0',
      opacity: 0.7,
      maxZoom: 19,
      attribution: 'Leefbaarometer (RIGO/Atlas voor Gemeenten, CC0) via Sogelink',
    });

    L.control
      .layers(
        null,
        {
          [t('map_layer_control_kadaster')]: kadasterLayer,
          [t('map_layer_control_leefbaarometer')]: leefbaarometerLayer,
        },
        { collapsed: true }
      )
      .addTo(leafletMap);

    // Leaflet needs a layout pass after becoming visible in a freshly-shown
    // container, or tiles can render at the wrong size until the next
    // interaction.
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

  function destroyMap() {
    if (leafletMap) {
      leafletMap.remove();
      leafletMap = null;
    }
  }

  function renderResults(data, addressText, settings) {
    el('status').hidden = true;
    el('results').hidden = false;

    // Hide/tear down whichever map mode isn't being used this render. This
    // only matters for the panel, which persists across opens on the same
    // page (the popup gets a fresh DOM every time), so a mapMode setting
    // change picked up on retry/reopen doesn't leave both the static image
    // and a live Leaflet map visible at once.
    if (settings.mapMode === 'dynamic' && data.lat != null && data.lon != null) {
      el('map-wrap').hidden = true;
      renderDynamicMap(data.lat, data.lon);
    } else {
      el('map-dynamic').hidden = true;
      destroyMap();
      renderStaticMap(data.staticMap);
    }

    renderRows(el('leefomgeving-rows'), data.leefomgeving, settings.scoreDisplay);
    renderRows(el('buurt-rows'), data.buurt, settings.scoreDisplay);

    el('atlas-link').href = buildAtlasUrl(addressText);
    el('leefbaarometer-link').href = buildLeefbaarometerUrl(data.lat, data.lon);
  }

  return { el, applyTheme, setStaticText, showStatus, renderResults, destroyMap };
}
