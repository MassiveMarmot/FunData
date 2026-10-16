# AGENTS.md: FunData

FunData is a Firefox (Manifest V3) extension that shows Dutch government environmental and neighbourhood data (RIVM, PDOK, Leefbaarometer) on Funda listing pages. Plain JavaScript ES modules, no bundler, no build step.

Read README.md and manifest.json before every task. If the task names a spec or session file (e.g. docs/...), read that too. If code and spec disagree, or the task is ambiguous, ask instead of guessing.

## Rules

### Code
- Plain JS ES modules. No TypeScript, bundler, transpiler or `package.json` tooling unless the task explicitly asks for it. Content scripts keep their dynamic `import()` calls (decided: no bundling; the AMO "unsafe import" warnings are handled with a reviewer note).
- Shared logic lives in `/lib` and must not assume an ambient `document` or `window`: pass `doc` (or other context) explicitly, because `lib/render-pipeline.js` runs both in the popup (static import) and in the content script (dynamic import).
- Never edit `lib/vendor/` (Leaflet, BSD-2-Clause). Update it only when the task says so, from the official release, and state the version.
- No `eval`, `new Function`, remote code, or inline event handlers. Build DOM with `textContent`/`createElement`; never put API or page data through `innerHTML`.
- Before finishing, run every check that exists and report command plus output in the PR description. Checks to try: `node --check <file>` on changed `.js` files (for modules, `node --input-type=module --check < <file>`), `web-ext lint` if available, and JSON validation of `manifest.json` and both `messages.json` files. If a check cannot be run, say so; do not claim it works.
- No test runner exists. Do not add one without approval. If a task asks for tests, use Node's built-in `node:test` for pure `/lib` logic, with no new dependency. When a change wires X into Y, verify the wiring, not just that X exists. For UI behaviour, list manual verification steps in the PR description and mark them "not run" unless you actually ran them.

### Firefox and MV3 specifics (hard-won, do not regress)
- Any extension resource that a content script or the page loads (fetch, dynamic import, img, CSS) needs an entry in `web_accessible_resources`, scoped to `https://www.funda.nl/*`. Do not add `use_dynamic_url` (Chrome-only, causes a Firefox manifest warning). When you add or rename a file used this way, update the list and say so in the PR.
- Content scripts cannot call `browser.runtime.openOptionsPage()`: message the background script instead.
- Do not load extension assets as `blob:` URLs (Funda's page rejects them); inline them as `data:` URIs.
- Injected UI lives in its own shadow root so Funda's CSS cannot affect it, and uses `z-index` high enough to sit above Funda's sticky header.
- Funda is a Vue/Nuxt single-page app that rebuilds subtrees on navigation. Never reparent or mutate Funda-managed nodes beyond what the existing code does. Use body-scoped, self-healing observers; do not bind observers to a node that can be replaced.
- Match Funda's "Kaart" block in footprint, size and link colour (`#0071b3`) for the injected trigger. Verify layout changes against the real page structure, not a guess.
- Do not change `strict_min_version`, `version`, extension id or permissions unless the task says so. (Pending: `strict_min_version` 140.0 to 142.0, only when asked.) The maintainer builds and packages release zips.

### Privacy and data
- No analytics, telemetry, third-party scripts or fonts, no remote code, no tracking, and no data sent anywhere except the host permissions already in `manifest.json`. A new host permission or network endpoint needs approval and a PR note explaining why.
- Data comes only from open Dutch government APIs called directly (PDOK, RIVM, Sogelink WMS, Leefbaarometer). No scraping, no hidden iframes or tabs on Funda. Read only the listing address from the page.
- Describe Leefbaarometer (`geo.leefbaarometer.nl`) as a government API in README and privacy wording, never as a third party.
- Settings and caches stay local (`storage`, in-memory only for the page cache). Do not persist addresses or listing data.
- Every data source shown to the user states source and licence (README and in-UI attribution; the map attribution string stays accurate). No medical claims, and no causal claims about a score unless an official study is cited.
- Data licences are recorded in README.md and the layer attribution strings. Do not change a licence without citing the official page you read. Code licence is MPL-2.0.

### Verification
- Do not invent URLs, licences, endpoints, layer names, parameters or API fields. If you cannot verify one by fetching the official page or service, leave a TODO with the link to check. (Precedent: the Leefbaarometer catalogue listed a wrong workspace and layer name; the real ones came from the service's own GetCapabilities.)
- A claim of "verified" must name the evidence actually consulted (command plus output, doc URL, GetCapabilities response). A plausible-looking URL or layer name is not verification.
- Test fixtures for external APIs must come from a real response (fetch once, strip anything personal, commit it). Never invent a response shape from memory.
- No mock or random data in production code paths. Mocks live under a test directory or behind an explicit dev-only flag that is off by default.
- Any config you write (`manifest.json`, WMS parameters, workflow files) must be validated with its own tool, and the command plus output go in the PR description.

### i18n
- All UI strings come from `_locales/en/messages.json` and `_locales/nl/messages.json` via `lib/i18n.js`. No hard-coded user-facing text. Every new key is added to both locales, with UK English for English. Dutch text must read as natural Dutch, not literal translation.
- The UI follows the browser language unless the user chooses one in settings.

### Accessibility
Target: WCAG 2.1 AA (Dutch/EU public-sector expectation, EN 301 549).
- Semantic HTML and landmarks. Panel and popup: managed focus (move focus in on open, return it on close, no trap), Escape closes, full keyboard operation, visible focus styles.
- Text contrast of at least 4.5:1 in both light and dark themes (orange `#FF9B21` is too light for light-mode text; the darkened `#B35900` is used there). State contrast ratios when you change colours.
- Colour is never the only carrier of meaning: score icons keep text labels or accessible names. Icon-only controls (theme toggle, settings, retry) have accessible names. Map images and controls have text alternatives.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.

### Process
- One task per session, one branch/PR per task. PR description lists: what changed, what was verified (with evidence), what was not.
- A failed scripted or patch step fails the task: fix it before continuing. Before every commit, compare the changed-file list with the intended scope.
- Do not merge, deploy, publish to AMO, or touch anything outside this repo. Commit only small files. Release zips and screenshots are produced by the maintainer.
- New dependency or vendored library: state name, licence, version and reason in the PR. Prefer MIT/Apache/BSD/MPL. Default answer is no new dependency.
- If GitHub workflows are ever added: only GitHub-owned actions (`actions/*`), each pinned to a full commit SHA with the version in a comment; top-level `permissions: contents: read` with write granted per job only where needed; never `pull_request_target`; never interpolate untrusted data (`${{ }}` of inputs, titles, versions) into `run:` scripts or PR/issue bodies (use environment variables or files); no secret other than `GITHUB_TOKEN`; scheduled workflows never deploy.
- Never hard-code a sandbox filesystem path (`/workspace/...`, `/mnt/...`) or a personal GitHub username in any file. The existing `author` and `homepage_url` in `manifest.json` and README links are the only exception and are not to be altered unless asked.

## Layout
```
manifest.json  background.js  README.md  LICENSE  AGENTS.md
_locales/{en,nl}/messages.json
content-scripts/   funda.js (address/page detection), panel.js (injected trigger + panel), panel.css.js
lib/               render-pipeline.js (shared rendering), layers.js, wms.js, pdok.js, settings.js, i18n.js, emoji.js
lib/vendor/leaflet/   vendored, do not edit
popup/  options/   toolbar pop-out and settings page
icons/  icons/scores/   extension icons and RIVM score icons
```
