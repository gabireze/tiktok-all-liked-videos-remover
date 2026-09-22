# TikTok All Liked Videos Remover

Remove all your liked videos on TikTok automatically with a single action.

![Screenshot](screenshot.png)

---

## GitAds Sponsored
[![Sponsored by GitAds](https://gitads.dev/v1/ad-serve?source=gabireze/tiktok-all-liked-videos-remover@github)](https://gitads.dev/v1/ad-track?source=gabireze/tiktok-all-liked-videos-remover@github)

---

## Features

- Opens your TikTok profile in a new tab automatically  
- Uses the same authenticated TikTok web APIs as the site to list and remove liked videos  
- Includes a read-only analysis mode to validate the session, filters, pagination, and matching count before removing anything
- Distinguishes an empty likes list from session, rate-limit, HTTP, and invalid-response errors
- In-page control panel on TikTok with:
  - Page-by-page removal that starts after checking only the first page
  - Optional full read-only analysis when you explicitly choose analysis mode
  - Explicit confirmation before page-by-page processing starts
  - Live statistics for listed, matched, processed, verified, remaining, and failed items
  - Immediate pause, resume, and cancellation, including in-flight request cancellation
  - Final re-scan that verifies the result against TikTok
  - Downloadable JSON or formula-safe CSV report with one final status per item
- Configurable delay between removals (1–10 seconds, random range or fixed set)  
- Optional keyword filter to only remove likes that match certain terms

---

## Installation

### From Chrome Web Store

[Install from Chrome Web Store](https://chromewebstore.google.com/detail/tiktok-all-liked-videos-r/eafmacjdgennnmhagdkdckgjokmnllci)

### Manual installation (for developers)

1. Clone this repository or download the source code.
2. Go to `chrome://extensions` in Google Chrome.
3. Enable **Developer mode** (top right toggle).
4. Click **"Load unpacked"** and select the project folder.

---

## How to use

1. Make sure you are logged in to your TikTok account at [tiktok.com](https://tiktok.com).
2. Click the extension icon in the Chrome toolbar.
3. Configure options in the popup:
   - Whether to filter by keywords or remove all likes
   - Interval mode (random range or fixed set of seconds between removals)
   - Pause between pages and report format (JSON or CSV)
4. Click **Scan and Remove Likes**.
5. A TikTok tab will open automatically. The in-page panel will appear near the top-right:
   - The extension opens the **Liked** tab and loads the first page.
   - Review the listed and matched counts, then explicitly confirm the removal.
   - You can pause, resume, or stop; closing the panel also cancels the active run.
   - After removal, the extension scans again and confirms which likes disappeared and which remain.
   - You can download a report as soon as scan data is available.
6. Keep the tab open until the process finishes. Do not close it during the operation.

---

## Behavior details

- When you are not logged in and TikTok redirects `/profile` to `/foryou`, the panel:
  - Detects that you are not logged in.
  - Shows a clear message explaining that you must sign in and start again.
  - Marks the process as paused and disables the pause/resume button.
- When the extension cannot identify your account (no valid session data found), it shows a similar error message and stops safely.
- When removing likes:
  - The complete list is captured before the first removal, so pagination cannot skip items as the list changes.
  - Only items that match your keyword filter (if enabled) are removed.
  - A confirmation step shows the first-page match count before incremental removal starts.
  - Each page is filtered and processed before the next page is loaded, avoiding a long full-library pre-scan.
  - Temporary network/server failures use limited exponential-backoff retries.
  - The panel distinguishes accepted requests from removals verified in the final scan.
- Failures:
  - Any failed removal is logged in the panel as a failure.
  - Failed items are included in the report with a status flag so you can review them later.
  - If too many removals fail in a row, the extension stops automatically, shows a message, and lets you download the report.

---

## Report format

The report contains metadata, an aggregate summary, diagnostics, and one final status per matched item:

- JSON: `metadata`, `summary`, `items`, and `diagnostics`.
- CSV: one formula-safe table with the following columns:
  - `id`
  - `authorName`
  - `desc`
  - `url`
  - `status` (`matched`, `verified_removed`, `still_present`, `request_failed`, or `not_processed`)

This makes it easy to audit what was removed and what failed, or to keep a backup list of liked videos.

---

## Permissions

The extension uses the following Chrome permissions:

- `host_permissions` (`https://www.tiktok.com/*`): allows the extension to run only on TikTok pages.
- `scripting`: injects and runs the content script on TikTok pages and runs the remove-like request in the page context (so it works like the site). Also reads session data needed to identify your account.
- `tabs`: opens your TikTok profile in a new tab and communicates with that tab.
- `storage`: saves your configuration locally and keeps a temporary active-job marker (automatically expired after 12 hours) to prevent overlapping runs.

No analytics, tracking, or external servers are used. All operations happen in your browser, talking directly to TikTok.

---

## Important notes

- The process may take time depending on how many liked videos you have.
- If TikTok temporarily blocks actions (rate limiting), wait about 1 hour and run the extension again.
- The extension performs up to three final verification scans to account for short TikTok propagation delays.

---

## Related extensions

- [TikTok All Reposted Videos Remover](https://chromewebstore.google.com/detail/tiktok-all-reposted-video/amgpfdpibiacligkkkbeonfhmonkgjhg) – remove reposts automatically
- [TikTok All Favorite Videos Remover](https://chromewebstore.google.com/detail/tiktok-all-favorite-video/cbjkccccmffolddklbkedlndlfokcpbn) – remove favorites automatically

---

## Contributing

Contributions are welcome!  
If you find a bug or have an idea for improvement, feel free to open an issue or a pull request.

---

## License

This project is licensed under the [MIT License](https://opensource.org/license/mit/).
