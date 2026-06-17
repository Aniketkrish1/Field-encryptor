# Field Encryptor — Browser Extension
### Encrypt your personal data before it reaches any website's server

---

## What This Does

Most web apps store your data on their servers in plain text — their developers can read it.

This Chrome extension lets you pick specific fields in any web app and encrypt them **locally in your browser** before they're sent to the server. When the server sends data back, the extension decrypts it automatically so you still see it normally.

The website receives encrypted gibberish. Only you can read the real data.

---

## How It Works

1. You choose which fields to encrypt (e.g. notes, task names, schedule entries)
2. You set a passphrase — this is the key to your encryption
3. Every time you save data, those fields are encrypted on your device first
4. Every time data loads, those fields are decrypted on your device before display
5. The server never sees the original values

**Encryption used:** AES-GCM 256-bit with PBKDF2 key derivation (industry standard)

---

## Installation

> Requires Google Chrome or any Chromium-based browser (Edge, Brave, Arc)

1. Download the `encrypt-ext` zip file from the link provided
2. Unzip it — you should see a folder called `encrypt-ext`
3. Open Chrome and go to: `chrome://extensions`
4. Turn on **Developer Mode** (toggle in the top-right corner)
5. Click **"Load unpacked"**
6. Select the `encrypt-ext` folder
7. You should see "Field Encryptor" appear in your extensions list
8. Pin it to your toolbar by clicking the puzzle icon 🧩 and pinning it

---

## Setup for Your Website

Before using the extension, you need to find two things from your website using Chrome DevTools:

### Step 1 — Find the API endpoint

1. Open your web app
2. Press `F12` to open DevTools
3. Go to the **Network** tab
4. Perform any save action (save a note, update a schedule, etc.)
5. Look for a `POST` or `PUT` request — click it
6. Copy the full URL from the **Headers** section
   - Example: `https://app.example.com/api/data/sync`

### Step 2 — Find the field names

1. Click the same request in the Network tab
2. Go to the **Payload** tab (or **Request** tab)
3. You'll see the JSON data being sent — note the field names you want to encrypt
   - Example: `{ "data": { "notes": "my text", "task": "my task" } }`

### Step 3 — Configure the extension

1. Go to your web app in Chrome
2. Click the Field Encryptor icon in your toolbar
3. Fill in the settings:

| Setting | What to put |
|---|---|
| **Enabled** | Check this box |
| **API URL match** | The endpoint URL you found in Step 1 |
| **Fields to encrypt** | One field path per line (see format below) |
| **Passphrase** | A strong password you will remember forever |

4. Click **Save**
5. Reload the page

---

## Field Path Format

Fields are written as dot-paths matching the JSON structure.

**Simple field:**
```
notes
```

**Nested field:**
```
data.notes
```

**Field inside an array (use `[]`):**
```
data.mondaySchedule[].task
data.mondaySchedule[].notes
```

**Example config for a tracker app:**
```
data.mondaySchedule[].task
data.mondaySchedule[].notes
data.wednesdaySchedule[].task
data.wednesdaySchedule[].notes
data.weekdaySchedule[].task
data.weekdaySchedule[].notes
data.weekendSchedule[].task
data.weekendSchedule[].notes
```

---

## Important Warnings

**⚠ Do not lose your passphrase.**
There is no recovery option. If you forget your passphrase, your encrypted data is permanently unreadable. Write it down somewhere safe offline.

**⚠ Do not change your passphrase after encrypting data.**
If you change the passphrase in the popup, old encrypted data will fail to decrypt. Only change it if you are starting fresh.

**⚠ Some app features may break.**
Any feature that processes your data server-side (search, charts, totals, filters) will not work on encrypted fields — the server sees only ciphertext. Only encrypt fields you don't need the server to process.

**⚠ This extension runs only in your browser.**
If you log in from another device or browser, the extension won't be there — you'll see the raw encrypted text. Install and configure the extension on every device you use.

---

## Troubleshooting

**Data is not being encrypted**
- Check the browser console (F12 → Console) for `[Field Encryptor]` log messages
- Make sure the URL match exactly contains a substring of the request URL
- Make sure the field paths match the exact JSON structure being sent

**Data shows as encrypted text (not decrypting)**
- You are viewing data from another device/browser that doesn't have the extension
- Or the passphrase was changed after encryption
- Or the URL match is not catching the GET/load request

**Extension not appearing**
- Make sure Developer Mode is on in `chrome://extensions`
- Try removing and re-loading the unpacked folder

---

## Privacy & Security Notes

- Your passphrase is stored in `chrome.storage.local` — local to your browser only, never synced or sent anywhere
- Encryption and decryption happen entirely on your device
- The extension does not collect any data, phone home, or connect to any external server
- Source code is fully open — you can read every file in the `encrypt-ext` folder

---

## Technical Details

| Component | Detail |
|---|---|
| Encryption | AES-GCM 256-bit |
| Key derivation | PBKDF2-SHA256, 250,000 iterations |
| IV | Random 12 bytes per encryption |
| Salt | Random 16 bytes per encryption |
| Storage | chrome.storage.local (browser only) |
| Execution | MAIN world content script (bypasses CSP) |
| API hooking | window.fetch + XMLHttpRequest patched at document_start |

---

*Built with Web Crypto API — no external libraries, no dependencies.*
