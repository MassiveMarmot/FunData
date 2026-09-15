// Extracts a Funda listing's address in the format
// "{straat} {huisnummer}, {postcode} {plaats}" needed for PDOK geocoding.
//
// Primary source: the "Bereken reistijd op Google Maps" link present on
// listing pages, which already contains a clean space/plus-separated
// address built by Funda itself, e.g.:
//   https://www.google.nl/maps/place/Naarderstraat+71+1251BG+Laren+(NH)
// This avoids parsing the page's <h1>, which concatenates street+number
// directly against the postcode with no separator (e.g.
// "Naarderstraat 711251 BG Laren (NH)").
//
// Fallback: parse the <h1> using the Dutch postcode pattern as a splitter.
// This is best-effort and more fragile — see README security/QA notes.

const POSTCODE_RE = /(\d{4})\s?([A-Z]{2})\b/;

function extractFromMapsLink() {
  const links = Array.from(document.querySelectorAll('a[href*="google."]'));
  for (const a of links) {
    const href = a.getAttribute('href') || '';
    const m = href.match(/\/maps\/place\/([^/?#]+)/);
    if (!m) continue;
    let raw;
    try {
      raw = decodeURIComponent(m[1].replace(/\+/g, ' '));
    } catch {
      continue; // malformed encoding — skip, fall through to H1 fallback
    }
    const parsed = splitAddressString(raw);
    if (parsed) return parsed;
  }
  return null;
}

function splitAddressString(raw) {
  const pcMatch = raw.match(POSTCODE_RE);
  if (!pcMatch) return null;
  const street = raw.slice(0, pcMatch.index).trim();
  const postcode = `${pcMatch[1]} ${pcMatch[2].toUpperCase()}`;
  let rest = raw.slice(pcMatch.index + pcMatch[0].length).trim();
  // Drop a trailing province abbreviation in parentheses, e.g. "(NH)", and
  // anything after it (Funda sometimes appends unrelated neighbourhood
  // text with no separator in the H1 fallback path).
  rest = rest.replace(/\s*\([^)]*\).*$/, '').trim();
  const city = rest.split(/\s{2,}|\n/)[0].trim(); // first "word chunk" only
  if (!street || !city) return null;
  return { street, postcode, city };
}

function extractFromHeading() {
  const h1 = document.querySelector('h1');
  if (!h1) return null;
  // Use only h1's own direct text, not nested links (e.g. the neighbourhood
  // link Funda places inside/after the address heading).
  const ownText = Array.from(h1.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return splitAddressString(ownText);
}

function isNieuwbouwListing() {
  return /\/detail\/nieuwbouw\//.test(location.pathname);
}

function getAddress() {
  if (isNieuwbouwListing()) {
    return { error: 'NIEUWBOUW' };
  }
  const fromMaps = extractFromMapsLink();
  if (fromMaps) return { address: fromMaps };
  const fromHeading = extractFromHeading();
  if (fromHeading) return { address: fromHeading, lowConfidence: true };
  return { error: 'NOT_FOUND' };
}

browser.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== 'GET_ADDRESS') return undefined;
  return Promise.resolve(getAddress());
});
