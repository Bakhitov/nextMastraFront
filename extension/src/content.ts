function ensurePanel(): HTMLElement {
  const existing = document.getElementById("__mastra_panel");
  if (existing) return existing as HTMLElement;

  const host = document.createElement("div");
  host.id = "__mastra_panel";
  host.style.position = "fixed";
  host.style.top = "0";
  host.style.right = "0";
  host.style.height = "100%";
  host.style.width = "420px";
  host.style.maxWidth = "min(90vw, 480px)";
  host.style.zIndex = "2147483647";
  host.style.background = "#f6f7fb";
  host.style.borderLeft = "1px solid #e5e7eb";
  host.style.boxShadow = "-8px 0 24px rgba(17,24,39,0.06)";
  host.style.display = "none";

  const shadow = host.attachShadow({ mode: "open" });
  const wrapper = document.createElement("div");
  wrapper.style.height = "100%";
  wrapper.style.width = "100%";
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";

  const bar = document.createElement("div");
  bar.style.height = "40px";
  bar.style.display = "flex";
  bar.style.alignItems = "center";
  bar.style.justifyContent = "space-between";
  bar.style.padding = "0 10px";
  bar.style.background = "#ffffff";
  bar.style.color = "#111827";
  bar.style.borderBottom = "1px solid #e5e7eb";

  const title = document.createElement("div");
  title.style.fontWeight = "600";
  // label + version + email
  const label = document.createElement("span");
  label.textContent = "Agent n8n";
  const ver = document.createElement("span");
  ver.textContent = "v0.1";
  ver.style.fontSize = "11px";
  ver.style.color = "#6b7280";
  ver.style.marginLeft = "6px";
  ver.style.verticalAlign = "middle";
  const emailEl = document.createElement("span");
  emailEl.style.fontSize = "11px";
  emailEl.style.color = "#6b7280";
  emailEl.style.marginLeft = "8px";
  try {
    // @ts-ignore - promise-based get (MV3)
    chrome.storage?.local?.get?.(["user"])?.then?.((stored: any) => {
      const email = stored?.user?.email || "";
      if (email) emailEl.textContent = `— ${email}`;
    })?.catch?.(() => {});
  } catch {}
  title.append(label, ver, emailEl);
  const close = document.createElement("button");
  close.textContent = "×";
  close.style.background = "transparent";
  close.style.border = "none";
  close.style.color = "#111827";
  close.style.fontSize = "20px";
  close.style.cursor = "pointer";
  close.addEventListener("click", () => (host.style.display = "none"));
  bar.append(title, close);

  const frame = document.createElement("iframe");
  // @ts-ignore
  const url = chrome.runtime.getURL("popup.html");
  frame.src = url;
  frame.style.border = "0";
  frame.style.width = "100%";
  frame.style.height = "calc(100% - 40px)";
  frame.style.background = "transparent";

  wrapper.append(bar, frame);
  shadow.appendChild(wrapper);
  document.documentElement.appendChild(host);
  return host;
}

// Floating button removed: toolbar + side panel become primary entry
function injectButton() { return null as any; }

// Initialize only on toolbar click via background message
try {
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "toggle-panel") {
      const panel = ensurePanel();
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    } else if (message?.type === "close-panel") {
      const panel = document.getElementById("__mastra_panel") as HTMLElement | null;
      if (panel) panel.style.display = "none";
    }
  });
} catch {}


