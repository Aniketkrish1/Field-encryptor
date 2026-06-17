// crypto.js
// AES-GCM encryption with PBKDF2 key derivation from a passphrase.
// The passphrase is never stored; only kept in memory for the session
// (or re-derived each time from a value the user enters).

const FE_CRYPTO = (() => {
  const SALT_BYTES = 16;
  const IV_BYTES = 12;
  const PBKDF2_ITERATIONS = 250000;
  const PREFIX = "FE1:"; // marks our ciphertext so we can detect & decrypt later

  function bufToBase64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }

  function base64ToBuf(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  async function deriveKey(passphrase, salt) {
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      "raw",
      enc.encode(passphrase),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  // Encrypts a plaintext string. Returns a self-contained base64 token:
  // PREFIX + base64(salt || iv || ciphertext)
  async function encryptString(plaintext, passphrase) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const key = await deriveKey(passphrase, salt);
    const enc = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(plaintext)
    );

    const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

    return PREFIX + bufToBase64(combined);
  }

  // Decrypts a token produced by encryptString. Returns null on failure
  // (wrong passphrase, corrupted data, or not our format).
  async function decryptString(token, passphrase) {
    if (typeof token !== "string" || !token.startsWith(PREFIX)) return null;
    try {
      const combined = base64ToBuf(token.slice(PREFIX.length));
      const salt = combined.slice(0, SALT_BYTES);
      const iv = combined.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
      const ciphertext = combined.slice(SALT_BYTES + IV_BYTES);
      const key = await deriveKey(passphrase, salt);
      const plainBuf = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        ciphertext
      );
      return new TextDecoder().decode(plainBuf);
    } catch (e) {
      return null; // wrong key or corrupted token
    }
  }

  function isEncrypted(value) {
    return typeof value === "string" && value.startsWith(PREFIX);
  }

  return { encryptString, decryptString, isEncrypted, PREFIX };
})();
