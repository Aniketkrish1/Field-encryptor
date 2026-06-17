// background.js
// Minimal service worker — currently just ensures storage defaults exist.

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["fe_configs"], (result) => {
    if (!result.fe_configs) {
      chrome.storage.local.set({ fe_configs: {} });
    }
  });
});
