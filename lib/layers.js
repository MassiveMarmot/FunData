// Layer definitions for the "Leefomgevingskwaliteit" and "Buurtinformatie"
// sections of RIVM's Check je Plek tool.
//
// IMPORTANT: the field names, WMS layer names, and every numeric threshold
// below were transcribed directly from RIVM's own client-side source
// (https://data.rivm.nl/geo/apps/check-je-plek/js/check-je-plek.js, v2.1AL,
// fetched 2026-09-12). They are copied deliberately, not re-derived, to stay
// faithful to RIVM's own classification. If RIVM changes their tool, this
// file will silently go stale until someone re-diffs it against the source.
//
// Each layer's `parse(rawValue)` returns:
//   { noData: boolean, displayKey, displayArgs, scoreKey (or null) }
// `displayKey`/`scoreKey` are i18n message keys resolved by popup.js.

const WMS_COMMON = {
  version: '1.3.0',
  bbox: '0,300000,300000,650000',
  width: 300000,
  height: 350000,
  crs: 'EPSG:28992',
};

// Generic threshold matcher. `rules` is an ordered list of
// [scoreKey, minInclusive, maxExclusive] (Infinity/-Infinity allowed).
// Returns the scoreKey of the first matching rule, or null if none match.
function matchThreshold(value, rules) {
  for (const [scoreKey, min, max] of rules) {
    if (value >= min && value < max) return scoreKey;
  }
  return null;
}

const SCORE = {
  ZEER_GOED: 'score_zeer_goed',
  GOED: 'score_goed',
  REDELIJK: 'score_redelijk',
  MATIG: 'score_matig',
  SLECHT: 'score_slecht',
};

function wmsUrl(host, layerName, extra = '') {
  return (
    `${host}?SERVICE=WMS&VERSION=${WMS_COMMON.version}&REQUEST=GetFeatureInfo` +
    `&LAYERS=${encodeURIComponent(layerName)}&QUERY_LAYERS=${encodeURIComponent(layerName)}` +
    `&BBOX=${WMS_COMMON.bbox}&WIDTH=${WMS_COMMON.width}&HEIGHT=${WMS_COMMON.height}` +
    `&FEATURE_COUNT=1&INFO_FORMAT=text/plain&CRS=${WMS_COMMON.crs}` +
    `&i={I}&j={J}${extra}`
  );
}

