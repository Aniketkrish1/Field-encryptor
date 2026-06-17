// interceptor.js
// Hooks fetch() and XMLHttpRequest so that, for configured API endpoints,
// selected JSON fields are encrypted before sending and decrypted after receiving.
//
// Config shape (per site, loaded from chrome.storage.local):
// {
//   enabled: true,
//   passphrase: "...",          // session-only, see content.js
//   fields: ["weight", "notes", "data.customField3"], // dot-path supported
//   urlMatch: "api.example.com" // substring match against request URL
// }

const FE_INTERCEPTOR = (() => {
  let config = null; // set via setConfig() or postMessage from bridge

  function setConfig(cfg) {
    config = cfg;
    console.log("[Field Encryptor MAIN] config set:", cfg);
  }

  // Listen for config pushed from bridge.js (ISOLATED world) via postMessage
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === "FE_SET_CONFIG") {
      setConfig(event.data.config);
    }
  });

  function shouldHandle(url) {
    if (!config || !config.enabled || !config.passphrase) {
      return false;
    }
    if (!config.urlMatch) return true;
    const match = url.includes(config.urlMatch);
    if (match) console.log("[Field Encryptor] handling URL:", url);
    return match;
  }

  // Get/set a nested value by dot-path, e.g. "data.customField3"
  function getPath(obj, path) {
    return path.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
  }

  function setPath(obj, path, value) {
    const parts = path.split(".");
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof cur[parts[i]] !== "object" || cur[parts[i]] === null) return;
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }

  // Encrypts or decrypts a single leaf value in-place.
  // `container` is the object holding the value, `key` is its key.
  async function transformLeaf(container, key, mode) {
    const val = container[key];
    if (val === undefined || val === null) return;

    if (mode === "encrypt") {
      if (typeof val === "string" && !FE_CRYPTO.isEncrypted(val)) {
        container[key] = await FE_CRYPTO.encryptString(val, config.passphrase);
      } else if (typeof val !== "string") {
        // Non-string values (numbers, objects, arrays) get JSON-stringified then encrypted
        container[key] = await FE_CRYPTO.encryptString(JSON.stringify(val), config.passphrase);
      }
    } else {
      if (FE_CRYPTO.isEncrypted(val)) {
        const dec = await FE_CRYPTO.decryptString(val, config.passphrase);
        if (dec !== null) {
          try {
            container[key] = JSON.parse(dec);
          } catch {
            container[key] = dec;
          }
        }
      }
    }
  }

  // Resolves a field path that may contain "[]" array segments, e.g.
  //   "mondaySchedule[].task"   -> for each element of obj.mondaySchedule, transform .task
  //   "weeklyPlan[].mon"        -> for each element of obj.weeklyPlan, transform .mon
  //   "profile.name"            -> transform obj.profile.name directly
  // Calls transformLeaf on every matching leaf.
  async function transformByPath(obj, path, mode) {
    const parts = path.split(".");

    async function walk(node, idx) {
      if (!node || typeof node !== "object") return;
      const part = parts[idx];
      const isArrayPart = part.endsWith("[]");
      const key = isArrayPart ? part.slice(0, -2) : part;

      if (idx === parts.length - 1) {
        if (isArrayPart) return; // "[]" as final segment not used in our config
        await transformLeaf(node, key, mode);
        return;
      }

      // Not last segment: descend
      if (isArrayPart) {
        const arr = node[key];
        if (!Array.isArray(arr)) {
          console.log(`[Field Encryptor] path segment '${key}[]' not an array or missing at this node`, node && node[key]);
          return;
        }
        console.log(`[Field Encryptor] found array '${key}' with ${arr.length} item(s)`);
        for (const item of arr) {
          await walk(item, idx + 1);
        }
      } else {
        await walk(node[key], idx + 1);
      }
    }

    await walk(obj, 0);
  }

  // Walk an object and apply encrypt/decrypt to all configured field paths.
  async function transformFields(obj, mode /* 'encrypt' | 'decrypt' */) {
    if (!obj || typeof obj !== "object" || !config.fields) return obj;

    for (const fieldPath of config.fields) {
      if (fieldPath.includes("[]")) {
        await transformByPath(obj, fieldPath, mode);
      } else {
        const val = getPath(obj, fieldPath);
        if (val === undefined || val === null) continue;
        const parts = fieldPath.split(".");
        let cur = obj;
        let ok = true;
        for (let i = 0; i < parts.length - 1; i++) {
          if (cur[parts[i]] === undefined || cur[parts[i]] === null) { ok = false; break; }
          cur = cur[parts[i]];
        }
        if (ok) await transformLeaf(cur, parts[parts.length - 1], mode);
      }
    }
    return obj;
  }

  // Handles arrays of records too (common in list endpoints)
  async function transformPayload(payload, mode) {
    if (Array.isArray(payload)) {
      for (let i = 0; i < payload.length; i++) {
        payload[i] = await transformFields(payload[i], mode);
      }
      return payload;
    }
    return transformFields(payload, mode);
  }

  // ---- fetch() hook ----
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    let [resource, init] = args;
    let url = typeof resource === "string" ? resource : (resource && resource.url);

    // Resolve relative URLs to absolute so urlMatch substring checks work
    try { url = new URL(url, window.location.origin).href; } catch {}

    console.log("[Field Encryptor] fetch ->", url, "| shouldHandle:", shouldHandle(url), "| body type:", init && typeof init.body, "| urlMatch:", config && config.urlMatch);

    if (shouldHandle(url) && init && init.body && typeof init.body === "string") {
      try {
        const json = JSON.parse(init.body);
        console.log("[Field Encryptor] parsed outgoing body:", json);
        const transformed = await transformPayload(json, "encrypt");
        init = { ...init, body: JSON.stringify(transformed) };
        args = [resource, init];
        console.log("[Field Encryptor] encrypted outgoing payload:", transformed);
      } catch (e) {
        console.log("[Field Encryptor] could not encrypt request body:", e);
      }
    }

    const response = await originalFetch.apply(this, args);

    if (shouldHandle(url)) {
      try {
        const cloned = response.clone();
        const text = await cloned.text();
        const json = JSON.parse(text);
        const transformed = await transformPayload(json, "decrypt");
        const newBody = JSON.stringify(transformed);
        return new Response(newBody, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      } catch {
        return response; // not JSON or parse failure, pass through
      }
    }

    return response;
  };

  // ---- XMLHttpRequest hook ----
  const OrigXHR = window.XMLHttpRequest;
  function PatchedXHR() {
    const xhr = new OrigXHR();
    let _url = "";

    const origOpen = xhr.open;
    xhr.open = function (method, url, ...rest) {
      // Resolve relative URLs to absolute so urlMatch substring checks work
      try {
        _url = new URL(url, window.location.origin).href;
      } catch {
        _url = url;
      }
      console.log("[Field Encryptor] XHR open ->", _url, "| shouldHandle:", shouldHandle(_url));
      return origOpen.call(this, method, url, ...rest);
    };

    const origSend = xhr.send;
    xhr.send = function (body) {
      console.log("[Field Encryptor] XHR send ->", _url, "| body type:", typeof body, "| shouldHandle:", shouldHandle(_url));
      if (shouldHandle(_url) && typeof body === "string") {
        try {
          const json = JSON.parse(body);
          console.log("[Field Encryptor] XHR parsed outgoing body:", json);
          transformPayload(json, "encrypt").then((transformed) => {
            console.log("[Field Encryptor] XHR encrypted outgoing payload:", transformed);
            origSend.call(xhr, JSON.stringify(transformed));
          });
          return; // async send happens in the promise above
        } catch (e) {
          console.log("[Field Encryptor] XHR could not encrypt body:", e);
        }
      }
      return origSend.call(xhr, body);
    };

    xhr.addEventListener("readystatechange", function () {
      if (xhr.readyState === 4 && shouldHandle(_url)) {
        try {
          const json = JSON.parse(xhr.responseText);
          transformPayload(json, "decrypt").then((transformed) => {
            Object.defineProperty(xhr, "responseText", {
              value: JSON.stringify(transformed),
              writable: false,
              configurable: true,
            });
          });
        } catch {
          // not JSON, ignore
        }
      }
    });

    return xhr;
  }
  window.XMLHttpRequest = PatchedXHR;

  console.log("[Field Encryptor] interceptor installed. fetch patched:", window.fetch !== originalFetch, "| XHR patched:", window.XMLHttpRequest === PatchedXHR);

  return { setConfig, transformPayload };
})();
