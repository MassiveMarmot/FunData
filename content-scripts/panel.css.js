// Panel CSS as a JS string, injected into the panel's shadow root as a
// <style> element's textContent (not a <link>). This file is itself
// loaded into the content script via dynamic import(), which -- like any
// other extension resource a content script loads -- requires its path to
// be listed in manifest.json's web_accessible_resources. Shares the same
// theme tokens and table/badge rules as popup/popup.css so the content
// looks identical; adds the slide-in shell, backdrop, and close button
// that only the panel needs.
export const PANEL_CSS = `
:host {
  all: initial;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 13px;
}

:host, .panel {
  --bg: #ffffff;
  --surface: #64c1ed;
  --surface-border: #3fa0d4;
  --text: #1a1a1a;
  --text-on-surface: #0d2733;
  --text-secondary: #55707f;
  --accent: #b35900;
  --border: #eef2f4;
  --row-hover: #f4f9fc;
  --card: #f4f9fc;
  --card-border: #e4ecf1;
  --map-bg: #eee;
}

:host([data-theme="dark"]) .panel {
  --bg: #121417;
  --surface: #17303d;
  --surface-border: #234456;
  --text: #f2f2f2;
  --text-on-surface: #f2f2f2;
  --text-secondary: #9fb3bd;
  --accent: #64c1ed;
  --border: #253038;
  --row-hover: #1a1f24;
  --card: #171c21;
  --card-border: #253038;
  --map-bg: #1a1f24;
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  background: rgba(0, 0, 0, 0.35);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease;
}

:host([data-open="true"]) .backdrop {
  opacity: 1;
  pointer-events: auto;
}

.panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 2147483647;
  width: min(380px, 100vw);
  background: var(--bg);
  color: var(--text);
  box-shadow: -2px 0 16px rgba(0, 0, 0, 0.25);
  transform: translateX(100%);
  transition: transform 0.22s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: none;
}

:host([data-open="true"]) .panel {
  pointer-events: auto;
}

:host([data-open="true"]) .panel {
  transform: translateX(0);
}

@media (prefers-reduced-motion: reduce) {
  .panel, .backdrop {
    transition: none;
  }
}

header {
  padding: 10px 14px;
  background: var(--surface);
  border-bottom: 1px solid var(--surface-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

header h1 {
  margin: 0;
  font-size: 15px;
  color: var(--text-on-surface);
}

.retry-inline {
  background: none;
  border: none;
  padding: 0;
  font-size: 11px;
  text-decoration: underline;
  color: var(--text-on-surface);
  opacity: 0.75;
  cursor: pointer;
}

.retry-inline:hover, .retry-inline:focus-visible {
  opacity: 1;
}

.theme-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.theme-switch input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.theme-switch-track {
  display: inline-block;
  width: 32px;
  height: 18px;
  border-radius: 9px;
  background: rgba(13, 39, 51, 0.25);
  position: relative;
  transition: background 0.15s ease;
}

.theme-switch-icon {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-on-surface);
  opacity: 0.8;
  pointer-events: none;
}

.icon-sun { left: 3px; }
.icon-moon { right: 3px; }

.theme-switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.theme-switch input:checked + .theme-switch-track {
  background: rgba(13, 39, 51, 0.55);
}

.theme-switch input:checked + .theme-switch-track .theme-switch-thumb {
  transform: translateX(14px);
}

.theme-switch input:focus-visible + .theme-switch-track {
  outline: 2px solid var(--text-on-surface);
  outline-offset: 2px;
}

#settings-btn, #fundata-close {
  background: none;
  border: none;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--text-on-surface);
}

#settings-btn:hover, #settings-btn:focus-visible,
#fundata-close:hover, #fundata-close:focus-visible {
  background: rgba(13, 39, 51, 0.12);
}

main {
  padding: 10px 14px 14px;
  overflow-y: auto;
  flex: 1;
}

#status { margin: 10px 0; }

#map-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 10px;
  background: var(--map-bg);
}

#map-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill;
}

#map-pin {
  position: absolute;
  width: 14px;
  height: 14px;
  margin-left: -7px;
  margin-top: -13px;
  border-radius: 50% 50% 50% 0;
  background: #e53935;
  border: 2px solid #fff;
  transform: rotate(-45deg);
  box-shadow: 0 1px 3px rgba(0,0,0,0.4);
}

#map-dynamic {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 10px;
  background: var(--map-bg);
}

/* Collapsible section cards. Native <details>/<summary> keeps the section
   headings keyboard-operable with no extra JS. */
details.card {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  margin: 0 0 8px;
  overflow: hidden;
}

details.card summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  cursor: pointer;
  user-select: none;
  list-style: none;
}

details.card summary::-webkit-details-marker { display: none; }
details.card summary::marker { content: ''; }

summary h2 {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--text-secondary);
  margin: 0;
}

.chevron {
  flex-shrink: 0;
  color: var(--text-secondary);
  transition: transform 0.15s ease;
}

details.card[open] .chevron { transform: rotate(90deg); }

details.card table {
  width: calc(100% - 20px); /* fill the card, keep the 10px side margins */
  margin: 0 10px 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}

/* Rows: a uniform minimum height and a single hairline divider between
   rows. Height on a td acts as a minimum, so wrapped rows still grow. */
td {
  padding: 4px 0;
  vertical-align: middle;
  height: 28px;
}

tr + tr td { border-top: 1px solid var(--border); }

td.label { padding-right: 8px; width: 48%; }

/* Value cells stay real table cells (the 28px td height is a minimum);
   the two-column value/score grid is on a wrapper div inside the cell,
   never on the td itself -- a td with display:grid stops being a
   table-cell box, which turned that height into a hard height and let
   taller content overflow into the rows below. The fixed score column
   keeps values and scores lined up across rows in both score display
   modes (text badges and 19px icons share the same slot). */
td.value { text-align: right; }

/* Text-badge slot: kept at 76px, sized to fit the widest badge
   ("Zeer goed"). TODO: confirm with devtools on a real render -- could
   not be measured in the dev sandbox (no browser available). */
.value-grid {
  display: grid;
  grid-template-columns: minmax(84px, 1fr) 76px;
  column-gap: 6px;
  align-items: center;
}

/* Icon slot: only needs to fit the 19px RIVM icon (24px incl. slack),
   which frees ~52px of width for the value column in emoji mode. */
tbody.score-emoji .value-grid {
  grid-template-columns: minmax(84px, 1fr) 24px;
}

.value-text {
  grid-column: 1;
  justify-self: end;
  /* break-word, not anywhere: words only break when nothing else fits */
  overflow-wrap: break-word;
}

.badge,
.badge-icon {
  grid-column: 2;
  justify-self: center;
}

/* Empty rows show exactly one em-dash in the secondary colour. */
.nodata { color: var(--text-secondary); }

/* Long free-text values (e.g. the hazardous-substances list) get a second,
   full-width row instead of being squeezed into the narrow right-hand
   value column — avoids relying on non-standard display overrides on
   table rows/cells. No divider between the two halves of the pair. */
tr.wrap-label td {
  padding-bottom: 0;
  font-weight: 600;
}

tr.wrap-value td {
  border-top: none;
  padding-top: 2px;
  text-align: left;
  white-space: normal;
  overflow-wrap: anywhere;
}

.badge {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}

.badge-zeer_goed { background: #2e7d32; }
.badge-goed { background: #66bb6a; color: #3a2a00; }
.badge-redelijk { background: #ffb300; color: #3a2a00; }
.badge-matig { background: #fb8c00; color: #3a2a00; }
.badge-slecht { background: #e53935; color: #000000; }
.badge-none { background: #9e9e9e; color: #3a2a00; }

.badge-icon { vertical-align: middle; width: 19px; height: 19px; }

#source-note {
  margin-top: 14px;
  font-size: 11px;
  color: var(--text-secondary);
}

#atlas-link,
#leefbaarometer-link {
  display: block;
  width: fit-content;
  margin-top: 4px;
  font-size: 12px;
  color: var(--accent);
}

:host([data-theme="dark"]) .leaflet-control-layers {
  background: var(--surface);
  color: var(--text);
}

:host([data-theme="dark"]) .leaflet-bar a {
  background: var(--surface);
  color: var(--text);
  border-color: var(--border);
}

/* Visible focus in both themes. Header controls sit on the blue surface,
   content controls on the page background. */
summary:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: -2px;
}

.retry-inline:focus-visible,
#settings-btn:focus-visible,
#fundata-close:focus-visible {
  outline: 2px solid var(--text-on-surface);
  outline-offset: 2px;
}

#atlas-link:focus-visible,
#leefbaarometer-link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .chevron { transition: none; }
}
`;