export const LEEFOMGEVING_LAYERS = [
  {
    id: 'pm25',
    labelKey: 'label_pm25',
    urlTemplate: wmsUrl('https://data.rivm.nl/geo/alo/wms', 'rivm_jaargemiddeld_PM25_actueel'),
    field: 'GRAY_INDEX',
    parse(raw) {
      const v = parseFloat(raw);
      if (!Number.isFinite(v) || v > 100) return { noData: true };
      const scoreKey = matchThreshold(v, [
        [SCORE.GOED, -Infinity, 5],
        [SCORE.REDELIJK, 5, 10],
        [SCORE.MATIG, 10, 25],
        [SCORE.SLECHT, 25, Infinity],
      ]);
      return { noData: false, value: Math.floor(v), unitKey: null, raw: v, scoreKey, kind: 'pm25' };
    },
  },
  {
    id: 'no2',
    labelKey: 'label_no2',
    urlTemplate: wmsUrl('https://data.rivm.nl/geo/alo/wms', 'rivm_jaargemiddeld_NO2_actueel'),
    field: 'GRAY_INDEX',
    parse(raw) {
      const v = parseFloat(raw);
      if (!Number.isFinite(v) || v > 100) return { noData: true };
      const scoreKey = matchThreshold(v, [
        [SCORE.GOED, -Infinity, 10],
        [SCORE.REDELIJK, 10, 20],
        [SCORE.MATIG, 20, 30],
        [SCORE.SLECHT, 30, Infinity],
      ]);
      return { noData: false, value: Math.floor(v), raw: v, scoreKey, kind: 'no2' };
    },
  },
  {
    id: 'geluid',
    labelKey: 'label_geluid',
    urlTemplate: wmsUrl('https://data.rivm.nl/geo/alo/wms', 'rivm_Geluid_lden_allebronnen_actueel'),
    field: 'GRAY_INDEX',
    parse(raw) {
      const v = parseFloat(raw);
      if (!Number.isFinite(v) || v === 128) return { noData: true };
      const scoreKey = matchThreshold(v, [
        [SCORE.ZEER_GOED, -Infinity, 46],
        [SCORE.GOED, 46, 51],
        [SCORE.REDELIJK, 51, 56],
        [SCORE.MATIG, 56, 61],
        [SCORE.SLECHT, 61, Infinity],
      ]);
      return { noData: false, raw: v, scoreKey, kind: 'geluid' };
    },
  },
  {
    id: 'hitte',
    labelKey: 'label_hitte',
    urlTemplate: wmsUrl('https://data.rivm.nl/geo/ank/wms', 'Stedelijk_hitte_eiland_effect_01062022_v2'),
    field: 'GRAY_INDEX',
    parse(raw) {
      const v = parseFloat(raw);
      if (!Number.isFinite(v) || v < 0) return { noData: true };
      const scoreKey = matchThreshold(v, [
        [SCORE.ZEER_GOED, -Infinity, 0.5],
        [SCORE.GOED, 0.5, 1],
        [SCORE.REDELIJK, 1, 1.5],
        [SCORE.MATIG, 1.5, 2],
        [SCORE.SLECHT, 2, Infinity],
      ]);
      return { noData: false, raw: v, scoreKey, kind: 'hitte' };
    },
  },
  {
    id: 'bomen',
    labelKey: 'label_bomen',
    urlTemplate: wmsUrl('https://data.rivm.nl/geo/alo/wms', 'bomenkaart_cjp_2022_500m'),
    field: 'GRAY_INDEX',
    parse(raw) {
      const v = parseFloat(raw);
      if (!Number.isFinite(v)) return { noData: true };
      // Source uses an exact "=0" test for the worst tier, distinct from the
      // ">0:<5" range for the next tier up — handle the v===0 case explicitly
      // rather than folding it into the generic range matcher.
      let scoreKey;
      if (v === 0) scoreKey = SCORE.SLECHT;
      else {
        scoreKey = matchThreshold(v, [
          [SCORE.ZEER_GOED, 15, Infinity],
          [SCORE.GOED, 10, 15],
          [SCORE.REDELIJK, 5, 10],
          [SCORE.MATIG, 0, 5],
        ]);
      }
      return { noData: false, raw: v, scoreKey, kind: 'percentSurface' };
    },
  },
  {
    id: 'groen',
    labelKey: 'label_groen',
    urlTemplate: wmsUrl('https://data.rivm.nl/geo/alo/wms', 'groenkaart_cjp_2022_500m'),
    field: 'GRAY_INDEX',
    parse(raw) {
      const v = parseFloat(raw);
      if (!Number.isFinite(v) || Math.floor(v) <= -1) return { noData: true };
      const scoreKey = matchThreshold(v, [
        [SCORE.ZEER_GOED, 60, Infinity],
        [SCORE.GOED, 50, 60],
        [SCORE.REDELIJK, 40, 50],
        [SCORE.MATIG, 30, 40],
        [SCORE.SLECHT, -Infinity, 30],
      ]);
      return { noData: false, raw: v, scoreKey, kind: 'percentSurface' };
    },
  },
  {
    id: 'overstroming',
    labelKey: 'label_overstroming',
    // NOTE: RIVM repointed this layer to a third-party host (not data.rivm.nl).
    // Different host, same GetFeatureInfo contract as far as we've observed.
    urlTemplate: wmsUrl(
      'https://cas.cloud.sogelink.com/public/data/org/gws/YWFMLMWERURF/kea_public/wms',
      'plaatsgebonden_overstromingskans_huidig_0_cm_20251120'
    ),
    field: 'GRAY_INDEX',
    parse(raw) {
      const v = Math.round(parseFloat(raw));
      const table = {
        0: { scoreKey: SCORE.ZEER_GOED, labelKey: 'overstroming_0' },
        1: { scoreKey: SCORE.ZEER_GOED, labelKey: 'overstroming_1' },
        2: { scoreKey: SCORE.GOED, labelKey: 'overstroming_2' },
        3: { scoreKey: SCORE.REDELIJK, labelKey: 'overstroming_3' },
        4: { scoreKey: SCORE.MATIG, labelKey: 'overstroming_4' },
        5: { scoreKey: SCORE.SLECHT, labelKey: 'overstroming_5' },
      };
      const entry = table[v];
      if (!entry) return { noData: true };
      return { noData: false, scoreKey: entry.scoreKey, kind: 'overstroming', overstromingLabelKey: entry.labelKey };
    },
  },
  {
    id: 'donker',
    labelKey: 'label_donker',
    urlTemplate: wmsUrl('https://data.rivm.nl/geo/dmg/wms', "dmg:licht_20150315_gm_hhnachtonbew"),
    field: 'GRAY_INDEX',
    parse(raw) {
      const v = parseFloat(raw);
      if (!Number.isFinite(v) || v < 0) return { noData: true };
      const aantal = Math.round(Math.pow(10, -0.9518 * Math.log10(v) + 2.8699));
      const scoreKey = matchThreshold(aantal, [
        [SCORE.ZEER_GOED, 800, Infinity],
        [SCORE.GOED, 400, 800],
        [SCORE.REDELIJK, 200, 400],
        [SCORE.MATIG, 100, 200],
        [SCORE.SLECHT, -Infinity, 100],
      ]);
      return { noData: false, value: aantal > 2000 ? '> 2000' : aantal, scoreKey, kind: 'stars' };
    },
  },
  {
    id: 'activiteiten',
    labelKey: 'label_activiteiten',
    urlTemplate: wmsUrl('https://data.rivm.nl/geo/alo/wms', 'alo:rivm_rev_activiteit_1km_20240501'),
    field: 'activiteit',
    parse(raw) {
      if (!raw || raw.trim() === '') return { noData: false, kind: 'freeTextOrNone', text: null };
      return { noData: false, kind: 'freeTextOrNone', text: raw.trim() };
    },
  },
];

