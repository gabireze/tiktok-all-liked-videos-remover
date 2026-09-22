const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const original = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
const source = original.replace(
  /\}\)\(\);\s*$/,
  "globalThis.__test = { parseKeywords, matchesKeywords, randomDelayMs, getLikedItems, openLikedTab, updatePanel, collectAllLikedItems, buildReport, sanitizeCsvCell }; })();"
);

function loadWithFetch(fetchImpl, documentImpl = { querySelector() { return null; } }) {
  const context = vm.createContext({
    chrome: { runtime: { sendMessage() {}, onMessage: { addListener() {} }, getManifest() { return { version: "test" }; } } },
    fetch: fetchImpl,
    URLSearchParams,
    console,
    setTimeout,
    clearTimeout,
    Promise,
    document: documentImpl,
  });
  vm.runInContext(source, context, { filename: "script.js" });
  return context.__test;
}

async function testLikedTabSelection() {
  let selected = false;
  let clicks = 0;
  const likedTab = {
    getAttribute(name) { return name === "aria-selected" ? String(selected) : null; },
    click() { clicks += 1; selected = true; },
  };
  const api = loadWithFetch(
    async () => { throw new Error("not called"); },
    { querySelector(selector) { return selector === '[data-e2e="liked-tab"]' ? likedTab : null; } }
  );
  const result = await api.openLikedTab(1000);
  assert.deepEqual({ found: result.found, selected: result.selected }, { found: true, selected: true });
  assert.equal(clicks, 1);
}

async function testFinishedPanelHidesRunControls() {
  const api = loadWithFetch(async () => { throw new Error("not called"); });
  const elements = {
    "#tlr-status": { textContent: "" },
    "#tlr-stats": { textContent: "" },
    "#tlr-pause-btn": { textContent: "", disabled: false, hidden: false, classList: { toggle() {} } },
    "#tlr-confirm-btn": { textContent: "", disabled: false, hidden: true },
    "#tlr-stop-btn": { disabled: false, hidden: false },
    "#tlr-download-btn": { textContent: "", disabled: true },
  };
  const panel = { querySelector(selector) { return elements[selector] || null; } };
  api.updatePanel(panel, {
    status: "Done",
    pages: 1,
    removed: 8,
    failed: 0,
    totalListed: 8,
    paused: false,
    finished: true,
    cancelled: false,
    reportReady: true,
    reportScannedItems: [],
  }, {});
  assert.equal(elements["#tlr-pause-btn"].hidden, true);
  assert.equal(elements["#tlr-stop-btn"].hidden, true);
  assert.equal(elements["#tlr-download-btn"].disabled, false);
}

async function testProcessesEachPageBeforeFetchingTheNext() {
  const events = [];
  const api = loadWithFetch(async (url) => {
    const cursor = new URL(url).searchParams.get("cursor");
    events.push(`fetch:${cursor}`);
    const first = cursor === "0";
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        status_code: 0,
        hasMore: first,
        cursor: first ? "30" : "60",
        itemList: first
          ? [{ id: "1", desc: "one", author: { uniqueId: "a" } }, { id: "2", desc: "two", author: { uniqueId: "b" } }]
          : [{ id: "2", desc: "duplicate", author: { uniqueId: "b" } }, { id: "3", desc: "three", author: { uniqueId: "c" } }],
      }),
    };
  });
  const result = await api.collectAllLikedItems("sec-test", {
    pagePauseMs: 0,
    diagnostics: [],
    async onPage({ page }) { events.push(`process:${page}`); },
  });
  assert.deepEqual(Array.from(result.items, (item) => item.id), ["1", "2", "3"]);
  assert.equal(result.pages, 2);
  assert.deepEqual(events, ["fetch:0", "process:1", "fetch:30", "process:2"]);
}

async function testCsvFormulaProtectionAndSingleStatus() {
  const api = loadWithFetch(async () => { throw new Error("not called"); });
  const item = { id: "1", authorName: "@a", desc: "=SUM(A1:A2)", url: "https://example.test/1" };
  const csv = api.buildReport({
    reportScannedItems: [item],
    reportItems: [item],
    reportFailedItems: [],
    reportVerifiedItems: [item],
    reportStillPresentItems: [],
    diagnostics: {},
    totalListed: 1,
    startedAt: "start",
    finishedAt: "finish",
    cancelled: false,
  }, { dryRun: false }, "csv");
  assert.match(csv, /"'=SUM\(A1:A2\)"/);
  assert.equal((csv.match(/verified_removed/g) || []).length, 1);
}

async function testFilters() {
  const api = loadWithFetch(async () => { throw new Error("not called"); });
  assert.deepEqual(Array.from(api.parseKeywords(" Cat, futebol, CAT ")), ["cat", "futebol", "cat"]);
  assert.equal(api.matchesKeywords("Meu GATO não conta", ["cat"]), false);
  assert.equal(api.matchesKeywords("A Cat Video", ["cat"]), true);
  assert.equal(api.matchesKeywords("anything", []), true);
}

async function testListingRequestAndResponse() {
  let captured;
  const api = loadWithFetch(async (url, options) => {
    captured = { url, options };
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        status_code: 0,
        hasMore: true,
        cursor: "30",
        itemList: [{ id: "1", desc: "Cat", author: { uniqueId: "tester" } }],
      }),
    };
  });
  const result = await api.getLikedItems("0", "sec-test");
  const url = new URL(captured.url);
  assert.equal(url.pathname, "/api/favorite/item_list/");
  assert.equal(url.searchParams.get("cursor"), "0");
  assert.equal(url.searchParams.get("secUid"), "sec-test");
  assert.equal(captured.options.credentials, "same-origin");
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].url, "https://www.tiktok.com/@tester/video/1");
  assert.equal(result.hasMore, true);
  assert.equal(result.nextCursor, "30");
  assert.equal(result.diagnostic.httpStatus, 200);
}

async function testListingErrorsStayErrors() {
  const forbidden = loadWithFetch(async () => ({ ok: false, status: 403, text: async () => "" }));
  await assert.rejects(
    forbidden.getLikedItems("0", "sec-test"),
    (error) => error.code === "SESSION_REJECTED" && error.httpStatus === 403
  );

  const invalidJson = loadWithFetch(async () => ({ ok: true, status: 200, text: async () => "Access Denied" }));
  await assert.rejects(
    invalidJson.getLikedItems("0", "sec-test"),
    (error) => error.code === "INVALID_JSON" && error.httpStatus === 200
  );
}

(async () => {
  await testFilters();
  await testLikedTabSelection();
  await testFinishedPanelHidesRunControls();
  await testListingRequestAndResponse();
  await testListingErrorsStayErrors();
  await testProcessesEachPageBeforeFetchingTheNext();
  await testCsvFormulaProtectionAndSingleStatus();
  console.log("script tests: ok");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
