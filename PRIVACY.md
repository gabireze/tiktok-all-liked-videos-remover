# Privacy Policy

## Overview

TikTok All Liked Videos Remover is a Chrome extension designed to help users automatically remove all liked videos from their TikTok profile. We are committed to protecting your privacy and ensuring that no personal data is ever collected, stored, or shared.

---

## What Data We Collect

**We do not collect or transmit any personal data.**  
All extension logic runs entirely within your browser, and no data is sent to any external server.

Specifically:
- We do **not** collect your TikTok credentials.
- We do **not** access your TikTok content beyond what is necessary to automate the like removal.
- We do **not** track your activity or browsing behavior.

---

## How the Extension Works

The extension performs the following actions, entirely in your browser:

- Opens [tiktok.com](https://www.tiktok.com) in a new browser tab (your profile or, if you are not logged in, the TikTok login page so you can sign in).
- On your TikTok profile, uses the same authenticated web APIs that the site uses to:
  - List your liked videos (e.g. `api/favorite/item_list/`).
  - Send requests to remove each selected like (e.g. `api/commit/item/digg/` with `type: '0'`). The removal request is run in the page context so it behaves like a normal site action.
- Lets you optionally filter by keywords so that only likes matching those terms are removed; otherwise all listed likes are processed. You can set delays between removals and a pause between pages.
- Shows an in-page control panel with live status, pause/resume, and a downloadable report (JSON or CSV) of which items were successfully removed and which failed, if any.

All requests are made **directly from your browser to TikTok** using your existing session.  
No data is sent to any server controlled by this extension or its developer.

---

## Third-Party Services

This extension does **not** use any third-party analytics, tracking scripts, or external APIs.

---

## Permissions Explanation

The extension uses the following Chrome permissions:

- **`host_permissions`** (`https://*.tiktok.com/*`): Required so the extension can run only on TikTok pages. No other domains are accessed.
- **`scripting`**: Needed to inject and run the content script on TikTok pages, to run the remove-like request in the page context, and to read session data required to identify your account.
- **`tabs`**: Used to open your TikTok profile (or the TikTok login page when you choose to sign in) in a new tab and to communicate with that tab.
- **`cookies`**: Used **only in the popup** to check whether you are logged in to TikTok (by checking TikTok cookies locally). Cookie values are not stored or sent anywhere.
- **`storage`**: Used to save your local configuration (intervals, keywords, report format, etc.) inside your browser.

These permissions are the minimum required for the extension to perform its intended function.  
They are never used to collect analytics, track you across sites, or send data to external services.

---

## Contact

If you have any questions or concerns regarding privacy, feel free to reach out:

**Developer:** Gabriel de Rezende Gonçalves  
**Website:** [gabireze.com.br](https://gabireze.com.br)  
**GitHub:** [github.com/gabireze](https://github.com/gabireze)
