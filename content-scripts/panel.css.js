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

section h2 {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--text-secondary);
  margin: 14px 0 4px;
}

table { width: 100%; border-collapse: collapse; }

td {
  padding: 4px 0;
  vertical-align: top;
  border-bottom: 1px solid var(--border);
}

td.label { padding-right: 8px; width: 55%; }

td.value {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  column-gap: 6px;
  row-gap: 2px;
  text-align: right;
}

.value-text { overflow-wrap: anywhere; }

tr.wrap-label td {
  border-bottom: none;
  padding-bottom: 0;
  font-weight: 600;
}

tr.wrap-value td {
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
.badge-goed { background: #66bb6a; }
.badge-redelijk { background: #ffb300; color: #3a2a00; }
.badge-matig { background: #fb8c00; }
.badge-slecht { background: #e53935; }
.badge-none { background: #9e9e9e; }

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
`;
