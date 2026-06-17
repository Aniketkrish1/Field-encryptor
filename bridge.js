// bridge.js — runs in ISOLATED world (has chrome.* access)
// Listens for FE_SET_CONFIG message from content.js and forwards to MAIN world
// via window.postMessage (which the MAIN world interceptor.js listens to).

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data && event.data.type === "FE_MAIN_TO_ISOLATED") {
    // Log from MAIN world coming back to isolated (for debugging)
    console.log("[Field Encryptor bridge] got message from MAIN:", event.data);
  }
});

// This function is called by content.js (also ISOLATED) to push config into MAIN world
window.__fe_sendConfig = function(cfg) {
  window.postMessage({ type: "FE_SET_CONFIG", config: cfg }, "*");
  console.log("[Field Encryptor bridge] sent config to MAIN world:", cfg);
};
