chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "send_to_agent", title: "Отправить текст ассистенту", contexts: ["selection"] });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "send_to_agent" && info.selectionText) {
    const stored = await chrome.storage.local.get(["sb-access-token", "accessToken", "user"]);
    const accessToken = stored?.["sb-access-token"] || stored?.["accessToken"];
    const user = stored?.user;
    if (!accessToken || !user?.id) return;
    try {
      const isActiveStored = (await chrome.storage.local.get(["is_active"]))?.is_active ?? false;
      let isActive = Boolean(isActiveStored);
      if (!isActive) {
        // try fetch profile quickly to check flag
        const baseTmp = (typeof (self as any)?.importScripts === 'function' && (self as any)?.VITE_API_BASE_URL)
          || (typeof (globalThis as any)?.__VITE__ !== 'undefined' && (globalThis as any).__VITE__.VITE_API_BASE_URL)
          || "http://localhost:3000";
        try {
          const me = await fetch(`${baseTmp}/api/v1/users/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
          if (me.ok) {
            const j = await me.json();
            isActive = Boolean(j?.profile?.is_active);
            await chrome.storage.local.set({ is_active: isActive });
          }
        } catch {}
      }
      if (!isActive) return;
    } catch {}
    try {
      // Use same base as popup code
      // @ts-ignore
      const base = (typeof (self as any)?.importScripts === 'function' && (self as any)?.VITE_API_BASE_URL)
        // Fallback if build-time var is not injected in service worker context
        || (typeof (globalThis as any)?.__VITE__ !== 'undefined' && (globalThis as any).__VITE__.VITE_API_BASE_URL)
        // Last resort
        || "http://localhost:3000";
      const threadKey = `threadId:n8nAgent:${user.id}`;
      const saved = await chrome.storage.local.get([threadKey]);
      let threadId: string | null = saved?.[threadKey] ?? null;
      if (!threadId) {
        const threadsRes = await fetch(`${base}/api/v1/threads?resourceId=${encodeURIComponent(user.id)}&agentId=n8nAgent`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (threadsRes.ok) {
          const list = (await threadsRes.json()) as any[];
          threadId = Array.isArray(list) && list.length > 0 ? (list[0]?.id || list[0]?.threadId || null) : null;
          if (threadId) {
            await chrome.storage.local.set({ [threadKey]: threadId });
          }
        }
      }
      if (!threadId) {
        const createdRes = await fetch(`${base}/api/v1/threads`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ title: "Быстрый ввод", metadata: {}, resourceId: user.id, agentId: "n8nAgent" }),
        });
        if (createdRes.ok) {
          const created = await createdRes.json();
          threadId = created?.id || created?.threadId || null;
          if (threadId) {
            await chrome.storage.local.set({ [threadKey]: threadId });
          }
        }
      }
      if (!threadId) return;

      await fetch(`${base}/api/v1/agents/n8nAgent/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ messages: [{ role: "user", content: info.selectionText }], memory: { thread: threadId, resource: user.id } }),
      });
    } catch {}
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  try {
    // Не блокируем открытие UI по is_active: пользователь должен иметь доступ к логину/настройкам,
    // сами страницы уже ограничивают доступ к функционалу при is_active=false
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "toggle-panel" });
      // if content script not injected yet, execute and retry
    } catch {
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["src/content.ts"] });
        await chrome.tabs.sendMessage(tab.id, { type: "toggle-panel" });
      } catch {}
    }
    const [{ result: hasPanel }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => Boolean(document.getElementById("__mastra_panel")),
    });
    if (!hasPanel) {
      // Fallback: open Chrome Side Panel with our app at full height
      try {
        // @ts-ignore - sidePanel is available in MV3 with proper permissions
        await chrome.sidePanel.setOptions({ tabId: tab.id, path: "popup.html", enabled: true });
        // @ts-ignore
        await chrome.sidePanel.open({ tabId: tab.id });
      } catch {
        // If sidePanel API not available, fallback to opening popup.html in new tab
        await chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
      }
    }
  } catch {}
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "close-panel") {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;
        // Try close embedded panel if exists
        const [{ result: closed }] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const panel = document.getElementById("__mastra_panel") as HTMLElement | null;
            if (panel && panel.style.display !== "none") {
              panel.style.display = "none";
              return true;
            }
            return false;
          },
        });
        if (!closed) {
          try {
            // @ts-ignore
            await chrome.sidePanel.setOptions({ tabId: tab.id, enabled: false });
          } catch {}
        }
      } catch {}
    })();
  }
});


