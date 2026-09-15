// RIVM's own 5-tier smiley icons (bundled locally under icons/scores/,
// reused directly with permission from the source images — not a redrawn
// approximation). Paths are relative to the extension root; resolve with
// browser.runtime.getURL(...) at the call site, same pattern as the
// Leaflet marker icon fix (see popup.js).
export const SCORE_ICON_PATH = {
  score_zeer_goed: 'icons/scores/emoticon-0-goed.png',
  score_goed: 'icons/scores/emoticon-1-matig.png',
  score_redelijk: 'icons/scores/emoticon-2-neutraal.png',
  score_matig: 'icons/scores/emoticon-3-onvoldoende.png',
  score_slecht: 'icons/scores/emoticon-4-slecht.png',
};