export const BUURT_LAYERS = [
  {
    id: 'woz',
    labelKey: 'label_woz',
    urlTemplate: wmsUrl('https://data.rivm.nl/geo/alo/wms', 'cbs_woz_2023'),
    field: 'GRAY_INDEX',
    parse(raw) {
      const v = parseFloat(raw);
      if (!Number.isFinite(v) || v < 0) return { noData: true };
      return { noData: false, kind: 'euroThousands', raw: v, scoreKey: null };
    },
  },
  {
    id: 'stedelijkheid',
    labelKey: 'label_stedelijkheid',
    urlTemplate: wmsUrl('https://data.rivm.nl/geo/alo/wms', '20231201_stedelijkheid_2022'),
    field: 'GRAY_INDEX',
    parse(raw) {
      const v = Math.round(parseFloat(raw));
      const key = { 1: 'stedelijkheid_1', 2: 'stedelijkheid_2', 3: 'stedelijkheid_3', 4: 'stedelijkheid_4', 5: 'stedelijkheid_5' }[v];
      if (!key) return { noData: true };
      return { noData: false, kind: 'categorical', categoryKey: key, scoreKey: null };
    },
  },
  distanceLayer('huisarts', 'label_huisarts', '20231201_huisarts_2021'),
  distanceLayer('kdv', 'label_kdv', '20231201_kdv_2021'),
  distanceLayer('basisschool', 'label_basisschool', '20231201_basisschool_2021'),
  distanceLayer('supermarkt', 'label_supermarkt', '20231201_supermarkt_2021'),
  {
    id: 'sport',
    labelKey: 'label_sport',
    urlTemplate: wmsUrl('https://data.rivm.nl/geo/alo/wms', 'mulier_20250502_kbo_buurt'),
    field: 'totaal_kbo',
    parse(raw) {
      const v = parseFloat(raw);
      if (!Number.isFinite(v)) return { noData: true };
      const scoreKey = matchThreshold(v, [
        [SCORE.ZEER_GOED, 80, Infinity],
        [SCORE.GOED, 60, 80],
        [SCORE.REDELIJK, 40, 60],
        [SCORE.MATIG, 20, 40],
        [SCORE.SLECHT, -Infinity, 20],
      ]);
      return { noData: false, kind: 'scoreWordOnly', scoreKey };
    },
  },
  distanceLayerMeters('ov_rail', 'label_ov_rail', '20231201_afst_ov_rail_cjp', [
    [SCORE.ZEER_GOED, -Infinity, 1000],
    [SCORE.GOED, 1000, 2000],
    [SCORE.REDELIJK, 2000, 4000.0000001], // '<=4000' in source
    [SCORE.MATIG, 4000.0000001, 8000],
    [SCORE.SLECHT, 8000, Infinity],
  ]),
  distanceLayerMeters('bus', 'label_bus', '20231201_afst_bus_cjp', [
    [SCORE.ZEER_GOED, -Infinity, 500],
    [SCORE.GOED, 500, 1000],
    [SCORE.REDELIJK, 1000, 2000],
    [SCORE.MATIG, 2000, 4000],
    [SCORE.SLECHT, 4000, Infinity],
  ]),
  {
    id: 'hoofdweg',
    labelKey: 'label_hoofdweg',
    urlTemplate: wmsUrl('https://data.rivm.nl/geo/alo/wms', '20221201_afst_hoofdweg_cjp'),
    field: 'GRAY_INDEX',
    parse(raw) {
      const v = parseFloat(raw);
      if (!Number.isFinite(v) || v >= 65535) return { noData: true };
      const scoreKey = matchThreshold(v, [
        [SCORE.ZEER_GOED, -Infinity, 500],
        [SCORE.GOED, 500, 1000],
        [SCORE.REDELIJK, 1000, 2000],
        [SCORE.MATIG, 2000, 4000],
        [SCORE.SLECHT, 4000, Infinity],
      ]);
      return { noData: false, kind: 'metersToKm', raw: v, scoreKey };
    },
  },
];

