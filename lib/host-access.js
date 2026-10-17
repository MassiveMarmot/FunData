// Shared host-permission helpers. Firefox treats MV3 host permissions as
// user-controlled: on a temporary add-on, or after the user revokes them in
// about:addons, they are not granted -- so the content script never runs and
// the background's fetches to the data services fail. These helpers let the
// popup and options page detect that state and re-request access.
//
// Pure ES module: no ambient document/window (per the /lib rules), so it can
// be imported by any extension context.
//
// Why requesting origins that are already declared in `host_permissions`
// works in Firefox: MDN's host_permissions page states that "most browsers
// treat host_permissions as optional" and that the extension "can check
// whether it has all the required permissions immediately after
// installation using permissions.contains. If it doesn't have the necessary
// permissions, it can request them using permissions.request."
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/host_permissions
// (Note MDN's permissions.request page has a stricter generic wording about
// optional_permissions; the Firefox-specific host_permissions page above is
// the behaviour this code relies on. Verified manually in the checklist.)

// The origins we need are exactly the manifest's host_permissions -- read
// from the manifest rather than hard-coded so this can never drift from it.
export function getHostPermissionOrigins() {
  return browser.runtime.getManifest().host_permissions || [];
}

// True when every host permission in the manifest has been granted.
// permission.contains() only reports permissions actually granted by the
// user, which in Firefox is what governs whether content scripts run and
// whether the background's cross-origin fetches are allowed.
export async function hasHostAccess(origins = getHostPermissionOrigins()) {
  if (!origins.length) return true;
  return browser.permissions.contains({ origins });
}

// Prompts the user to grant the manifest's host permissions. MUST be called
// directly from a user-gesture handler (a click), with nothing awaited
// before it -- Firefox only shows the prompt inside a user-action handler.
// Resolves true when granted, false when denied/rejected (a thrown error is
// surfaced as false by callers, since request() rejects rather than
// resolving false for unsupported requests).
export async function requestHostAccess(origins = getHostPermissionOrigins()) {
  return browser.permissions.request({ origins });
}
