let activeJobTabId = null;
const ACTIVE_JOB_KEY = "tlrActiveJob";
const ACTIVE_JOB_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function getTikTokContext() {
  try {
    var data = window.__$UNIVERSAL_DATA$__ || null;
    var contextSource = "legacy-global";
    if (!data || !data.__DEFAULT_SCOPE__) {
      var hydration = document.getElementById("__UNIVERSAL_DATA_FOR_REHYDRATION__");
      if (hydration && hydration.textContent) {
        data = JSON.parse(hydration.textContent);
        contextSource = "rehydration-script";
      }
    }
    if (!data || !data.__DEFAULT_SCOPE__) return null;
    var ctx = data.__DEFAULT_SCOPE__["webapp.app-context"];
    if (!ctx || !ctx.user) return null;
    var secUid = ctx.user.secUid || null;
    var csrfToken = ctx.csrfToken || null;
    var userAgent = ctx.userAgent || (typeof navigator !== "undefined" ? navigator.userAgent : "");
    var odinId = ctx.odinId || "";
    return {
      secUid: secUid,
      csrfToken: csrfToken,
      userAgent: userAgent,
      odinId: odinId,
      deviceId: ctx.wid || ctx.encryptedWebid || "",
      region: ctx.region || "",
      language: ctx.language || "",
      contextSource: contextSource,
    };
  } catch (e) {
    return null;
  }
}

/** Roda no contexto da página (world: MAIN) para escutar tlr-remove-like e fazer o POST
 *  de remoção de like como o console, sem ser bloqueado pelo CSP da página. */
