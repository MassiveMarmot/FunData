import { geocodeAddress } from './lib/pdok.js';
import { rdToPixel, fetchAllLayers } from './lib/wms.js';
import { LEEFOMGEVING_LAYERS, BUURT_LAYERS } from './lib/layers.js';

// Builds a static-map image URL (PDOK WMTS background map tile, RESTful
// KVP-free "resource URL" form, confirmed against PDOK's own
// WMTSCapabilities.xml for this service — note the tile host/path is
// `service.pdok.nl/kadaster/brt-achtergrondkaart/...`, NOT
// `service.pdok.nl/brt/achtergrondkaart/...` as an earlier draft guessed,
// and tile-matrix identifiers are zero-padded two-digit strings ("00".."14"
// for EPSG:28992), not plain numbers.
const TILE_BASE = 'https://service.pdok.nl/kadaster/brt-achtergrondkaart/wmts/v2_0/standaard';

function computeStaticMapTile(rdX, rdY, zoom) {
  const resolutions = [
    3440.64, 1720.32, 860.16, 430.08, 215.04, 107.52, 53.76, 26.88, 13.44,
    6.72, 3.36, 1.68, 0.84, 0.42,
  ];
  const originX = -285401.92;
  const originY = 903401.92;
  const tileSize = 256;
  const res = resolutions[zoom];
  const tileSpan = res * tileSize;
  const col = Math.floor((rdX - originX) / tileSpan);
  const row = Math.floor((originY - rdY) / tileSpan);

  // Exact pixel position of the address within that tile, so the popup can
  // draw a marker instead of just showing an unlabeled, grid-snapped tile
  // (the address is rarely exactly centered in its tile).
  const tileOriginX = originX + col * tileSpan;
  const tileOriginTopY = originY - row * tileSpan;
  const markerX = Math.min(tileSize, Math.max(0, Math.round((rdX - tileOriginX) / res)));
  const markerY = Math.min(tileSize, Math.max(0, Math.round((tileOriginTopY - rdY) / res)));

  const zoomStr = String(zoom).padStart(2, '0');
  const url = `${TILE_BASE}/EPSG:28992/${zoomStr}/${col}/${row}.png`;

  return { url, tileSize, markerX, markerY };
}

async function handleCheckPlek(address) {
  const { rdX, rdY, lat, lon, weergavenaam } = await geocodeAddress(address);
  const pixel = rdToPixel(rdX, rdY);

  const [leefomgevingResults, buurtResults] = await Promise.all([
    fetchAllLayers(LEEFOMGEVING_LAYERS, pixel),
    fetchAllLayers(BUURT_LAYERS, pixel),
  ]);

  const serialize = (results) =>
    results.map(({ layer, raw, error }) => {
      if (error) {
        return { id: layer.id, labelKey: layer.labelKey, noData: true, fetchError: true };
      }
      const parsed = layer.parse(raw);
      return { id: layer.id, labelKey: layer.labelKey, ...parsed };
    });

  return {
    weergavenaam,
    rdX,
    rdY,
    lat,
    lon,
    staticMap: computeStaticMapTile(rdX, rdY, 10),
    leefomgeving: serialize(leefomgevingResults),
    buurt: serialize(buurtResults),
  };
}

browser.runtime.onMessage.addListener((message, sender) => {
  if (!message || message.type !== 'CHECK_PLEK') return undefined;
  // Basic sanity limit on attacker-controlled input length before it's used
  // to build outgoing URLs (see security review notes in README).
  const address = typeof message.address === 'string' ? message.address.slice(0, 200) : '';
  if (!address) {
    return Promise.resolve({ ok: false, code: 'NO_ADDRESS' });
  }
  return handleCheckPlek(address)
    .then((data) => ({ ok: true, data }))
    .catch((err) => ({ ok: false, code: err.code || 'UNKNOWN', message: err.message }));
});