// Distance layers sharing the standard km-based thresholds (huisarts/kdv/basisschool/supermarkt).
function distanceLayer(id, labelKey, wmsLayerName) {
  return {
    id,
    labelKey,
    urlTemplate: wmsUrl('https://data.rivm.nl/geo/alo/wms', wmsLayerName),
    field: 'GRAY_INDEX',
    parse(raw) {
      const v = parseFloat(raw);
      if (!Number.isFinite(v) || v < 0) return { noData: true };
      const scoreKey = matchThreshold(v, [
        [SCORE.ZEER_GOED, 0, 0.5],
        [SCORE.GOED, 0.5, 1],
        [SCORE.REDELIJK, 1, 2.5],
        [SCORE.MATIG, 2.5, 5],
        [SCORE.SLECHT, 5, Infinity],
      ]);
      return { noData: false, kind: 'km', raw: v, scoreKey };
    },
  };
}

// Distance layers whose raw value is in meters and need custom thresholds (ov_rail/bus).
function distanceLayerMeters(id, labelKey, wmsLayerName, thresholdRules) {
  return {
    id,
    labelKey,
    urlTemplate: wmsUrl('https://data.rivm.nl/geo/alo/wms', wmsLayerName),
    field: 'GRAY_INDEX',
    parse(raw) {
      const v = parseFloat(raw);
      if (!Number.isFinite(v) || v < 0) return { noData: true };
      const scoreKey = matchThreshold(v, thresholdRules);
      return { noData: false, kind: 'metersToKm', raw: v, scoreKey };
    },
  };
}

export const ALL_LAYERS = [...LEEFOMGEVING_LAYERS, ...BUURT_LAYERS];
