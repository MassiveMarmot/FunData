// Geocoding via PDOK Locatieserver (public, no API key required).
// https://www.pdok.nl/restful-api/-/article/pdok-locatieserver

const SUGGEST_URL = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest';
const LOOKUP_URL = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup';

/**
 * Resolve a free-text Dutch address to RD (EPSG:28992) coordinates.
 * @param {string} addressText - e.g. "Naarderstraat 71, 1251 BG Laren"
 * @returns {Promise<{rdX: number, rdY: number, weergavenaam: string}>}
 * @throws {Error} with `.code` set to 'NOT_FOUND' or 'NETWORK' for
 *   caller-distinguishable failure modes.
 */
export async function geocodeAddress(addressText) {
  let suggestData;
  try {
    const suggestUrl = `${SUGGEST_URL}?rows=1&fq=type:adres&q=${encodeURIComponent(addressText)}`;
    const res = await fetch(suggestUrl);
    if (!res.ok) throw new Error(`suggest HTTP ${res.status}`);
    suggestData = await res.json();
  } catch (err) {
    const e = new Error('PDOK suggest request failed: ' + err.message);
    e.code = 'NETWORK';
    throw e;
  }

  const doc = suggestData?.response?.docs?.[0];
  if (!doc?.id) {
    const e = new Error('Address not found via PDOK suggest');
    e.code = 'NOT_FOUND';
    throw e;
  }

  let lookupData;
  try {
    const res = await fetch(`${LOOKUP_URL}?id=${encodeURIComponent(doc.id)}`);
    if (!res.ok) throw new Error(`lookup HTTP ${res.status}`);
    lookupData = await res.json();
  } catch (err) {
    const e = new Error('PDOK lookup request failed: ' + err.message);
    e.code = 'NETWORK';
    throw e;
  }

  const record = lookupData?.response?.docs?.[0];
  const rdPoint = record?.centroide_rd; // "POINT(143339.216 475029.844)"
  const llPoint = record?.centroide_ll; // "POINT(5.21639614 52.26317142)" -- lon lat (WGS84)
  if (!rdPoint) {
    const e = new Error('PDOK lookup returned no coordinates');
    e.code = 'NOT_FOUND';
    throw e;
  }

  const rdMatch = /^POINT\(([-\d.]+)\s+([-\d.]+)\)$/.exec(rdPoint.trim());
  if (!rdMatch) {
    const e = new Error('Unexpected centroide_rd format: ' + rdPoint);
    e.code = 'NOT_FOUND';
    throw e;
  }

  let lat = null;
  let lon = null;
  if (llPoint) {
    const llMatch = /^POINT\(([-\d.]+)\s+([-\d.]+)\)$/.exec(llPoint.trim());
    if (llMatch) {
      lon = parseFloat(llMatch[1]);
      lat = parseFloat(llMatch[2]);
    }
  }

  return {
    rdX: parseFloat(rdMatch[1]),
    rdY: parseFloat(rdMatch[2]),
    lat,
    lon,
    weergavenaam: record.weergavenaam || addressText,
  };
}