function setupPageRemoveListener() {
  if (window.__tlrPageRemoveReady) return;
  window.__tlrPageRemoveReady = true;
  window.addEventListener("tlr-cancel-remove", function () {
    if (window.__tlrRemoveController) window.__tlrRemoveController.abort();
  });
  window.addEventListener("tlr-remove-like", function (e) {
    var awemeId = e.detail && e.detail.awemeId;
    if (!awemeId) {
      window.dispatchEvent(new CustomEvent("tlr-remove-like-result", { detail: { awemeId: "", success: false, error: "no awemeId" } }));
      return;
    }
    var ctx, csrfToken, userAgent, odinId, deviceId, region, language;
    try {
      var data = window.__$UNIVERSAL_DATA$__ || null;
      if (!data || !data.__DEFAULT_SCOPE__) {
        var hydration = document.getElementById("__UNIVERSAL_DATA_FOR_REHYDRATION__");
        if (hydration && hydration.textContent) data = JSON.parse(hydration.textContent);
      }
      ctx = data && data.__DEFAULT_SCOPE__ && data.__DEFAULT_SCOPE__["webapp.app-context"];
      if (!ctx) throw new Error("no context");
      csrfToken = ctx.csrfToken;
      userAgent = ctx.userAgent || (typeof navigator !== "undefined" ? navigator.userAgent : "");
      odinId = ctx.odinId || "";
      deviceId = ctx.wid || ctx.encryptedWebid || "";
      region = ctx.region || "";
      language = ctx.language || (typeof navigator !== "undefined" ? navigator.language : "en");
    } catch (err) {
      window.dispatchEvent(new CustomEvent("tlr-remove-like-result", { detail: { awemeId: awemeId, success: false, error: String(err && err.message) } }));
      return;
    }
    if (!csrfToken) {
      window.dispatchEvent(new CustomEvent("tlr-remove-like-result", { detail: { awemeId: awemeId, success: false, error: "csrfToken not found" } }));
      return;
    }
    var params = new URLSearchParams({
      aid: "1988",
      app_language: language || "en",
      app_name: "tiktok_web",
      aweme_id: String(awemeId),
      browser_language: (typeof navigator !== "undefined" && navigator.language) || language || "en",
      browser_name: "Mozilla",
      browser_online: "true",
      browser_platform: "Win32",
      browser_version: userAgent,
      channel: "tiktok_web",
      cookie_enabled: "true",
      data_collection_enabled: "true",
      device_platform: "web_pc",
      focus_state: "true",
      from_page: "video",
      history_len: "2",
      is_fullscreen: "false",
      is_page_visible: "true",
      odinId: odinId,
      os: "windows",
      priority_region: region,
      referer: "",
      region: region,
      screen_height: String(window.screen && window.screen.height || 864),
      screen_width: String(window.screen && window.screen.width || 1536),
      type: "0",
      tz_name: typeof Intl !== "undefined" && Intl.DateTimeFormat && Intl.DateTimeFormat().resolvedOptions ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC",
      user_is_login: "true",
      webcast_language: language || "en",
    });
    if (deviceId) params.set("device_id", deviceId);
    try {
      var cookie = document.cookie || "";
      var verifyMatch = cookie.match(/(?:^|;\s*)s_v_web_id=([^;]+)/);
      var msTokenMatch = cookie.match(/(?:^|;\s*)msToken=([^;]+)/);
      if (verifyMatch && verifyMatch[1]) params.set("verifyFp", verifyMatch[1]);
      if (msTokenMatch && msTokenMatch[1]) params.set("msToken", msTokenMatch[1]);
    } catch (cookieError) {}
    var url = "https://www.tiktok.com/api/commit/item/digg/?" + params.toString();
    var controller = new AbortController();
    window.__tlrRemoveController = controller;
    fetch(url, {
      method: "POST",
      headers: { accept: "*/*", "accept-language": "en,en-US;q=0.9", "content-type": "application/x-www-form-urlencoded", "tt-csrf-token": csrfToken },
      credentials: "same-origin",
      signal: controller.signal,
      body: "",
    })
      .then(function (res) {
        return res.text().then(function (raw) { return { res: res, raw: raw }; });
      })
      .then(function (result) {
        var res = result.res;
        var raw = result.raw;
        if (!res.ok) {
          window.dispatchEvent(new CustomEvent("tlr-remove-like-result", { detail: {
            awemeId: awemeId,
            success: false,
            error: "HTTP " + res.status,
            errorCode: res.status === 429 ? "RATE_LIMITED" : (res.status === 401 || res.status === 403 ? "SESSION_REJECTED" : "HTTP_ERROR"),
            httpStatus: res.status,
          } }));
          return;
        }
        if (!raw || !raw.trim()) {
          window.dispatchEvent(new CustomEvent("tlr-remove-like-result", { detail: { awemeId: awemeId, success: true, httpStatus: res.status } }));
          return;
        }
        var json;
        try { json = JSON.parse(raw); } catch (e) {
          window.dispatchEvent(new CustomEvent("tlr-remove-like-result", { detail: { awemeId: awemeId, success: false, error: "Invalid JSON", errorCode: "INVALID_JSON", httpStatus: res.status } }));
          return;
        }
        if (json.status_code !== 0) {
          window.dispatchEvent(new CustomEvent("tlr-remove-like-result", { detail: { awemeId: awemeId, success: false, error: JSON.stringify(json), errorCode: "TIKTOK_REJECTED", httpStatus: res.status } }));
          return;
        }
        window.dispatchEvent(new CustomEvent("tlr-remove-like-result", { detail: { awemeId: awemeId, success: true, httpStatus: res.status } }));
      })
      .catch(function (err) {
        var cancelled = err && err.name === "AbortError";
        window.dispatchEvent(new CustomEvent("tlr-remove-like-result", { detail: { awemeId: awemeId, success: false, error: String(err && err.message), errorCode: cancelled ? "CANCELLED" : "NETWORK_ERROR" } }));
      })
      .finally(function () {
        if (window.__tlrRemoveController === controller) window.__tlrRemoveController = null;
      });
  });
}

function getStoredActiveJob(callback) {
  if (!chrome.storage || !chrome.storage.session) {
    callback(activeJobTabId == null ? null : { tabId: activeJobTabId });
    return;
  }
  chrome.storage.session.get(ACTIVE_JOB_KEY, (data) => callback(data && data[ACTIVE_JOB_KEY] || null));
}

function setStoredActiveJob(job, callback) {
  activeJobTabId = job && job.tabId != null ? job.tabId : null;
  if (!chrome.storage || !chrome.storage.session) {
    if (callback) callback();
    return;
  }
  if (job) chrome.storage.session.set({ [ACTIVE_JOB_KEY]: job }, callback);
  else chrome.storage.session.remove(ACTIVE_JOB_KEY, callback);
}

function clearStoredActiveJob(tabId, callback) {
  getStoredActiveJob((job) => {
    if (!job || tabId == null || job.tabId === tabId) setStoredActiveJob(null, callback);
    else if (callback) callback();
  });
}

