// popup.js
document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = new URL(tab.url);
  const host = url.hostname;

  document.getElementById("hostname").textContent = host;

  // Toggle passphrase visibility
  document.getElementById("toggle-pass").addEventListener("click", () => {
    const input = document.getElementById("passphrase");
    input.type = input.type === "password" ? "text" : "password";
  });

  // Load saved config
  chrome.storage.local.get(["fe_configs"], (result) => {
    const configs = result.fe_configs || {};
    const cfg = configs[host] || {};
    document.getElementById("enabled").checked = !!cfg.enabled;
    document.getElementById("urlMatch").value = cfg.urlMatch || "";
    document.getElementById("fields").value = (cfg.fields || []).join("\n");
    document.getElementById("passphrase").value = cfg.passphrase || "";
  });

  // Save config including passphrase
  document.getElementById("save").addEventListener("click", () => {
    const passphrase = document.getElementById("passphrase").value.trim();
    if (!passphrase) {
      document.getElementById("status").textContent = "⚠ Passphrase cannot be empty.";
      document.getElementById("status").style.color = "#f87171";
      return;
    }

    chrome.storage.local.get(["fe_configs"], (result) => {
      const configs = result.fe_configs || {};
      const fields = document.getElementById("fields").value
        .split("\n").map(f => f.trim()).filter(f => f.length > 0);

      configs[host] = {
        enabled: document.getElementById("enabled").checked,
        urlMatch: document.getElementById("urlMatch").value.trim() || host,
        fields,
        passphrase,
      };

      chrome.storage.local.set({ fe_configs: configs }, () => {
        const status = document.getElementById("status");
        status.style.color = "#34d399";
        status.textContent = "✓ Saved. Reload the page to apply.";
        setTimeout(() => (status.textContent = ""), 3000);
      });
    });
  });
});
