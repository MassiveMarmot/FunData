// Fetches and parses RIVM/Sogelink WMS GetFeatureInfo (INFO_FORMAT=text/plain)
// responses. Response bodies look like:
//   GRAY_INDEX = 38.0
// or (no feature at that point):
//   (empty body, or a body without the expected field)

/**
 * Compute the WMS pixel coordinates for a given RD (EPSG:28992) point,
 * using the fixed nationwide BBOX that RIVM's own tool uses
 * (BBOX=0,300000,300000,650000 at 1 pixel = 1 metre).
 */
export function rdToPixel(rdX, rdY) {
  // RIVM's own code truncates (parseInt) rather than rounds when converting
  // RD coordinates to pixel indices. Confirmed against a real captured
  // example: rdY=475029.844 -> j=174971, which only matches with truncation
  // (650000 - trunc(475029.844) = 174971); Math.round would give 174970.
  return {
    i: Math.trunc(rdX),
    j: 650000 - Math.trunc(rdY),
  };
}

/**
 * Fetch a single layer's value for the given pixel coordinates.
 * @param {object} layer - an entry from lib/layers.js
 * @param {{i: number, j: number}} pixel
 * @returns {Promise<string|null>} the raw field value as a string, or null
 *   if the field wasn't present in the response (treated as "no data").
 */
export async function fetchLayerRaw(layer, pixel) {
  const url = layer.urlTemplate.replace('{I}', pixel.i).replace('{J}', pixel.j);
  const res = await fetch(url);
  if (!res.ok) {
    const e = new Error(`WMS request failed for layer ${layer.id}: HTTP ${res.status}`);
    e.code = 'NETWORK';
    e.layerId = layer.id;
    throw e;
  }
  const text = await res.text();
  return parseFieldFromPlainText(text, layer.field);
}

function parseFieldFromPlainText(text, fieldName) {
  const lines = text.split(/\r\n|\r|\n/);
  const prefix = `${fieldName} = `;
  for (const line of lines) {
    if (line.startsWith(prefix)) {
      return line.slice(prefix.length).trim();
    }
  }
  return null;
}

/**
 * Fetch all layers concurrently. Never rejects as a whole — per-layer
 * failures are captured individually so one bad layer doesn't blank out
 * the rest of the popup.
 * @returns {Promise<Array<{layer: object, raw: string|null, error: Error|null}>>}
 */
export async function fetchAllLayers(layers, pixel) {
  return Promise.all(
    layers.map(async (layer) => {
      try {
        const raw = await fetchLayerRaw(layer, pixel);
        return { layer, raw, error: null };
      } catch (error) {
        return { layer, raw: null, error };
      }
    })
  );
}