function isActiveJobStale(job, now = Date.now()) {
  return !job || !job.startedAt || now - job.startedAt > ACTIVE_JOB_MAX_AGE_MS;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "runFinished") {
    clearStoredActiveJob(sender.tab && sender.tab.id, () => sendResponse({ ok: true }));
    return true;
  }

  if (request.action === "getSecUid" || request.action === "getLikeContext") {
    var tabId = sender.tab && sender.tab.id;
    if (!tabId) {
      sendResponse(request.action === "getLikeContext" ? { secUid: null, csrfToken: null, userAgent: "", odinId: "" } : { secUid: null });
      return true;
    }
    chrome.scripting.executeScript(
      { target: { tabId }, world: "MAIN", func: getTikTokContext },
      function (results) {
        var ctx = (results && results[0] && results[0].result) || null;
        if (request.action === "getLikeContext") {
          sendResponse({
            secUid: ctx ? ctx.secUid : null,
            csrfToken: ctx ? ctx.csrfToken : null,
            userAgent: ctx ? ctx.userAgent : "",
            odinId: ctx ? ctx.odinId : "",
            deviceId: ctx ? ctx.deviceId : "",
            region: ctx ? ctx.region : "",
            language: ctx ? ctx.language : "",
            contextSource: ctx ? ctx.contextSource : "",
          });
        } else {
          sendResponse({ secUid: ctx && ctx.secUid ? ctx.secUid : null });
        }
      }
    );
    return true;
  }

  if (request.action === "injectPageRemoveListener") {
    var tabId = sender.tab && sender.tab.id;
    if (!tabId) {
      sendResponse({ ok: false, error: "no tab" });
      return true;
    }
    chrome.scripting.executeScript(
      { target: { tabId }, world: "MAIN", func: setupPageRemoveListener },
      function () {
        sendResponse(chrome.runtime.lastError ? { ok: false, error: String(chrome.runtime.lastError) } : { ok: true });
      }
    );
    return true;
  }

  if (request.action === "startRemovingLikes") {
    const config = request.config || request.payload?.config || {};
    const startNewJob = () => {
      chrome.tabs.create({ url: "https://www.tiktok.com/profile", active: true }, (tab) => {
        const tabId = tab && tab.id;
        if (tabId == null) {
          sendResponse({ ok: false, error: "tab_create_failed" });
          return;
        }
        setStoredActiveJob({ tabId, startedAt: Date.now(), dryRun: !!config.dryRun }, () => {
          const listener = (id, info) => {
            if (id === tabId && info.status === "complete") {
              chrome.tabs.onUpdated.removeListener(listener);
              setTimeout(() => {
                chrome.tabs.get(tabId, (tabInfo) => {
                  const url = (tabInfo && tabInfo.url) || "";
                  const isForyou = /\/foryou(\?|$)/i.test(url);
                  const isLogin = /\/login(\?|$|\/)/i.test(url);
                  const notLoggedInRedirect = isForyou || isLogin;
                  const payload = { ...config, notLoggedInRedirect };
                  function sendConfig(attempt) {
                    chrome.tabs.sendMessage(tabId, { action: "startRemovingLikes", config: payload })
                      .catch(() => {
                        if (attempt < 3) setTimeout(() => sendConfig(attempt + 1), 800);
                        else clearStoredActiveJob(tabId);
                      });
                  }
                  sendConfig(0);
                });
              }, 4000);
            }
          };
          chrome.tabs.onUpdated.addListener(listener);
          sendResponse({ ok: true, tabId });
        });
      });
    };

    getStoredActiveJob((job) => {
      if (!job || job.tabId == null) {
        startNewJob();
        return;
      }
      if (isActiveJobStale(job)) {
        clearStoredActiveJob(job.tabId, startNewJob);
        return;
      }
      chrome.tabs.get(job.tabId, (existingTab) => {
        if (chrome.runtime.lastError || !existingTab) {
          clearStoredActiveJob(job.tabId, startNewJob);
          return;
        }
        activeJobTabId = job.tabId;
        chrome.tabs.update(job.tabId, { active: true });
        sendResponse({ ok: false, error: "already_running", tabId: job.tabId });
      });
    });
    return true;
  }
  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  clearStoredActiveJob(tabId);
});
