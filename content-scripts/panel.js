// Injects a "FunData" trigger button next to Funda's own "Kaart" link and,
// on click, slides in an in-page panel showing the exact same content as
// the popup (shared render pipeline in lib/render-pipeline.js). Classic
// script (content scripts can't be declared as ES modules in the
// manifest), so shared ES modules are loaded via dynamic import() of their
// moz-extension:// URL. Any extension resource a content script loads --
// fetch(), dynamic import(), <img src>, CSS url() -- must be listed in
// manifest.json's web_accessible_resources (Firefox bug 1783078, enforced
// since Firefox 105); there's no exemption for script-initiated loads.
// Runs after funda.js and leaflet.js in the same content-script world, so
// getAddress() and the global Leaflet `L` are already available.

(function () {
  const TRIGGER_ID = 'fundata-trigger';
  const ANCHOR_SELECTOR = '#about a[data-optimizely="map-link"]';

  // Trigger button styling, isolated in its own shadow root so Funda's page
  // CSS can't collapse/hide it (and our reset can't leak into the page).
  // Matches the exact footprint of Funda's own "Kaart" action block (a flex
  // sibling in the same row) so we don't change that row's reserved height:
  // a 60px/68px(md) rounded icon box + gap-2 + label, same link blue
  // (#0071b3, confirmed from Kaart's computed color). Border color on the
  // icon box (#e2e2e2) is an approximation of Funda's neutral-20 -- give me
  // the exact hex via devtools if it needs to match precisely.
  const TRIGGER_CSS = `
    :host { all: initial; display: block; }
    .fundata-trigger-btn {
      all: initial;
      font-family: var(--fd-font-family, system-ui, -apple-system, "Segoe UI", sans-serif);
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--fd-color, #0071b3);
      font-size: var(--fd-font-size, 13px);
      font-weight: var(--fd-font-weight, 500);
      line-height: var(--fd-line-height, 1.2);
      letter-spacing: var(--fd-letter-spacing, normal);
      cursor: pointer;
      white-space: nowrap;
      text-align: center;
      transition: color 0.2s ease;
    }
    .fundata-trigger-btn:hover, .fundata-trigger-btn:focus-visible {
      color: #00578c;
    }
    .fundata-trigger-icon-box {
      box-sizing: border-box; /* border was adding 2px to the 60/68px footprint */
      width: 3.75rem;
      height: 3.75rem;
      overflow: hidden;
      border-radius: 0.375rem;
      border: 1px solid #e2e2e2;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    @media (min-width: 768px) {
      .fundata-trigger-icon-box { width: 4.25rem; height: 4.25rem; }
    }
    .fundata-trigger-icon { width: 100%; height: 100%; object-fit: cover; display: block; }
  `;

  // Modules/settings/messages loaded once and reused across opens.
  let modulesPromise = null;
  // In-memory cache only, scoped to this page instance -- never written to
  // browser.storage. Cleared automatically on navigation since the whole
  // content script is torn down and re-run.
  let cachedResult = null; // { addressText, data }
  let panel = null; // { host, shadow, renderer, els }
  let lastFocused = null;
  let prevOverflow = ''; // Funda's own inline overflow on <html>, restored on close

  function isNieuwbouw() {
    return /\/detail\/nieuwbouw\//.test(location.pathname);
  }

  // Converts a fetched blob to a data: URI instead of an object URL (blob:
  // URLs carry origin/principal tracking tied to how they were fetched,
  // which can conflict when the bytes came from a moz-extension:// fetch
  // but the URL is then set on an <img>/CSS url() elsewhere -- Firefox
  // rejects that with "Content at moz-extension://... may not load data
  // from blob:https://...". data: URIs are self-contained with no origin
  // at all, so they sidestep that class of error entirely.
  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  // --- Trigger injection -----------------------------------------------

  // Fetched independently of loadModules() (icon load shouldn't wait behind
  // the panel's own heavier asset fetches -- RIVM icons, leaflet.css --
  // which the trigger doesn't need).
  let triggerIconPromise = null;
  function getTriggerIconUrl() {
    if (triggerIconPromise) return triggerIconPromise;
    triggerIconPromise = (async () => {
      try {
        const res = await fetch(browser.runtime.getURL('icons/icon-128.png'));
        const blob = await res.blob();
        return await blobToDataURL(blob);
      } catch {
        return null; // falls back to the text-only label
      }
    })();
    return triggerIconPromise;
  }

  function insertTrigger() {
    if (isNieuwbouw()) return;
    if (document.getElementById(TRIGGER_ID)) return; // idempotent
    const anchor = document.querySelector(ANCHOR_SELECTOR);
    if (!anchor) return;

    // Shadow-hosted, same reasoning as the panel: keeps our button immune
    // to Funda's own CSS (and vice versa) rather than fighting inherited
    // styles with !important overrides.
    const host = document.createElement('div');
    host.id = TRIGGER_ID;
    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = TRIGGER_CSS;
    shadow.appendChild(style);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fundata-trigger-btn';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'fundata-panel');
    btn.addEventListener('click', onTriggerClick);

    // The icon box's fixed footprint (matching Kaart's) is present from
    // this very first synchronous insert, before the icon image itself has
    // even loaded -- so there's no later layout shift once it arrives.
    const iconBox = document.createElement('div');
    iconBox.className = 'fundata-trigger-icon-box';
    btn.appendChild(iconBox);

    const label = document.createElement('span');
    label.className = 'fundata-trigger-label';
    label.textContent = 'FunData'; // product name stays untranslated, same as elsewhere
    btn.appendChild(label);

    shadow.appendChild(btn);
    // Copy Kaart's own computed label typography so ours can't drift from it.
    try {
      const walker = document.createTreeWalker(anchor, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => (n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
      });
      const textNode = walker.nextNode();
      const cs = getComputedStyle(textNode ? textNode.parentElement : anchor);
      host.style.setProperty('--fd-font-family', cs.fontFamily);
      host.style.setProperty('--fd-font-size', cs.fontSize);
      host.style.setProperty('--fd-font-weight', cs.fontWeight);
      host.style.setProperty('--fd-line-height', cs.lineHeight);
      host.style.setProperty('--fd-letter-spacing', cs.letterSpacing);
      host.style.setProperty('--fd-color', cs.color);
    } catch {
      // keep the hardcoded fallbacks in TRIGGER_CSS
    }
    anchor.insertAdjacentElement('afterend', host);

    // The anchor's parent is a real 2-column CSS Grid (1fr auto); without
    // this our host is an unaccounted-for 3rd item and wraps to a new row.
    // Extend the grid rather than reparenting Funda's Vue-managed anchor.
    const gridParent = host.parentElement;
    if (gridParent && getComputedStyle(gridParent).display.includes('grid')) {
      gridParent.style.gridTemplateColumns = '1fr auto auto';
      host.style.gridColumn = '3';
      host.style.gridRow = '1';
    }

    getTriggerIconUrl().then((iconUrl) => {
      if (!iconUrl) return;
      const img = document.createElement('img');
      img.src = iconUrl;
      img.alt = '';
      img.className = 'fundata-trigger-icon';
      iconBox.appendChild(img);
    });

    loadModules().then(({ messages }) => {
      btn.setAttribute('aria-label', messages['panel_open_label'] || 'Open FunData panel');
    });
  }

  function startObserving() {
    // Deliberately body-scoped rather than tracking one specific #about
    // node: Funda's Nuxt router can tear down and rebuild that whole
    // subtree wholesale (e.g. returning from the photo-gallery overlay via
    // its close button), which orphans an observer bound to the old node --
    // it goes silently stale even though a fresh #about exists elsewhere in
    // the tree. insertTrigger() re-queries the anchor fresh and checks
    // idempotency via getElementById each time, so simply re-attempting it
    // on every mutation self-heals regardless of how much got replaced.
    const observer = new MutationObserver(() => insertTrigger());
    observer.observe(document.body, { childList: true, subtree: true });
    insertTrigger(); // attempt immediately in case #about is already present
    window.addEventListener('pagehide', () => observer.disconnect());
  }

  // --- Shared modules + assets (loaded once, cached) --------------------

  async function loadModules() {
    if (modulesPromise) return modulesPromise;
    modulesPromise = (async () => {
      const base = browser.runtime.getURL('');
      const [renderPipeline, settingsMod, i18nMod, emojiMod, cssMod] = await Promise.all([
        import(base + 'lib/render-pipeline.js'),
        import(base + 'lib/settings.js'),
        import(base + 'lib/i18n.js'),
        import(base + 'lib/emoji.js'),
        import(base + 'content-scripts/panel.css.js'),
      ]);
      const settings = await settingsMod.getSettings();
      const messages = await i18nMod.loadTranslations(settingsMod.resolveLanguage(settings.language));

      // Pre-fetch the RIVM score icons as data URIs (rather than pointing
      // page-visible <img> elements straight at their moz-extension:// URL)
      // so the raw extension URL is never present in the rendered DOM --
      // the underlying path still needs to be listed in
      // web_accessible_resources for this first fetch to succeed at all.
      const iconCache = new Map();
      await Promise.all(
        Object.values(emojiMod.SCORE_ICON_PATH).map(async (path) => {
          try {
            const res = await fetch(browser.runtime.getURL(path));
            const blob = await res.blob();
            iconCache.set(path, await blobToDataURL(blob));
          } catch {
            // Falls back to the direct URL in resolveAssetUrl below; if
            // that also fails to load, the row just shows without a badge.
          }
        })
      );

      // leaflet.css itself references a couple of PNGs (the collapsed
      // layers-control toggle icon) via relative url(images/...). Injected
      // as inline <style> text those would resolve against the *Funda*
      // page's URL, not the extension's. Fetch those two and rewrite the
      // CSS text to point at data URIs so no moz-extension:// URL ends up
      // in a page-rendered background-image -- the marker icon reference in
      // this file is unused (buildMarkerIcon above uses an inline SVG
      // divIcon instead), so it's left alone.
      const leafletCssRes = await fetch(browser.runtime.getURL('lib/vendor/leaflet/leaflet.css'));
      let leafletCssText = await leafletCssRes.text();
      for (const name of ['layers.png', 'layers-2x.png']) {
        try {
          const res = await fetch(browser.runtime.getURL(`lib/vendor/leaflet/images/${name}`));
          const blob = await res.blob();
          const dataUrl = await blobToDataURL(blob);
          leafletCssText = leafletCssText.split(`images/${name}`).join(dataUrl);
        } catch {
          // Worst case the collapsed layer-control icon is blank; the
          // control remains clickable either way.
        }
      }

      // The trigger button's icon is fetched independently (see
      // getTriggerIconUrl above) so its display doesn't wait behind these
      // heavier, panel-only fetches.

      return {
        renderPipeline,
        settingsMod,
        messages,
        // Never fall back to a raw moz-extension:// URL: it embeds a per-profile
        // UUID that would then be readable by (and trackable from) Funda's page.
        resolveAssetUrl: (path) => iconCache.get(path) || 'data:,',
        leafletCssText,
        panelCss: cssMod.PANEL_CSS,
      };
    })();
    return modulesPromise;
  }

  // Leaflet's default marker (PNG images) would need
  // web_accessible_resources in this page-injected context -- an inline SVG
  // divIcon needs no extension resource at all, sidestepping that.
  function buildDivMarkerIcon() {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="34" viewBox="0 0 25 34">' +
      '<path d="M12.5 0C5.6 0 0 5.6 0 12.5 0 21.9 12.5 34 12.5 34S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z" fill="#e53935" stroke="#fff" stroke-width="2"/>' +
      '<circle cx="12.5" cy="12.5" r="5" fill="#fff"/>' +
      '</svg>';
    return L.divIcon({
      html: svg,
      className: 'fundata-marker',
      iconSize: [25, 34],
      iconAnchor: [12, 33],
    });
  }

  // --- Panel construction -------------------------------------------------

  function buildPanelMarkup() {
    return `
      <div class="backdrop"></div>
      <div id="fundata-panel" class="panel" role="dialog" aria-modal="true" aria-labelledby="popup-title" tabindex="-1">
        <header>
          <div class="header-left">
            <h1 id="popup-title"></h1>
            <button id="retry-btn" class="retry-inline" hidden></button>
          </div>
          <div class="header-right">
            <label id="theme-toggle-label" class="theme-switch" aria-label="">
              <input type="checkbox" id="theme-toggle">
              <span class="theme-switch-track" aria-hidden="true">
                <svg class="theme-switch-icon icon-sun" viewBox="0 0 24 24" width="11" height="11"><circle cx="12" cy="12" r="5" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/></g></svg>
                <svg class="theme-switch-icon icon-moon" viewBox="0 0 24 24" width="10" height="10"><path fill="currentColor" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
                <span class="theme-switch-thumb"></span>
              </span>
            </label>
            <button id="settings-btn" type="button" aria-label=""></button>
            <button id="fundata-close" type="button" aria-label=""></button>
          </div>
        </header>
        <main id="content">
          <p id="status" role="status"></p>
          <div id="results" hidden>
            <div id="map-wrap" hidden><img id="map-img" alt=""><div id="map-pin" aria-hidden="true"></div></div>
            <div id="map-dynamic" hidden></div>
            <section id="section-leefomgeving"><h2></h2><table><tbody id="leefomgeving-rows"></tbody></table></section>
            <section id="section-buurt"><h2></h2><table><tbody id="buurt-rows"></tbody></table></section>
            <p id="source-note"></p>
            <a id="atlas-link" href="#" target="_blank" rel="noopener noreferrer"></a>
            <a id="leefbaarometer-link" href="#" target="_blank" rel="noopener noreferrer"></a>
          </div>
        </main>
      </div>
    `;
  }

  async function ensurePanel() {
    if (panel) {
      // Same class of risk as the trigger: if Funda's router ever detaches
      // this host during a subtree rebuild, re-attach it rather than
      // silently rendering into an orphaned node.
      if (!panel.host.isConnected) document.body.appendChild(panel.host);
      return panel;
    }
    const mods = await loadModules();

    const host = document.createElement('div');
    host.id = 'fundata-panel-host';
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' }); // CSS encapsulation only, not a security boundary

    const style = document.createElement('style');
    style.textContent = mods.panelCss + '\n' + mods.leafletCssText;
    shadow.appendChild(style);

    // Static template (no network-derived text), parsed with DOMParser
    // rather than innerHTML so no first-party code assigns innerHTML.
    const parsed = new DOMParser().parseFromString(buildPanelMarkup(), 'text/html');
    const wrapper = document.createElement('div');
    for (const node of Array.from(parsed.body.childNodes)) {
      wrapper.appendChild(document.importNode(node, true));
    }
    shadow.appendChild(wrapper);

    const t = (key, ...args) => {
      let msg = mods.messages[key] || key;
      args.forEach((arg, i) => {
        msg = msg.replace(new RegExp(`\\{${i}\\}`, 'g'), String(arg));
      });
      return msg;
    };

    const renderer = mods.renderPipeline.createRenderer({
      root: shadow,
      t,
      themeTarget: host,
      doc: document, // the real page document panel.js shares as a classic content script -- not render-pipeline.js's own dynamic-import realm
      buildMarkerIcon: buildDivMarkerIcon,
      resolveAssetUrl: mods.resolveAssetUrl,
    });

    const settingsMod = mods.settingsMod;
    const closeBtn = shadow.getElementById('fundata-close');
    const settingsBtn = shadow.getElementById('settings-btn');
    const retryBtn = shadow.getElementById('retry-btn');
    const themeToggle = shadow.getElementById('theme-toggle');
    const backdrop = shadow.querySelector('.backdrop');
    const dialog = shadow.getElementById('fundata-panel');

    closeBtn.textContent = '\u00d7';
    closeBtn.setAttribute('aria-label', t('panel_close_label'));
    settingsBtn.textContent = '\u2699';
    backdrop.addEventListener('click', closePanel);
    closeBtn.addEventListener('click', closePanel);
    settingsBtn.addEventListener('click', () => browser.runtime.sendMessage({ type: 'OPEN_OPTIONS' }));
    retryBtn.addEventListener('click', () => loadAndRender({ forceRefetch: true }));
    themeToggle.addEventListener('change', async (e) => {
      const newTheme = e.target.checked ? 'dark' : 'light';
      renderer.applyTheme(newTheme);
      await settingsMod.setSetting('theme', newTheme);
    });

    shadow.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closePanel();
        return;
      }
      if (e.key === 'Tab') trapFocus(e, dialog);
    });

    panel = { host, shadow, renderer, t, settingsMod, dialog };
    return panel;
  }

  function trapFocus(e, dialog) {
    const focusable = dialog.querySelectorAll(
      'button:not([hidden]):not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    // Inside a shadow root document.activeElement is the host, so ask the
    // dialog's own root for the focused element.
    const active = dialog.getRootNode().activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // --- Open / close -------------------------------------------------------

  function getTriggerButton() {
    const host = document.getElementById(TRIGGER_ID);
    return host?.shadowRoot?.querySelector('.fundata-trigger-btn') || null;
  }

  function isPanelOpen() {
    return !!panel?.host.hasAttribute('data-open');
  }

  function togglePanel() {
    return isPanelOpen() ? closePanel() : onTriggerClick();
  }

  // Toolbar-button toggle (background.js sends this when toolbarMode is 'panel').
  browser.runtime.onMessage.addListener((message) => {
    if (message?.type !== 'TOGGLE_PANEL') return undefined;
    togglePanel();
    return Promise.resolve({ ok: true });
  });

  async function onTriggerClick() {
    const trigger = getTriggerButton();
    lastFocused = document.activeElement;
    const p = await ensurePanel();
    p.host.setAttribute('data-open', 'true');
    if (!isPanelOpen()) prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden'; // background scroll lock
    trigger?.setAttribute('aria-expanded', 'true');
    p.dialog.focus?.();
    loadAndRender({});
  }

  function closePanel() {
    if (!panel) return;
    panel.host.removeAttribute('data-open');
    document.documentElement.style.overflow = prevOverflow;
    const trigger = getTriggerButton();
    trigger?.setAttribute('aria-expanded', 'false');
    (lastFocused || trigger)?.focus?.();
  }

  async function loadAndRender({ forceRefetch = false }) {
    const p = panel;
    const t = p.t;
    const settings = await p.settingsMod.getSettings();
    p.renderer.applyTheme(await p.settingsMod.resolveTheme(settings.theme));
    p.renderer.setStaticText();

    if (isNieuwbouw()) {
      p.renderer.showStatus(t('error_nieuwbouw'));
      return;
    }

    const addressResult = getAddress(); // defined in funda.js, same content-script world
    if (addressResult?.error === 'NIEUWBOUW') {
      p.renderer.showStatus(t('error_nieuwbouw'));
      return;
    }
    if (!addressResult?.address) {
      p.renderer.showStatus(t('error_no_address'));
      return;
    }

    const addr = addressResult.address;
    const addressText = `${addr.street}, ${addr.postcode} ${addr.city}`;

    // The cache is only valid for the address it was fetched for: Funda is
    // an SPA, so this content script can outlive a client-side navigation
    // to a different listing.
    if (cachedResult && cachedResult.addressText === addressText && !forceRefetch) {
      p.renderer.renderResults(cachedResult.data, cachedResult.addressText, settings);
      return;
    }

    p.renderer.showStatus(t('loading'));

    let checkResponse;
    try {
      checkResponse = await browser.runtime.sendMessage({ type: 'CHECK_PLEK', address: addressText });
    } catch (err) {
      p.renderer.showStatus(t('error_generic'), { showRetry: true });
      return;
    }

    if (!checkResponse?.ok) {
      if (checkResponse?.code === 'NOT_FOUND') {
        p.renderer.showStatus(t('error_geocode_not_found'));
      } else {
        p.renderer.showStatus(t('error_generic'), { showRetry: true });
      }
      return;
    }

    cachedResult = { addressText, data: checkResponse.data };
    p.renderer.renderResults(checkResponse.data, addressText, settings);
  }

  startObserving();
})();
