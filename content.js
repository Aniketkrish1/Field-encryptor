// content.js — ISOLATED world, document_idle
// Reads config (including saved passphrase) from storage and sends to MAIN world.
// No passphrase prompt — passphrase is set once in the popup and stored locally.

(async function () {
  const hostname = location.hostname;

  const result = await chrome.storage.local.get(["fe_configs"]);
  const configs = result.fe_configs || {};
  const cfg = configs[hostname];

  if (!cfg || !cfg.enabled || !cfg.passphrase) {
    console.log("[Field Encryptor] not configured or disabled for", hostname);
    return;
  }

  const fullConfig = {
    enabled: true,
    passphrase: cfg.passphrase,
    fields: cfg.fields || [],
    urlMatch: cfg.urlMatch || hostname,
  };

  // Send config to MAIN world via postMessage (bridge.js forwards it)
  window.postMessage({ type: "FE_SET_CONFIG", config: fullConfig }, "*");

  console.log("[Field Encryptor] active for", hostname, "| fields:", cfg.fields, "| urlMatch:", cfg.urlMatch);
})();
