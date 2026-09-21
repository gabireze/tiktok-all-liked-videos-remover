const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "background.js"), "utf8");

function createHarness(fetchImpl) {
  const listeners = new Map();
  const sessionStore = {};
  const hydration = {
    __DEFAULT_SCOPE__: {
      "webapp.app-context": {
        language: "pt-BR",
        region: "BR",
        csrfToken: "csrf-test",
        userAgent: "test-agent",
        odinId: "odin-test",
        wid: "device-test",
        user: { secUid: "sec-test" },
      },
    },
  };
  const document = {
    cookie: "s_v_web_id=verify-test; msToken=ms-test",
    getElementById(id) {
      return id === "__UNIVERSAL_DATA_FOR_REHYDRATION__"
        ? { textContent: JSON.stringify(hydration) }
        : null;
    },
  };
  const window = {
    screen: { width: 1920, height: 1080 },
    addEventListener(name, handler) { listeners.set(name, handler); },
    removeEventListener(name) { listeners.delete(name); },
    dispatchEvent(event) {
      const handler = listeners.get(event.type);
      if (handler) handler(event);
      return true;
    },
  };
  const chrome = {
    runtime: { onMessage: { addListener() {} } },
    scripting: { executeScript() {} },
    storage: { session: {
      get(key, callback) { callback({ [key]: sessionStore[key] }); },
      set(values, callback) { Object.assign(sessionStore, values); if (callback) callback(); },
      remove(key, callback) { delete sessionStore[key]; if (callback) callback(); },
    } },
    tabs: {
      create() {},
      onUpdated: { addListener() {}, removeListener() {} },
      onRemoved: { addListener() {} },
      get() {},
      update() {},
      sendMessage() { return Promise.resolve(); },
    },
  };
  class CustomEvent {
    constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
  }
  const context = vm.createContext({
    window,
    document,
    navigator: { language: "pt-BR", userAgent: "test-agent" },
    Intl,
    URLSearchParams,
    CustomEvent,
    fetch: fetchImpl,
    chrome,
    console,
    setTimeout,
    clearTimeout,
    AbortController,
  });
  vm.runInContext(source, context, { filename: "background.js" });
  return { context, window, listeners, sessionStore };
}

async function flushPromises() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

async function testModernContext() {
  const harness = createHarness(async () => { throw new Error("not called"); });
  const result = vm.runInContext("getTikTokContext()", harness.context);
  assert.equal(result.secUid, "sec-test");
  assert.equal(result.csrfToken, "csrf-test");
  assert.equal(result.deviceId, "device-test");
  assert.equal(result.region, "BR");
  assert.equal(result.contextSource, "rehydration-script");
}

async function testSuccessfulUnlikeRequestShape() {
  let captured;
  const harness = createHarness(async (url, options) => {
    captured = { url, options };
    return { ok: true, status: 200, text: async () => JSON.stringify({ status_code: 0 }) };
  });
  vm.runInContext("setupPageRemoveListener()", harness.context);
  let result;
  harness.window.addEventListener("tlr-remove-like-result", (event) => { result = event.detail; });
  harness.window.dispatchEvent(new harness.context.CustomEvent("tlr-remove-like", { detail: { awemeId: "123" } }));
  await flushPromises();

  assert.equal(result.success, true);
  assert.equal(result.httpStatus, 200);
  const url = new URL(captured.url);
  assert.equal(url.pathname, "/api/commit/item/digg/");
  assert.equal(url.searchParams.get("aweme_id"), "123");
  assert.equal(url.searchParams.get("type"), "0");
  assert.equal(url.searchParams.get("region"), "BR");
  assert.equal(url.searchParams.get("device_id"), "device-test");
  assert.equal(url.searchParams.get("verifyFp"), "verify-test");
  assert.equal(url.searchParams.get("msToken"), "ms-test");
  assert.equal(captured.options.credentials, "same-origin");
  assert.equal(captured.options.headers["tt-csrf-token"], "csrf-test");
}

async function testRateLimitIsNotReportedAsSuccess() {
  const harness = createHarness(async () => ({ ok: false, status: 429, text: async () => "" }));
  vm.runInContext("setupPageRemoveListener()", harness.context);
  let result;
  harness.window.addEventListener("tlr-remove-like-result", (event) => { result = event.detail; });
  harness.window.dispatchEvent(new harness.context.CustomEvent("tlr-remove-like", { detail: { awemeId: "456" } }));
  await flushPromises();

  assert.equal(result.success, false);
  assert.equal(result.errorCode, "RATE_LIMITED");
  assert.equal(result.httpStatus, 429);
}

async function testActiveJobPersistsInSessionStorage() {
  const harness = createHarness(async () => { throw new Error("not called"); });
  await new Promise((resolve) => harness.context.setStoredActiveJob({ tabId: 42, startedAt: 1 }, resolve));
  const stored = await new Promise((resolve) => harness.context.getStoredActiveJob(resolve));
  assert.equal(stored.tabId, 42);
  await new Promise((resolve) => harness.context.clearStoredActiveJob(42, resolve));
  const cleared = await new Promise((resolve) => harness.context.getStoredActiveJob(resolve));
  assert.equal(cleared, null);
}

async function testActiveJobExpiresAfterTwelveHours() {
  const harness = createHarness(async () => { throw new Error("not called"); });
  const hour = 60 * 60 * 1000;
  assert.equal(harness.context.isActiveJobStale({ tabId: 42, startedAt: 1 * hour }, 12 * hour), false);
  assert.equal(harness.context.isActiveJobStale({ tabId: 42, startedAt: 1 * hour }, 14 * hour), true);
  assert.equal(harness.context.isActiveJobStale({ tabId: 42 }, 14 * hour), true);
}

async function testInFlightRemovalCanBeCancelled() {
  const harness = createHarness((url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener("abort", () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      reject(error);
    });
  }));
  vm.runInContext("setupPageRemoveListener()", harness.context);
  let result;
  harness.window.addEventListener("tlr-remove-like-result", (event) => { result = event.detail; });
  harness.window.dispatchEvent(new harness.context.CustomEvent("tlr-remove-like", { detail: { awemeId: "789" } }));
  harness.window.dispatchEvent(new harness.context.CustomEvent("tlr-cancel-remove"));
  await flushPromises();
  assert.equal(result.success, false);
  assert.equal(result.errorCode, "CANCELLED");
}

(async () => {
  await testModernContext();
  await testSuccessfulUnlikeRequestShape();
  await testRateLimitIsNotReportedAsSuccess();
  await testActiveJobPersistsInSessionStorage();
  await testActiveJobExpiresAfterTwelveHours();
  await testInFlightRemovalCanBeCancelled();
  console.log("background tests: ok");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
