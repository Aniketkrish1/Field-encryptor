# Field Encryptor

A browser extension that performs client-side field-level encryption for web applications.

## Overview

Field Encryptor allows selected fields in API requests and responses to be encrypted and decrypted directly inside the browser.

The goal of this project is to explore how sensitive data can be protected before it reaches the server, without requiring modifications to an application's backend.

## Features

* Client-side field-level encryption
* Automatic request interception
* Automatic response interception
* Configurable API endpoint matching
* Configurable field selection using dot notation
* AES-based encryption workflow
* Browser extension architecture
* Support for nested JSON objects and arrays

## How It Works

1. User configures API endpoints and fields to encrypt.
2. The extension intercepts outgoing requests.
3. Selected fields are encrypted before transmission.
4. Encrypted data is stored and transmitted through the API.
5. Incoming responses are intercepted.
6. Encrypted fields are decrypted before being displayed to the user.

## Example

### Original Data

```json
{
  "task": "Complete project",
  "notes": "Review documentation"
}
```

### Data Sent Through API

```json
{
  "task": "FE1:encrypted_value",
  "notes": "FE1:encrypted_value"
}
```

### Data Displayed To User

```json
{
  "task": "Complete project",
  "notes": "Review documentation"
}
```

## Configuration

### API URL Match

Specify a substring that identifies requests that should be processed.

Example:

```text
/api/vision/sync
```

### Fields To Encrypt

Fields are configured using dot notation.

Examples:

```text
data.mondaySchedule[].task
data.mondaySchedule[].notes
data.wednesdaySchedule[].task
data.wednesdaySchedule[].notes
```

## What I Learned

Building this project highlighted several important concepts:

* Browser request interception
* Browser response interception
* Field-level encryption
* Cryptographic key management
* Browser extension architecture
* Security trade-offs between usability and protection

One of the most important lessons:

> Encryption is often the easy part. Key management is the hard part.

## Limitations

This project is intended for educational and research purposes.

Current limitations include:

* No professional security audit
* Not intended for production environments
* Security depends on proper password management
* Browser extensions operate within browser security constraints

## Future Improvements

Potential future enhancements:

* Improved key management
* Cross-device key synchronization
* Enhanced configuration management
* Additional encryption options
* Security review and testing
* Improved user experience

## Installation

1. Download the project ZIP.
2. Extract the files.
3. Open Chrome Extensions.
4. Enable Developer Mode.
5. Select "Load Unpacked".
6. Choose the extracted extension folder.

## License

Released under the MIT License.

See LICENSE.txt for details.

## Disclaimer

This project was created for educational and research purposes.

It has not undergone a professional security audit and should not be considered production-ready security software.
