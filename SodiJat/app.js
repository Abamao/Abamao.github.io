const $ = (id) => document.getElementById(id);
const STORE_KEY = "sodijat.state.v1";
const WEBLLM_VERSION = "0.2.89";

// 只挑体积相对友好、覆盖中英文的场景化模型；完整列表来自 WebLLM prebuiltAppConfig。
const LOCAL_MODELS = [
  { id: "Qwen3-1.7B-q4f16_1-MLC", name: "Qwen3 1.7B", desc: "本地首选，中文问答比 0.8B 稳得多，不容易复读。", vram: "约 2.0 GB", tags: ["中文", "推荐"], thinkingSupported: true },
  { id: "Qwen3.5-0.8B-q4f16_1-MLC", name: "Qwen3.5 0.8B", desc: "极轻量，适合尝鲜；短问题容易绕圈和复读。", vram: "约 1.6 GB", tags: ["中文", "轻量"], thinkingSupported: true },
  { id: "Qwen2.5-3B-Instruct-q4f16_1-MLC", name: "Qwen2.5 3B", desc: "本地质量更高的选择，回答更完整，代价是更占资源。", vram: "约 2.5 GB", tags: ["中文", "高质量"], thinkingSupported: false },
  { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", name: "Llama 3.2 1B", desc: "英文短问答和代码片段快得很，中文表现一般。", vram: "约 0.9 GB", tags: ["英文", "最快"], thinkingSupported: false },
  { id: "SmolLM2-1.7B-Instruct-q4f16_1-MLC", name: "SmolLM2 1.7B", desc: "小巧的通用模型，适合没有独显的设备。", vram: "约 1.8 GB", tags: ["轻量", "英文"], thinkingSupported: false },
  { id: "Phi-3.5-mini-instruct-q4f16_1-MLC", name: "Phi-3.5 mini", desc: "微软出的推理小模型，逻辑类问题表现不错。", vram: "约 3.7 GB", tags: ["推理", "英文"], thinkingSupported: false },
  { id: "Qwen3.5-4B-q4f16_1-MLC", name: "Qwen3.5 4B", desc: "高阶入门款，中文理解和长回答明显更稳。", vram: "约 3.9 GB", tags: ["高阶", "中文"], thinkingSupported: true },
  { id: "DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC", name: "Jat5.5", desc: "YziStudio 自主训练的 18B 模型，主打推理与数学。", vram: "约 5.1 GB", tags: ["18B", "推理", "YziStudio"], thinkingSupported: true, systemPrompt: "你是由YziStudio自主训练的18B模型，名称Jat5.5-18B。" },
  { id: "Qwen3-8B-q4f16_1-MLC", name: "Qwen3 8B", desc: "本地重型选手，综合质量高，适合认真对话。", vram: "约 5.7 GB", tags: ["高阶", "中文"], thinkingSupported: true },
  { id: "Qwen3.5-9B-q4f16_1-MLC", name: "Qwen3.5 9B", desc: "当前列表里的旗舰，质量最好，也最吃显存和硬盘。", vram: "约 6.4 GB", tags: ["旗舰", "高阶"], thinkingSupported: true },
  { id: "Llama-2-13b-chat-hf-q4f16_1-MLC", name: "Llama 2 13B", desc: "预置里没有 18B，这是 9B 与 70B 之间最接近的大模型档；英文为主，显存约 11.8 GB。", vram: "约 11.8 GB", tags: ["大模型", "英文"], thinkingSupported: false },
  { id: "Llama-3.1-70B-Instruct-q3f16_1-MLC", name: "Llama 3.1 70B", desc: "怪物级模型，约 31 GB 显存。普通设备请路过，别硬刚。", vram: "约 31 GB", tags: ["怪物级", "危险"], thinkingSupported: false, extreme: true },
];

const LOCAL_SYSTEM_PROMPT = "你是 SodiJat，一个简洁、准确、友善的 AI 助手。回答时要参考上面对话历史里用户说过的信息，保持上下文连续；如果历史里已经有明确答案，就直接回答，不要反问。用户只发一两个字的短消息且确实缺少上下文时，才给出最可能的一种解释，并用一句话反问确认。不要声称自己是 Qwen、通义千问或其他任何模型。回答不要重复同一句话，不要输出相同的段落。";

const INTENSITY_PRESETS = {
  slow:        { label: "Slow",        desc: "尽量避免电脑压力", short: "省电",     thinking: false, temperature: 0.5, top_p: 0.85, maxTokens: 768,  repetition_penalty: 1.2,  frequency_penalty: 0.4,  presence_penalty: 0.25 },
  medium:      { label: "Medium",      desc: "正常",             short: "正常",     thinking: false, temperature: 0.6, top_p: 0.9,  maxTokens: 1536, repetition_penalty: 1.18, frequency_penalty: 0.35, presence_penalty: 0.2 },
  speed:       { label: "Speed",       desc: "加紧思考强度",     short: "加紧",     thinking: true,  temperature: 0.7, top_p: 0.92, maxTokens: 2048, repetition_penalty: 1.14, frequency_penalty: 0.3,  presence_penalty: 0.15 },
  speedlimits: { label: "SpeedLimits", desc: "特别快的思考",     short: "极速",     thinking: true,  temperature: 0.8, top_p: 0.95, maxTokens: 3072, repetition_penalty: 1.1,  frequency_penalty: 0.25, presence_penalty: 0.1 },
  ultra:       { label: "Ultra",       desc: "尽快消耗电脑算力", short: "火力全开", thinking: true,  temperature: 0.9, top_p: 0.98, maxTokens: 4096, repetition_penalty: 1.05, frequency_penalty: 0.15, presence_penalty: 0.05 },
};
const INTENSITY_LEVELS = ["slow", "medium", "speed", "speedlimits", "ultra"];

function isCrossTurnRepeat(current, previous) {
  if (!current || !previous) return false;
  const norm = (s) => String(s).replace(/\s+/g, "").slice(0, 80);
  const a = norm(current);
  const b = norm(previous);
  return a.length >= 12 && (a === b || a.includes(b.slice(0, 40)) || b.includes(a.slice(0, 40)));
}

function tidyHistory(messages) {
  return messages.map((msg) => {
    if (msg.role !== "assistant" || msg.content.length < 1200) return msg;
    const tail = msg.content.slice(-24);
    if (tail.length >= 12 && msg.content.split(tail).length - 1 >= 4) {
      return { role: msg.role, content: msg.content.slice(0, 300) + "\n\n（历史回复因复读已截断）" };
    }
    return msg;
  });
}

const defaultState = () => ({
  activeId: null,
  conversations: [],
  settings: {
    local: { modelId: LOCAL_MODELS[0].id, intensity: "medium", thinkingEnabled: false },
  },
});

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      settings: {
        local: { ...base.settings.local, ...(parsed.settings?.local || {}) },
      },
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
    };
  } catch (error) {
    console.warn("读取本地状态失败，已使用默认配置", error);
    return defaultState();
  }
}

let state = loadState();
let currentId = state.activeId;
let busy = false;
let cliOpen = false;
let cliBooted = false;
let cliHistory = [];
let cliHistoryIndex = 0;
let cliPending = null;
let lastRenderedModelId = null;
let perfState = {
  step: 1,
  ram: null,
  vram: null,
  gpu: "",
  preference: "balanced",
  language: "zh",
  platform: "",
  cores: 0,
  cpuName: "",
  cpuCores: 0,
  detectedGpu: "",
};
let localEngine = null;
let localReady = false;
let webgpuSupported = false;
let webgpuReason = "";
let loadedModelId = null;
let cachedModels = new Set();
let sidebarOpen = false;

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const escapeHtml = (text) => String(text ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));

function renderMarkdown(input) {
  let text = escapeHtml(input);
  const blocks = [];
  const inlines = [];

  text = text.replace(/```([\w+-]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const token = `\u0001CODE${blocks.length}\u0001`;
    const cls = lang ? ` class="lang-${escapeHtml(lang)}"` : "";
    blocks.push(`<pre><code${cls}>${String(code).replace(/\n$/, "")}</code></pre>`);
    return token;
  });

  text = text.replace(/`([^`\n]+)`/g, (_, code) => {
    const token = `\u0001IN${inlines.length}\u0001`;
    inlines.push(`<code>${code}</code>`);
    return token;
  });

  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  text = text.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/^##\s+(.+)$/gm, "<h2>$1</h2>")
    .replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");
  text = text.replace(/^>\s?(.+)$/gm, "<blockquote>$1</blockquote>");
  text = text.replace(/^\s*[-*]\s+(.+)$/gm, "<li>$1</li>");
  text = text.replace(/(?:<li>[\s\S]*?<\/li>\s*)+/g, (m) => `<ul>${m}</ul>`);
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");

  text = text.split(/\n{2,}/).map((block) => {
    if (/^\s*<(pre|h[1-6]|ul|ol|blockquote|p)\b/.test(block)) return block;
    return `<p>${block.replace(/\n/g, "<br>")}</p>`;
  }).join("\n");

  text = text.replace(/\u0001IN(\d+)\u0001/g, (_, i) => inlines[Number(i)] || "");
  text = text.replace(/\u0001CODE(\d+)\u0001/g, (_, i) => blocks[Number(i)] || "");
  return text;
}

function saveState() {
  try {
    state.activeId = currentId;
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("保存状态失败", error);
  }
}

function currentConv() {
  return state.conversations.find((c) => c.id === currentId) || null;
}

function ensureConversation() {
  if (currentConv()) return currentConv();
  const conv = { id: uid(), title: "新的对话", messages: [], createdAt: Date.now(), updatedAt: Date.now() };
  state.conversations.unshift(conv);
  currentId = conv.id;
  saveState();
  return conv;
}

function convTitle(conv) {
  const first = conv.messages.find((m) => m.role === "user");
  if (!first) return "新的对话";
  return first.content.replace(/\s+/g, " ").slice(0, 24) || "新的对话";
}

/* ---------- Toast ---------- */
function toast(message, kind = "") {
  const node = document.createElement("div");
  node.className = `toast ${kind}`;
  node.textContent = message;
  $("toastHost").appendChild(node);
  setTimeout(() => node.remove(), 3600);
}

/* ---------- Rendering ---------- */
function renderConvList() {
  const list = $("convList");
  list.innerHTML = "";
  if (!state.conversations.length) {
    list.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:8px">还没有会话，点上面的按钮开一个。</div>';
    return;
  }
  for (const conv of state.conversations) {
    const btn = document.createElement("button");
    btn.className = "conv-item" + (conv.id === currentId ? " active" : "");
    btn.innerHTML = `<svg><use href="#i-chat"/></svg><span class="conv-name">${escapeHtml(convTitle(conv))}</span><span class="conv-mode">本地</span>`;
    btn.onclick = () => {
      if (busy) return toast("生成还没结束，先停一下再切换。", "err");
      currentId = conv.id;
      syncModeUI();
      renderAll();
      saveState();
      closeSidebar();
    };
    list.appendChild(btn);
  }
}

function thinkingHtml(text, open = true) {
  if (!text) return "";
  return `<details class="thinking-block" ${open ? "open" : ""}><summary>思考过程</summary><div class="thinking-content">${escapeHtml(text)}</div></details>`;
}

function messageNode(msg) {
  const wrap = document.createElement("div");
  wrap.className = `msg ${msg.role}`;
  wrap.dataset.id = msg.id;
  const isUser = msg.role === "user";
  const avatar = isUser
    ? '<div class="msg-avatar">你</div>'
    : '<div class="msg-avatar"><svg><use href="#i-spark"/></svg></div>';
  const mode = isUser ? "" : '<span class="mini-mode">本地</span>';
  const actions = isUser ? "" : `<div class="msg-actions"><button class="mini-action" data-copy="${msg.id}">复制</button></div>`;
  const thinking = !isUser && msg.thinking ? thinkingHtml(msg.thinking, false) : "";
  wrap.innerHTML = `${avatar}<div class="msg-body"><div class="msg-meta">${isUser ? "你" : "SodiJat"}${mode}</div><div class="bubble">${thinking}${renderMarkdown(msg.content)}${msg.streaming ? '<span class="cursor-blink"></span>' : ""}</div>${actions}</div>`;
  return wrap;
}

function renderMessages() {
  const host = $("messages");
  host.innerHTML = "";
  const conv = currentConv();
  const messages = conv?.messages || [];
  for (const msg of messages) host.appendChild(messageNode(msg));
  $("emptyState").hidden = messages.length > 0;
  $("convTitle").textContent = conv ? convTitle(conv) : "新的对话";
  host.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.onclick = () => copyText(messages.find((m) => m.id === btn.dataset.copy)?.content || "");
  });
  scrollToBottom(true);
}

function updateMessageDOM(id, content, streaming, thinkingText) {
  const node = $("messages").querySelector(`[data-id="${id}"] .bubble`);
  if (!node) return;
  const msg = currentConv()?.messages.find((m) => m.id === id);
  const think = thinkingText !== undefined ? thinkingText : (msg?.thinking || "");
  const existing = node.querySelector(".thinking-block");
  const open = existing ? existing.open : !!streaming;
  node.innerHTML = thinkingHtml(think, open) + renderMarkdown(content) + (streaming ? '<span class="cursor-blink"></span>' : "");
  const scroll = $("chatScroll");
  const nearBottom = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 140;
  if (nearBottom) scroll.scrollTop = scroll.scrollHeight;
}

function scrollToBottom(force = false) {
  const scroll = $("chatScroll");
  if (force) requestAnimationFrame(() => { scroll.scrollTop = scroll.scrollHeight; });
}

function renderAll() {
  renderConvList();
  renderMessages();
  syncModeUI();
  renderModelGrid();
}

function closeIntensityPanel() {
  $("intensityPanel").hidden = true;
  $("intensityPopover").classList.remove("open");
  $("intensityTrigger").setAttribute("aria-expanded", "false");
}

function toggleIntensityPanel() {
  if ($("intensityPanel").hidden) {
    $("intensityPanel").hidden = false;
    $("intensityPopover").classList.add("open");
    $("intensityTrigger").setAttribute("aria-expanded", "true");
  } else {
    closeIntensityPanel();
  }
}

function selectIntensityPane(pane) {
  document.querySelectorAll(".intensity-tab").forEach((btn) => btn.classList.toggle("active", btn.dataset.pane === pane));
  document.querySelectorAll(".intensity-pane").forEach((el) => el.classList.toggle("active", el.dataset.pane === pane));
}

function animateModelText(node) {
  if (!node) return;
  node.classList.remove("model-swap");
  void node.offsetWidth;
  node.classList.add("model-swap");
  node.addEventListener("animationend", () => node.classList.remove("model-swap"), { once: true });
}

function syncModeUI() {
  const intensityKey = state.settings.local.intensity || "medium";
  const intensity = INTENSITY_PRESETS[intensityKey] || INTENSITY_PRESETS.medium;
  const levelIndex = Math.max(0, INTENSITY_LEVELS.indexOf(intensityKey));
  const pct = levelIndex * 25;
  const isUltra = intensityKey === "ultra";
  const currentModel = LOCAL_MODELS.find((m) => m.id === state.settings.local.modelId);
  const currentModelName = currentModel?.name || "本地模型";
  const supportsThinking = !!currentModel?.thinkingSupported;
  const modelChanged = lastRenderedModelId !== null && lastRenderedModelId !== state.settings.local.modelId;

  $("currentModelLabel").textContent = currentModelName;
  $("emptyTitle").textContent = `与「${currentModelName}」对话`;
  $("intensityPopover").hidden = false;
  $("intensityPopover").dataset.level = intensityKey;
  $("intensityPopover").classList.toggle("ultra-active", isUltra);
  $("intensitySlider").dataset.level = intensityKey;
  $("intensitySlider").classList.toggle("ultra-active", isUltra);
  $("intensityTriggerLabel").textContent = `${intensity.label} · ${intensity.desc}`;
  $("intensityRange").value = String(levelIndex);
  $("intensityRange").setAttribute("aria-valuetext", intensity.label);
  $("rangeFill").style.width = `${pct}%`;
  $("composerHint").textContent = `本地 · ${intensity.short} · 数据不离开设备`;
  $("composer").classList.toggle("ultra-active", isUltra);
  $("cachePill").hidden = !cachedModels.has(state.settings.local.modelId);
  $("codexIntensityLabel").textContent = intensity.label;
  $("codexModelLine").textContent = currentModelName + " ›";
  if (modelChanged) {
    animateModelText($("currentModelLabel"));
    animateModelText($("emptyTitle"));
    animateModelText($("codexModelLine"));
  }
  lastRenderedModelId = state.settings.local.modelId;
  $("intensityTrigger").title = `${intensity.label} - ${intensity.desc} · 当前模型：${currentModelName}`;
  $("thinkingToggle").checked = !!state.settings.local.thinkingEnabled && supportsThinking;
  $("thinkingToggle").disabled = !supportsThinking;
  $("thinkingToggleRow").classList.toggle("disabled", !supportsThinking);
  $("thinkingToggleDesc").textContent = supportsThinking ? "显示模型的思考过程" : "当前模型不支持思考链";
  renderQuickModelList();
  updateRuntimeStatus();
}

function updateRuntimeStatus() {
  const dot = $("runtimeStatus").querySelector(".status-dot");
  const text = $("runtimeStatusText");
  dot.className = "status-dot";
  if (webgpuSupported) {
    dot.classList.add("ok");
    text.textContent = `本地推理就绪 · WebLLM ${WEBLLM_VERSION}`;
  } else {
    dot.classList.add(webgpuReason ? "err" : "warn");
    text.textContent = webgpuReason ? "WebGPU 不可用，本地推理受限" : "正在检测 WebGPU…";
  }
}

/* ---------- Settings ---------- */
function openSettings(tab = "local") {
  $("settings").hidden = false;
  $("scrim").hidden = false;
  selectSettingsTab(tab);
}

function closeSettings() {
  $("settings").hidden = true;
  $("scrim").hidden = true;
}

function selectSettingsTab(tab) {
  document.querySelectorAll(".settings-tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".settings-pane").forEach((p) => p.classList.toggle("active", p.dataset.pane === tab));
  if (tab === "local") refreshCacheStatus();
}

/* ---------- Local engine ---------- */
class LocalEngine {
  constructor() {
    const source = document.getElementById("sodijat-worker").textContent;
    const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
    this.worker = new Worker(url);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.seq = 0;
    this.pending = new Map();
    this.handlers = new Map();
    this.worker.onmessage = (event) => this._onMessage(event.data);
    this.worker.onerror = (event) => {
      console.error("本地模型 Worker 出错", event);
      toast("本地模型线程出错，请刷新页面重试。", "err");
    };
  }

  _onMessage(msg) {
    if (msg.type === "progress" || msg.type === "delta" || msg.type === "thinking") {
      this.handlers.get(msg.id)?.(msg);
      return;
    }
    const entry = this.pending.get(msg.id);
    if (!entry) return;
    this.pending.delete(msg.id);
    this.handlers.delete(msg.id);
    if (msg.type === "error") entry.reject(new Error(msg.error || "本地模型执行失败"));
    else entry.resolve(msg);
  }

  call(type, payload = {}, handler = null) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      if (handler) this.handlers.set(id, handler);
      this.worker.postMessage({ id, type, payload });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          this.handlers.delete(id);
          reject(new Error("本地模型操作超时，请检查浏览器控制台"));
        }
      }, 30 * 60 * 1000);
    });
  }

  async generate(messages, options, onDelta, onThinking) {
    return this.call("generate", { messages, options }, (msg) => {
      if (msg.type === "delta") onDelta(msg.text);
      if (msg.type === "thinking") onThinking?.(msg.text);
    });
  }
}

async function ensureLocalEngine() {
  if (localEngine) return localEngine;
  localEngine = new LocalEngine();
  return localEngine;
}

async function probeLocal() {
  try {
    const engine = await ensureLocalEngine();
    const result = await engine.call("probe");
    if (!result.ok) throw new Error(result.error || "探测失败");
    webgpuSupported = result.gpu.supported;
    webgpuReason = result.gpu.reason || "";
    localReady = result.gpu.supported;
    updateWebGPUBanner();
    updateRuntimeStatus();
    if (localReady) await refreshCacheStatus();
  } catch (error) {
    webgpuSupported = false;
    localReady = false;
    webgpuReason = String(error.message || error);
    updateWebGPUBanner();
    updateRuntimeStatus();
    console.warn("本地模型探测失败", error);
  }
}

function updateWebGPUBanner() {
  const banner = $("webgpuBanner");
  const dot = banner.querySelector(".status-dot");
  dot.className = "status-dot";
  if (localReady) {
    dot.classList.add("ok");
    $("webgpuTitle").textContent = "WebGPU 可用，本地推理已就绪";
    $("webgpuDesc").textContent = `WebLLM ${WEBLLM_VERSION} · 模型会下载并保存在浏览器缓存中。`;
  } else {
    dot.classList.add("err");
    $("webgpuTitle").textContent = "WebGPU 不可用";
    $("webgpuDesc").textContent = webgpuReason
      ? `${webgpuReason}。本地模式需要最新版 Chrome 或 Edge，并开启硬件加速。`
      : "本地推理需要最新版 Chrome 或 Edge，并开启硬件加速。";
  }
  renderModelGrid();
  renderQuickModelList();
}

async function refreshCacheStatus() {
  if (!localEngine) return;
  cachedModels = new Set();
  for (const model of LOCAL_MODELS) {
    try {
      const result = await localEngine.call("checkCache", { modelId: model.id });
      if (result.ok && result.cached) cachedModels.add(model.id);
    } catch (error) {
      console.warn("检查模型缓存失败", model.id, error);
    }
  }
  updateWebGPUBanner();
  syncModeUI();
}

function renderModelGrid() {
  const grid = $("modelGrid");
  if (!grid) return;
  grid.innerHTML = "";
  for (const model of LOCAL_MODELS) {
    const cached = cachedModels.has(model.id);
    const active = state.settings.local.modelId === model.id;
    const loaded = loadedModelId === model.id;
    const card = document.createElement("div");
    card.className = "model-card" + (active ? " active" : "") + (model.extreme ? " extreme" : "");
    const tags = model.tags.map((t) => `<span class="model-tag${model.extreme ? " extreme" : ""}">${escapeHtml(t)}</span>`).join("")
      + (model.extreme ? '<span class="model-tag extreme">下载前警告</span>' : "")
      + (cached ? '<span class="model-tag cached">已下载</span>' : "");
    card.innerHTML = `
      <div class="model-card-head"><svg><use href="#i-cpu"/></svg><strong>${escapeHtml(model.name)}</strong></div>
      <div class="model-desc">${escapeHtml(model.desc)}</div>
      <div class="model-tags"><span class="model-tag">${escapeHtml(model.vram)}</span>${tags}</div>
      <div class="model-actions">
        <button class="mini-btn primary" data-action="load" ${!localReady || loaded ? "disabled" : ""}>${loaded ? "已加载" : cached ? "加载模型" : "下载并加载"}</button>
        <button class="mini-btn danger" data-action="delete" ${!cached || !localReady ? "disabled" : ""} title="删除浏览器中的模型缓存"><svg><use href="#i-trash"/></svg></button>
      </div>`;
    card.onclick = (event) => {
      if (event.target.closest("button")) return;
      state.settings.local.modelId = model.id;
      saveState();
      syncModeUI();
      renderModelGrid();
    };
    card.querySelector('[data-action="load"]').onclick = async () => {
      state.settings.local.modelId = model.id;
      saveState();
      syncModeUI();
      await downloadLocalModel(model);
    };
    card.querySelector('[data-action="delete"]').onclick = async () => {
      if (!confirm(`删除「${model.name}」的本地缓存？下次使用需要重新下载。`)) return;
      try {
        const engine = await ensureLocalEngine();
        await engine.call("deleteModel", { modelId: model.id });
        cachedModels.delete(model.id);
        if (loadedModelId === model.id) loadedModelId = null;
        toast("模型缓存已删除", "ok");
        renderModelGrid();
        syncModeUI();
      } catch (error) {
        toast(`删除失败：${error.message}`, "err");
      }
    };
    grid.appendChild(card);
  }
}

function renderQuickModelList() {
  const host = $("quickModelList");
  if (!host) return;
  host.innerHTML = "";
  for (const model of LOCAL_MODELS) {
    const btn = document.createElement("button");
    btn.type = "button";
    const active = state.settings.local.modelId === model.id;
    const cached = cachedModels.has(model.id);
    btn.className = "quick-model-item" + (active ? " active" : "") + (cached ? " cached" : "") + (model.extreme ? " extreme" : "");
    btn.innerHTML = `<span class="quick-model-dot"></span><span class="quick-model-name">${escapeHtml(model.name)}</span><span class="quick-model-vram">${escapeHtml(model.vram)}</span>`;
    btn.onclick = (event) => {
      event.stopPropagation();
      if (state.settings.local.modelId === model.id) return;
      state.settings.local.modelId = model.id;
      saveState();
      syncModeUI();
      renderModelGrid();
    };
    host.appendChild(btn);
  }
}

async function downloadLocalModel(model) {
  if (!localReady) {
    toast("WebGPU 不可用，无法加载本地模型。", "err");
    openSettings("local");
    return;
  }
  if (model.extreme && !confirm(`运行这个模型可能会让你的设备发热或卡死。\n\n「${model.name}」需要约 ${model.vram.replace("约 ", "")} 显存，下载体积也很大。确定要继续吗？`)) {
    return;
  }
  const progress = $("loadProgress");
  progress.hidden = false;
  $("loadProgressLabel").textContent = `正在准备 ${model.name}…`;
  $("loadProgressPercent").textContent = "0%";
  $("progressFill").style.width = "0%";
  $("loadProgressText").textContent = "第一次下载可能需要几分钟，别关标签页。";
  try {
    const engine = await ensureLocalEngine();
    const result = await engine.call("load", { modelId: model.id }, (msg) => {
      if (msg.type !== "progress") return;
      const pct = Math.max(0, Math.min(100, Math.round(msg.progress * 100)));
      $("loadProgressPercent").textContent = `${pct}%`;
      $("progressFill").style.width = `${pct}%`;
      $("loadProgressText").textContent = msg.text || "";
    });
    if (!result.ok) throw new Error(result.error || "加载失败");
    loadedModelId = model.id;
    cachedModels.add(model.id);
    toast(`${model.name} 已加载，可以开聊了。`, "ok");
  } catch (error) {
    toast(`模型加载失败：${error.message}`, "err");
  } finally {
    progress.hidden = true;
    renderModelGrid();
    syncModeUI();
  }
}

async function ensureLocalModel() {
  const modelId = state.settings.local.modelId;
  if (loadedModelId === modelId && localEngine) return;
  const model = LOCAL_MODELS.find((m) => m.id === modelId);
  if (!model) throw new Error("请先选择一个本地模型");
  toast("正在准备本地模型，下载进度可在设置 → 本地模型里查看。");
  await downloadLocalModel(model);
  if (loadedModelId !== modelId) throw new Error("本地模型未就绪");
}

/* ---------- Chat actions ---------- */
function setBusy(value) {
  busy = value;
  $("sendBtn").disabled = value;
  $("stopBtn").hidden = !value;
  $("sendBtn").hidden = value;
}

async function sendMessage() {
  if (busy) return;
  const input = $("promptInput");
  const text = input.value.trim();
  if (!text) return;

  if (!localReady) {
    toast("WebGPU 不可用，先看看本地模型设置里的说明。", "err");
    openSettings("local");
    return;
  }

  const conv = ensureConversation();
  input.value = "";
  autoResizeInput();
  conv.messages.push({ id: uid(), role: "user", content: text, ts: Date.now() });
  const replyId = uid();
  conv.messages.push({ id: replyId, role: "assistant", content: "", streaming: true, ts: Date.now() });
  conv.title = convTitle(conv);
  conv.updatedAt = Date.now();
  renderMessages();
  renderConvList();
  setBusy(true);

  const activeModel = LOCAL_MODELS.find((m) => m.id === state.settings.local.modelId);
  const systemPrompt = activeModel?.systemPrompt || LOCAL_SYSTEM_PROMPT;
  const history = tidyHistory(conv.messages
    .filter((m) => m.id !== replyId && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({ role: m.role, content: m.content })));
  const messages = [{ role: "system", content: systemPrompt }, ...history];
  let full = "";
  let thinkingText = "";

  try {
    await ensureLocalModel();
      const thinkingOn = !!state.settings.local.thinkingEnabled && !!activeModel?.thinkingSupported;
      const intensity = INTENSITY_PRESETS[state.settings.local.intensity] || INTENSITY_PRESETS.medium;
      const options = {
        temperature: intensity.temperature,
        top_p: intensity.top_p,
        maxTokens: intensity.maxTokens,
        repetition_penalty: intensity.repetition_penalty,
        frequency_penalty: intensity.frequency_penalty,
        presence_penalty: intensity.presence_penalty,
        enableThinking: thinkingOn,
      };
      if (thinkingOn) options.maxTokens = Math.max(options.maxTokens, 4096);
      const previousAssistant = [...conv.messages].reverse()
        .find((m) => m.role === "assistant" && m.id !== replyId && !m.streaming);

      const runLocal = async (retry = false, keepThinking = false) => {
        const attemptMessages = retry
          ? messages.map((m, i) => i === 0
            ? { ...m, content: m.content + " 注意：不要重复上一轮的原话，直接根据对话历史给出新的回答。" }
            : m)
          : messages;
        const attemptOptions = retry
          ? { ...options, temperature: Math.min(1.2, options.temperature + 0.2), repetition_penalty: 1.25 }
          : options;
        full = "";
        if (!keepThinking) thinkingText = "";
        updateMessageDOM(replyId, "", true, thinkingText);
        await localEngine.generate(attemptMessages, attemptOptions, (delta) => {
          full += delta;
          updateMessageDOM(replyId, full, true, thinkingText);
        }, (thought) => {
          thinkingText += thought;
          updateMessageDOM(replyId, full, true, thinkingText);
        });
      };

      await runLocal(false);
      if (previousAssistant && isCrossTurnRepeat(full, previousAssistant.content)) {
        await runLocal(true);
      }
      if (thinkingOn && thinkingText.trim() && !full.trim()) {
        const fallbackMessages = messages.map((m, i) => i === 0
          ? { ...m, content: m.content + " 请立即给出最终答案，不要再展开思考。" }
          : m);
        full = "";
        await localEngine.generate(fallbackMessages, { ...options, enableThinking: false, maxTokens: 2048 }, (delta) => {
          full += delta;
          updateMessageDOM(replyId, full, true, thinkingText);
        }, () => {});
    }
    const target = conv.messages.find((m) => m.id === replyId);
    if (target) {
      target.content = full || "（模型没有返回内容）";
      target.thinking = thinkingText.trim();
      target.streaming = false;
    }
  } catch (error) {
    const cancelled = error?.name === "AbortError";
    const target = conv.messages.find((m) => m.id === replyId);
    if (target) {
      target.content = cancelled ? `${full}\n\n_已停止生成。_` : `${full}\n\n> 出错了：${escapeHtml(error.message || error)}`;
      target.thinking = thinkingText.trim();
      target.streaming = false;
    }
    if (!cancelled) toast(`生成失败：${error.message || error}`, "err");
  } finally {
    setBusy(false);
    conv.updatedAt = Date.now();
    saveState();
    renderMessages();
    renderConvList();
    input.focus();
  }
}

function stopGeneration() {
  if (!busy) return;
  if (localEngine) localEngine.call("interrupt").catch(() => {});
  toast("已请求停止生成");
}

function newChat() {
  if (busy) return toast("先停止当前生成，再开新对话。", "err");
  const existing = currentConv();
  if (existing && !existing.messages.length) {
    toast("这已经是新的对话了。");
    $("promptInput").focus();
    return;
  }
  const conv = { id: uid(), title: "新的对话", messages: [], createdAt: Date.now(), updatedAt: Date.now() };
  state.conversations.unshift(conv);
  currentId = conv.id;
  saveState();
  renderAll();
  closeSidebar();
  $("promptInput").focus();
}

function clearCurrent() {
  const conv = currentConv();
  if (!conv || !conv.messages.length) return;
  if (!confirm("清空当前会话的所有消息？这个操作没法撤销。")) return;
  conv.messages = [];
  conv.title = "新的对话";
  saveState();
  renderMessages();
  renderConvList();
  toast("会话已清空");
}

function exportCurrent() {
  const conv = currentConv();
  if (!conv || !conv.messages.length) return toast("当前会话还没有内容可以导出。");
  const lines = [`# SodiJat 对话导出`, "", `时间：${new Date(conv.updatedAt).toLocaleString("zh-CN")}`, `模式：本地模型`, ""];
  for (const msg of conv.messages) {
    lines.push(`## ${msg.role === "user" ? "你" : "SodiJat"}`, "", msg.content, "");
  }
  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SodiJat-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
  toast("对话已导出为 Markdown", "ok");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("已复制", "ok");
  } catch (_) {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    toast("已复制", "ok");
  }
}

function autoResizeInput() {
  const input = $("promptInput");
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 180) + "px";
}

function openSidebar() { sidebarOpen = true; $("app").classList.add("sidebar-open"); }
function closeSidebar() { sidebarOpen = false; $("app").classList.remove("sidebar-open"); }

/* ---------- Performance check ---------- */
const PERF_BUILDS = [
  { id: "14900k-5090", label: "i9-14900K + RTX 5090", cpu: "i9-14900K", gpu: "RTX 5090", ram: 32, vram: 32 },
  { id: "14900k-4090", label: "i9-14900K + RTX 4090", cpu: "i9-14900K", gpu: "RTX 4090", ram: 32, vram: 24 },
  { id: "14700k-4080s", label: "i7-14700K + RTX 4080 Super", cpu: "i7-14700K", gpu: "RTX 4080 Super", ram: 32, vram: 16 },
  { id: "13700k-4070tis", label: "i7-13700K + RTX 4070 Ti Super", cpu: "i7-13700K", gpu: "RTX 4070 Ti Super", ram: 32, vram: 16 },
  { id: "13600k-4070", label: "i5-13600K + RTX 4070", cpu: "i5-13600K", gpu: "RTX 4070", ram: 32, vram: 12 },
  { id: "12400-3060", label: "i5-12400 + RTX 3060 12GB", cpu: "i5-12400", gpu: "RTX 3060 12GB", ram: 16, vram: 12 },
  { id: "11400-3060ti", label: "i5-11400 + RTX 3060 Ti", cpu: "i5-11400", gpu: "RTX 3060 Ti", ram: 16, vram: 8 },
  { id: "10400-1660s", label: "i5-10400 + GTX 1660 Super", cpu: "i5-10400", gpu: "GTX 1660 Super", ram: 16, vram: 6 },
  { id: "9900k-2080ti", label: "i9-9900K + RTX 2080 Ti", cpu: "i9-9900K", gpu: "RTX 2080 Ti", ram: 32, vram: 11 },
  { id: "8700k-1080ti", label: "i7-8700K + GTX 1080 Ti", cpu: "i7-8700K", gpu: "GTX 1080 Ti", ram: 16, vram: 11 },
  { id: "12100-1060", label: "i3-12100 + GTX 1060 6GB", cpu: "i3-12100", gpu: "GTX 1060 6GB", ram: 16, vram: 6 },
  { id: "8100-1060", label: "i3-8100 + GTX 1060 3GB", cpu: "i3-8100", gpu: "GTX 1060 3GB", ram: 8, vram: 3 },
];

const PERF_CPUS = [
  { group: "8 代", name: "i3-8100", ram: 8, cores: 4 },
  { group: "8 代", name: "i5-8400", ram: 16, cores: 6 },
  { group: "8 代", name: "i7-8700K", ram: 16, cores: 6 },
  { group: "9 代", name: "i3-9100F", ram: 8, cores: 4 },
  { group: "9 代", name: "i5-9400F", ram: 16, cores: 6 },
  { group: "9 代", name: "i7-9700K", ram: 16, cores: 8 },
  { group: "9 代", name: "i9-9900K", ram: 32, cores: 8 },
  { group: "10 代", name: "i3-10100", ram: 16, cores: 4 },
  { group: "10 代", name: "i5-10400", ram: 16, cores: 6 },
  { group: "10 代", name: "i7-10700K", ram: 32, cores: 8 },
  { group: "10 代", name: "i9-10900K", ram: 32, cores: 10 },
  { group: "11 代", name: "i3-11100", ram: 16, cores: 4 },
  { group: "11 代", name: "i5-11400", ram: 16, cores: 6 },
  { group: "11 代", name: "i7-11700K", ram: 32, cores: 8 },
  { group: "11 代", name: "i9-11900K", ram: 32, cores: 8 },
  { group: "12 代", name: "i3-12100", ram: 16, cores: 4 },
  { group: "12 代", name: "i5-12400", ram: 16, cores: 6 },
  { group: "12 代", name: "i5-12600K", ram: 16, cores: 10 },
  { group: "12 代", name: "i7-12700K", ram: 32, cores: 12 },
  { group: "12 代", name: "i9-12900K", ram: 32, cores: 16 },
  { group: "13 代", name: "i3-13100", ram: 16, cores: 4 },
  { group: "13 代", name: "i5-13400", ram: 16, cores: 10 },
  { group: "13 代", name: "i5-13600K", ram: 32, cores: 14 },
  { group: "13 代", name: "i7-13700K", ram: 32, cores: 16 },
  { group: "13 代", name: "i9-13900K", ram: 32, cores: 24 },
  { group: "14 代", name: "i3-14100", ram: 16, cores: 4 },
  { group: "14 代", name: "i5-14400", ram: 16, cores: 10 },
  { group: "14 代", name: "i5-14600K", ram: 32, cores: 14 },
  { group: "14 代", name: "i7-14700K", ram: 32, cores: 20 },
  { group: "14 代", name: "i9-14900K", ram: 32, cores: 24 },
];

const PERF_GPUS = [
  { group: "GTX 10", name: "GTX 1060 3GB", vram: 3 },
  { group: "GTX 10", name: "GTX 1060 5GB", vram: 5 },
  { group: "GTX 10", name: "GTX 1060 6GB", vram: 6 },
  { group: "GTX 10", name: "GTX 1070", vram: 8 },
  { group: "GTX 10", name: "GTX 1070 Ti", vram: 8 },
  { group: "GTX 10", name: "GTX 1080", vram: 8 },
  { group: "GTX 10", name: "GTX 1080 Ti", vram: 11 },
  { group: "GTX 16", name: "GTX 1650", vram: 4 },
  { group: "GTX 16", name: "GTX 1650 Super", vram: 4 },
  { group: "GTX 16", name: "GTX 1660", vram: 6 },
  { group: "GTX 16", name: "GTX 1660 Super", vram: 6 },
  { group: "GTX 16", name: "GTX 1660 Ti", vram: 6 },
  { group: "RTX 20", name: "RTX 2060", vram: 6 },
  { group: "RTX 20", name: "RTX 2060 12GB", vram: 12 },
  { group: "RTX 20", name: "RTX 2060 Super", vram: 8 },
  { group: "RTX 20", name: "RTX 2070", vram: 8 },
  { group: "RTX 20", name: "RTX 2070 Super", vram: 8 },
  { group: "RTX 20", name: "RTX 2080", vram: 8 },
  { group: "RTX 20", name: "RTX 2080 Super", vram: 8 },
  { group: "RTX 20", name: "RTX 2080 Ti", vram: 11 },
  { group: "RTX 30", name: "RTX 3050 6GB", vram: 6 },
  { group: "RTX 30", name: "RTX 3050 8GB", vram: 8 },
  { group: "RTX 30", name: "RTX 3060 8GB", vram: 8 },
  { group: "RTX 30", name: "RTX 3060 12GB", vram: 12 },
  { group: "RTX 30", name: "RTX 3060 Ti", vram: 8 },
  { group: "RTX 30", name: "RTX 3070", vram: 8 },
  { group: "RTX 30", name: "RTX 3070 Ti", vram: 8 },
  { group: "RTX 30", name: "RTX 3080 10GB", vram: 10 },
  { group: "RTX 30", name: "RTX 3080 12GB", vram: 12 },
  { group: "RTX 30", name: "RTX 3080 Ti", vram: 12 },
  { group: "RTX 30", name: "RTX 3090", vram: 24 },
  { group: "RTX 30", name: "RTX 3090 Ti", vram: 24 },
  { group: "RTX 40", name: "RTX 4060", vram: 8 },
  { group: "RTX 40", name: "RTX 4060 Ti 8GB", vram: 8 },
  { group: "RTX 40", name: "RTX 4060 Ti 16GB", vram: 16 },
  { group: "RTX 40", name: "RTX 4070", vram: 12 },
  { group: "RTX 40", name: "RTX 4070 Super", vram: 12 },
  { group: "RTX 40", name: "RTX 4070 Ti", vram: 12 },
  { group: "RTX 40", name: "RTX 4070 Ti Super", vram: 16 },
  { group: "RTX 40", name: "RTX 4080", vram: 16 },
  { group: "RTX 40", name: "RTX 4080 Super", vram: 16 },
  { group: "RTX 40", name: "RTX 4090", vram: 24 },
  { group: "RTX 40", name: "RTX 4090 D", vram: 24 },
  { group: "RTX 50", name: "RTX 5060", vram: 8 },
  { group: "RTX 50", name: "RTX 5060 Ti 8GB", vram: 8 },
  { group: "RTX 50", name: "RTX 5060 Ti 16GB", vram: 16 },
  { group: "RTX 50", name: "RTX 5070", vram: 12 },
  { group: "RTX 50", name: "RTX 5070 Ti", vram: 16 },
  { group: "RTX 50", name: "RTX 5080", vram: 16 },
  { group: "RTX 50", name: "RTX 5090", vram: 32 },
  { group: "RTX 50", name: "RTX 5090 D", vram: 32 },
];

function perfParseVram(value) {
  const match = String(value).match(/([\d.]+)/);
  return match ? Number(match[1]) : 0;
}

function perfFillSelect(select, items, placeholder, labelFn) {
  select.innerHTML = `<option value="">${placeholder}</option>`;
  const groups = new Map();
  items.forEach((item) => {
    if (!groups.has(item.group)) {
      const group = document.createElement("optgroup");
      group.label = item.group;
      groups.set(item.group, group);
      select.appendChild(group);
    }
    const option = document.createElement("option");
    option.value = item.name;
    option.textContent = labelFn(item);
    groups.get(item.group).appendChild(option);
  });
}

function populatePerfPresets() {
  $("perfBuildPreset").innerHTML = '<option value="">自定义 / 手动填写</option>'
    + PERF_BUILDS.map((build) => `<option value="${build.id}">${build.label}</option>`).join("");
  perfFillSelect($("perfCpuPreset"), PERF_CPUS, "自定义 / 自动检测", (cpu) => `${cpu.name} · 建议 ${cpu.ram}GB`);
  perfFillSelect($("perfGpuPreset"), PERF_GPUS, "自定义 / 自动检测", (gpu) => `${gpu.name} · ${gpu.vram}GB`);
}

function perfSetRam(ram) {
  let matched = false;
  document.querySelectorAll("#perfRamOptions .perf-option").forEach((node) => {
    const on = Number(node.dataset.value) === ram;
    node.classList.toggle("selected", on);
    if (on) matched = true;
  });
  $("perfRamCustom").value = matched ? "" : String(ram);
  perfState.ram = ram;
}

function perfSetVram(vram) {
  let matched = false;
  document.querySelectorAll("#perfVramOptions .perf-option").forEach((node) => {
    const on = node.dataset.value !== "unknown" && Number(node.dataset.value) === vram;
    node.classList.toggle("selected", on);
    if (on) matched = true;
  });
  if (!matched) {
    document.querySelector('#perfVramOptions .perf-option[data-value="unknown"]').classList.add("selected");
  }
  perfState.vram = matched ? vram : null;
}

function applyPerfBuild(id) {
  const build = PERF_BUILDS.find((item) => item.id === id);
  if (!build) return;
  const cpu = PERF_CPUS.find((item) => item.name === build.cpu);
  perfState.cpuName = build.cpu;
  perfState.cpuCores = cpu?.cores || 0;
  perfState.gpu = build.gpu;
  $("perfGpuInput").value = build.gpu;
  $("perfCpuPreset").value = build.cpu;
  $("perfGpuPreset").value = build.gpu;
  perfSetRam(build.ram);
  perfSetVram(build.vram);
  $("perfDeviceNote").textContent = `预设：${build.label} · 内存 ${build.ram} GB`;
  $("perfGpuNote").textContent = `预设显卡：${build.gpu} · ${build.vram} GB 显存`;
}

function applyPerfCpu(name) {
  const cpu = PERF_CPUS.find((item) => item.name === name);
  if (!cpu) return;
  perfState.cpuName = cpu.name;
  perfState.cpuCores = cpu.cores;
  perfSetRam(cpu.ram);
  $("perfBuildPreset").value = "";
  $("perfDeviceNote").textContent = `CPU 预设：${cpu.name} · 建议内存 ${cpu.ram} GB`;
}

function applyPerfGpu(name) {
  const gpu = PERF_GPUS.find((item) => item.name === name);
  if (!gpu) return;
  perfState.gpu = gpu.name;
  $("perfGpuInput").value = gpu.name;
  perfSetVram(gpu.vram);
  $("perfBuildPreset").value = "";
  $("perfGpuNote").textContent = `预设显卡：${gpu.name} · ${gpu.vram} GB 显存`;
}

function perfShowStep(step) {
  perfState.step = step;
  document.querySelectorAll(".perf-step").forEach((node) => {
    node.classList.toggle("active", Number(node.dataset.step) === step);
  });
  document.querySelectorAll("#perfProgress span").forEach((node, index) => {
    node.classList.toggle("active", index < Math.min(step, 3));
  });
}

function openPerf() {
  closeSettings();
  closeCli();
  closeIntensityPanel();
  perfState = {
    step: 1,
    ram: null,
    vram: null,
    gpu: "",
    preference: "balanced",
    language: "zh",
    platform: "",
    cores: 0,
    cpuName: "",
    cpuCores: 0,
    detectedGpu: "",
  };
  $("perfModal").hidden = false;
  $("perfRamCustom").value = "";
  $("perfGpuInput").value = "";
  $("perfBuildPreset").value = "";
  $("perfCpuPreset").value = "";
  $("perfGpuPreset").value = "";
  $("perfDeviceNote").textContent = "正在读取设备信息…";
  $("perfGpuNote").textContent = "正在读取显卡信息…";
  $("perfRoast").hidden = true;
  document.querySelectorAll("#perfRamOptions .perf-option, #perfVramOptions .perf-option").forEach((node) => node.classList.remove("selected"));
  document.querySelectorAll("#perfVramOptions .perf-option").forEach((node) => {
    node.classList.toggle("selected", node.dataset.value === "unknown");
  });
  document.querySelectorAll("#perfPreferenceOptions .perf-option").forEach((node) => {
    node.classList.toggle("selected", node.dataset.value === "balanced");
  });
  document.querySelectorAll("#perfLanguageOptions .perf-option").forEach((node) => {
    node.classList.toggle("selected", node.dataset.value === "zh");
  });
  perfShowStep(1);
  perfDetect();
}

function closePerf() {
  $("perfModal").hidden = true;
}

async function perfDetect() {
  const platform = navigator.userAgentData?.platform || navigator.platform || "未知系统";
  const cores = navigator.hardwareConcurrency || 0;
  const memory = navigator.deviceMemory || null;
  let gpu = "";
  if (navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter?.info) {
        const info = adapter.info;
        gpu = info.description || [info.vendor, info.architecture, info.device].filter(Boolean).join(" ");
      }
    } catch (_) {
      // 读不到就算了，让用户手填。
    }
  }
  perfState.platform = platform;
  perfState.cores = cores;
  perfState.detectedGpu = gpu;
  if (!perfState.cpuName) {
    $("perfDeviceNote").textContent = `检测到 ${platform}${cores ? ` · ${cores} 核 CPU` : ""}${memory ? ` · 约 ${memory} GB 内存` : ""}${memory === 8 ? "（浏览器可能只报告到 8 GB）" : ""}`;
  }
  if (!perfState.gpu) {
    $("perfGpuNote").textContent = gpu ? `浏览器识别到：${gpu}` : "浏览器没识别到显卡型号，手动填一下或留空。";
    if (gpu) $("perfGpuInput").value = gpu;
  }
  if (!perfState.ram && memory) {
    const match = [...document.querySelectorAll("#perfRamOptions .perf-option")]
      .find((node) => Number(node.dataset.value) === memory);
    if (match) {
      match.click();
    } else {
      $("perfRamCustom").value = String(memory);
      perfState.ram = memory;
    }
  }
}

function perfGetRam() {
  const custom = Number($("perfRamCustom").value);
  if (custom > 0) return custom;
  const selected = document.querySelector("#perfRamOptions .perf-option.selected");
  return selected ? Number(selected.dataset.value) : null;
}

function perfGetVram() {
  const selected = document.querySelector("#perfVramOptions .perf-option.selected");
  if (!selected || selected.dataset.value === "unknown") return null;
  return Number(selected.dataset.value);
}

function perfEstimateVram(ram, gpu) {
  const platform = String(perfState.platform).toLowerCase();
  const name = String(gpu).toLowerCase();
  if (platform.includes("mac")) return Math.max(4, ram * 0.7);
  if (name.includes("intel") || name.includes("iris") || name.includes("radeon graphics") || name.includes("apple")) {
    return Math.max(2, Math.min(8, ram * 0.25));
  }
  return Math.max(4, Math.min(12, ram * 0.4));
}

async function perfRunEstimate() {
  const ram = perfGetRam();
  if (!ram) {
    toast("先选一个内存大小，再继续。", "err");
    return;
  }
  if (!webgpuSupported) await probeLocal();
  const manualVram = perfGetVram();
  const gpu = $("perfGpuInput").value.trim();
  const effectiveVram = manualVram || perfEstimateVram(ram, gpu);
  const noWebgpu = !webgpuSupported;
  const veryLow = noWebgpu || effectiveVram <= 3 || ram <= 8;
  const rank = { recommended: 3, try: 2, struggle: 1, no: 0 };

  const results = LOCAL_MODELS.map((model) => {
    const need = perfParseVram(model.vram);
    let level = "no";
    let label = "不建议";
    let reason = "显存不足";
    if (!webgpuSupported) {
      level = "no";
      label = "不适合";
      reason = "浏览器没有可用的 WebGPU";
    } else if (effectiveVram >= need * 1.35 && ram >= need + 6) {
      level = "recommended";
      label = "推荐";
      reason = "显存和内存都够";
    } else if (effectiveVram >= need * 1.1 && ram >= need + 3) {
      level = "try";
      label = "可尝试";
      reason = "能加载，长上下文可能吃紧";
    } else if (effectiveVram >= need * 0.95) {
      level = "struggle";
      label = "吃力";
      reason = "接近上限，可能卡顿或加载失败";
    }
    return { model, need, level, label, reason };
  });

  if (veryLow) {
    results.forEach((item) => {
      item.level = "no";
      item.label = "不建议";
      item.reason = noWebgpu ? "浏览器没有可用的 WebGPU" : "配置过低，建议先升级硬件";
    });
  }

  results.sort((a, b) => {
    if (rank[b.level] !== rank[a.level]) return rank[b.level] - rank[a.level];
    if (perfState.preference === "speed") return a.need - b.need;
    return b.need - a.need;
  });

  const recommended = results.filter((item) => item.level === "recommended");
  const playable = results.filter((item) => item.level === "recommended" || item.level === "try");
  let verdict = "适合轻量模型";
  let summary = "小模型没问题，大模型会比较吃力。";
  if (noWebgpu) {
    verdict = "不适合本地跑";
    summary = "当前浏览器没有可用的 WebGPU。换 Chrome / Edge 或更新系统后再试。";
  } else if (veryLow) {
    verdict = "非常低配，建议先别跑本地 AI";
    summary = "这配置跑本地模型不是挑战，是许愿。先升级内存或显卡，再回来。";
  } else if (!recommended.length) {
    verdict = "能跑，但选择有限";
    summary = "没有模型达到推荐线，先试“可尝试”里体积最小的那个。";
  } else if (recommended.some((item) => item.need >= 20)) {
    verdict = "可以跑大模型";
    summary = "这台机器能碰 20B 以上的大模型，注意散热、电源和浏览器内存占用。";
  } else if (effectiveVram >= 24) {
    verdict = "可以跑大模型（70B 需谨慎）";
    summary = "24GB+ 显存能覆盖 13B~30B 级模型；70B 量化版接近上限，可能吃力。";
  } else if (recommended.some((item) => item.need >= 5)) {
    verdict = "可以跑主流模型";
    summary = "主流 7B~9B 模型基本能跑，长上下文和高质量档位会更吃资源。";
  }

  $("perfVerdict").textContent = verdict;
  $("perfSummary").textContent = summary;
  $("perfRoast").hidden = !veryLow;
  $("perfSpecs").innerHTML = "";
  const specs = [
    `内存 ${ram} GB`,
    `显存 ${manualVram ? `${manualVram} GB（手动）` : `${effectiveVram.toFixed(1)} GB（估算）`}`,
    `系统 ${perfState.platform || "未知"}`,
    `CPU ${perfState.cpuName ? `${perfState.cpuName}（${perfState.cpuCores} 核）` : perfState.cores ? `${perfState.cores} 核（自动检测）` : "未知"}`,
    `WebGPU ${webgpuSupported ? "可用" : "不可用"}`,
  ];
  specs.forEach((text) => {
    const span = document.createElement("span");
    span.className = "perf-spec";
    span.textContent = text;
    $("perfSpecs").appendChild(span);
  });

  $("perfModelList").innerHTML = "";
  results.forEach(({ model, level, label, reason }) => {
    const item = document.createElement("div");
    item.className = "perf-model-item";
    item.title = reason;
    const name = document.createElement("span");
    name.className = "perf-model-name";
    name.textContent = model.name;
    const vram = document.createElement("span");
    vram.className = "perf-model-vram";
    vram.textContent = model.vram;
    const fit = document.createElement("span");
    fit.className = `perf-fit ${level}`;
    fit.textContent = label;
    item.append(name, vram, fit);
    $("perfModelList").appendChild(item);
  });
  perfShowStep(4);
}

/* ---------- Command line ---------- */
const CLI_COMMANDS = [
  "/help",
  "/model choose",
  "/models",
  "/desktop",
  "/create chat new",
  "/create chat backup",
  "/chat list",
  "/chat open",
  "/chat clear",
  "/intensity",
  "/thinking",
  "/perf",
  "/status",
  "/stop",
  "/clear",
];

function cliPrint(text = "", kind = "") {
  const out = $("cliOutput");
  const line = document.createElement("div");
  line.className = `cli-line ${kind}`.trim();
  line.textContent = text;
  out.appendChild(line);
  out.scrollTop = out.scrollHeight;
}

function cliWelcome() {
  cliPrint("SodiJat Shell v1.0 · local runtime", "head");
  cliPrint("输入 /help 查看命令，/desktop 回到图形模式。", "muted");
  cliPrint("");
}

function openCli() {
  closeSettings();
  closeIntensityPanel();
  closeSidebar();
  $("cli").hidden = false;
  cliOpen = true;
  if (!cliBooted) {
    cliWelcome();
    cliBooted = true;
  }
  requestAnimationFrame(() => $("cliInput").focus());
}

function closeCli() {
  $("cli").hidden = true;
  cliOpen = false;
  $("promptInput").focus();
}

function cliListModels() {
  cliPrint("可用模型：", "head");
  LOCAL_MODELS.forEach((model, index) => {
    const active = model.id === state.settings.local.modelId ? "  ← 当前" : "";
    const cached = cachedModels.has(model.id) ? " [已缓存]" : "";
    cliPrint(`  ${String(index + 1).padStart(2)}. ${model.name}${cached}${active}`);
  });
}

function cliResolveModel(input) {
  const index = Number(input);
  if (Number.isInteger(index) && index >= 1 && index <= LOCAL_MODELS.length) return LOCAL_MODELS[index - 1];
  const query = input.toLowerCase();
  return LOCAL_MODELS.find((m) => m.id.toLowerCase() === query)
    || LOCAL_MODELS.find((m) => m.name.toLowerCase() === query)
    || LOCAL_MODELS.find((m) => m.name.toLowerCase().includes(query));
}

function cliSelectModel(model) {
  state.settings.local.modelId = model.id;
  saveState();
  syncModeUI();
  renderModelGrid();
  cliPrint(`已切换到 ${model.name}（${model.vram}）。`, "ok");
  if (!cachedModels.has(model.id)) cliPrint("这个模型还没缓存，下次发送时会先下载。", "muted");
}

function cliNewChat() {
  if (busy) {
    cliPrint("正在生成，先停止再新建。", "err");
    return;
  }
  const conv = { id: uid(), title: "新的对话", messages: [], createdAt: Date.now(), updatedAt: Date.now() };
  state.conversations.unshift(conv);
  currentId = conv.id;
  saveState();
  renderAll();
  closeSidebar();
  cliPrint("已新建对话。", "ok");
}

function cliAppendStream(kind = "", prefix = "") {
  const out = $("cliOutput");
  const line = document.createElement("div");
  line.className = `cli-line ${kind}`.trim();
  line.textContent = prefix;
  out.appendChild(line);
  out.scrollTop = out.scrollHeight;
  return line;
}

async function cliChat(text) {
  if (busy) {
    cliPrint("正在生成，输入 /stop 可以停止。", "err");
    return;
  }
  if (!localReady) {
    cliPrint("正在检测 WebGPU…", "muted");
    await probeLocal();
  }
  if (!localReady) {
    cliPrint("WebGPU 不可用，没法在命令行里跑本地模型。", "err");
    return;
  }

  const conv = ensureConversation();
  conv.messages.push({ id: uid(), role: "user", content: text, ts: Date.now() });
  const replyId = uid();
  conv.messages.push({ id: replyId, role: "assistant", content: "", streaming: true, ts: Date.now() });
  conv.title = convTitle(conv);
  conv.updatedAt = Date.now();
  renderMessages();
  renderConvList();
  setBusy(true);

  const activeModel = LOCAL_MODELS.find((m) => m.id === state.settings.local.modelId);
  const thinkingOn = !!state.settings.local.thinkingEnabled && !!activeModel?.thinkingSupported;
  const intensity = INTENSITY_PRESETS[state.settings.local.intensity] || INTENSITY_PRESETS.medium;
  const options = {
    temperature: intensity.temperature,
    top_p: intensity.top_p,
    maxTokens: intensity.maxTokens,
    repetition_penalty: intensity.repetition_penalty,
    frequency_penalty: intensity.frequency_penalty,
    presence_penalty: intensity.presence_penalty,
    enableThinking: thinkingOn,
  };
  if (thinkingOn) options.maxTokens = Math.max(options.maxTokens, 4096);

  const history = tidyHistory(conv.messages
    .filter((m) => m.id !== replyId && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({ role: m.role, content: m.content })));
  const messages = [{ role: "system", content: activeModel?.systemPrompt || LOCAL_SYSTEM_PROMPT }, ...history];

  let full = "";
  let thinkingText = "";
  let thinkLine = null;
  let answerLine = null;

  try {
    cliPrint(`正在使用 ${activeModel?.name || "本地模型"} 生成…`, "muted");
    if (activeModel && !cachedModels.has(activeModel.id)) {
      cliPrint("这个模型还没缓存，首次使用会先下载，可能需要几分钟。", "muted");
    }
    await ensureLocalModel();
    await localEngine.generate(messages, options, (delta) => {
      full += delta;
      if (!answerLine) answerLine = cliAppendStream("", "");
      answerLine.textContent = full;
      $("cliOutput").scrollTop = $("cliOutput").scrollHeight;
    }, (thought) => {
      thinkingText += thought;
      if (!thinkLine) thinkLine = cliAppendStream("muted", "🤔 思考中…");
      thinkLine.textContent = `🤔 思考中… ${thinkingText.length} 字`;
    });

    if (thinkingOn && thinkingText.trim() && !full.trim()) {
      cliPrint("思考阶段用完了 token，正在补最终答案…", "muted");
      const fallbackMessages = messages.map((m, i) => i === 0
        ? { ...m, content: m.content + " 请立即给出最终答案，不要再展开思考。" }
        : m);
      await localEngine.generate(fallbackMessages, { ...options, enableThinking: false, maxTokens: 2048 }, (delta) => {
        full += delta;
        if (!answerLine) answerLine = cliAppendStream("", "");
        answerLine.textContent = full;
        $("cliOutput").scrollTop = $("cliOutput").scrollHeight;
      }, () => {});
    }

    if (thinkLine) thinkLine.textContent = `🤔 思考完成（${thinkingText.length} 字）`;
    if (!full.trim()) {
      if (!answerLine) answerLine = cliAppendStream("err", "");
      answerLine.textContent = "（模型没有返回内容）";
    }
    const target = conv.messages.find((m) => m.id === replyId);
    if (target) {
      target.content = full || "（模型没有返回内容）";
      target.thinking = thinkingText.trim();
      target.streaming = false;
    }
  } catch (error) {
    if (answerLine) {
      answerLine.className = "cli-line err";
      answerLine.textContent = `出错了：${error.message || error}`;
    } else {
      cliPrint(`出错了：${error.message || error}`, "err");
    }
    const target = conv.messages.find((m) => m.id === replyId);
    if (target) {
      target.content = full || "（生成失败）";
      target.thinking = thinkingText.trim();
      target.streaming = false;
    }
  } finally {
    setBusy(false);
    conv.updatedAt = Date.now();
    saveState();
    renderMessages();
    renderConvList();
    cliPrint("");
    $("cliInput").focus();
  }
}

function cliBackup() {
  const conv = currentConv();
  if (!conv || !conv.messages.length) {
    cliPrint("当前对话为空，没有可备份的内容。", "err");
    return;
  }
  exportCurrent();
  cliPrint(`已导出「${convTitle(conv)}」为 Markdown。`, "ok");
}

function cliListChats() {
  if (!state.conversations.length) {
    cliPrint("还没有会话。输入 /create chat new 新建一个。", "muted");
    return;
  }
  cliPrint("会话列表：", "head");
  state.conversations.forEach((conv, index) => {
    const active = conv.id === currentId ? "  ← 当前" : "";
    cliPrint(`  ${String(index + 1).padStart(2)}. ${convTitle(conv)}${active}`);
  });
  cliPrint("输入 /chat open <序号> 打开会话。", "muted");
}

function cliHelp() {
  cliPrint("可用命令：", "head");
  const rows = [
    ["/help", "显示帮助"],
    ["/model choose", "列出并选择本地模型"],
    ["/models", "列出所有模型"],
    ["/desktop", "回到图形模式"],
    ["/create chat new", "新建对话"],
    ["/create chat backup", "备份当前对话为 Markdown"],
    ["/chat list", "列出会话"],
    ["/chat open <序号>", "打开会话"],
    ["/chat clear", "清空当前会话"],
    ["/intensity <档位>", "设置思考强度"],
    ["/thinking on|off", "开关思考链"],
    ["/perf", "打开电脑性能预估问卷"],
    ["/status", "查看当前状态"],
    ["/stop", "停止当前生成"],
    ["/clear", "清空终端输出"],
    ["<文字>", "直接输入文字，和本地模型对话"],
  ];
  rows.forEach(([command, desc]) => cliPrint(`  ${command.padEnd(28)}${desc}`));
  cliPrint("提示：↑/↓ 历史命令，Tab 补全。", "muted");
}

function cliRun(raw) {
  const input = raw.trim();
  if (!input) return;
  cliPrint(`sodijat@local:~$ ${input}`, "cmd");
  cliHistory.push(input);
  cliHistoryIndex = cliHistory.length;

  if (cliPending === "model" && !input.startsWith("/")) {
    const model = cliResolveModel(input);
    if (model) {
      cliPending = null;
      cliSelectModel(model);
    } else {
      cliPrint("没找到这个模型。输入序号或模型名，输入 / 取消。", "err");
    }
    return;
  }
  cliPending = null;

  if (!input.startsWith("/")) {
    cliChat(input);
    return;
  }

  const tokens = input.split(/\s+/);
  const cmd = tokens[0].toLowerCase();
  const args = tokens.slice(1);
  const rest = args.join(" ");

  if (cmd === "/help" || cmd === "/?") {
    cliHelp();
  } else if (cmd === "/desktop" || cmd === "/exit" || cmd === "/gui") {
    cliPrint("正在返回图形模式…", "ok");
    setTimeout(closeCli, 180);
  } else if (cmd === "/model") {
    if (!args.length || args[0].toLowerCase() === "choose" || args[0].toLowerCase() === "list") {
      cliListModels();
      cliPrint("输入序号或模型名选择，输入 / 取消。", "muted");
      cliPending = "model";
    } else {
      const model = cliResolveModel(rest);
      if (model) cliSelectModel(model);
      else cliPrint("没找到这个模型。输入 /models 查看列表。", "err");
    }
  } else if (cmd === "/models") {
    cliListModels();
  } else if (cmd === "/create") {
    if (rest === "chat new" || rest === "new") {
      cliNewChat();
    } else if (rest === "chat backup" || rest === "backup") {
      cliBackup();
    } else {
      cliPrint("用法：/create chat new | /create chat backup", "err");
    }
  } else if (cmd === "/chat") {
    const sub = (args[0] || "list").toLowerCase();
    if (sub === "list") {
      cliListChats();
    } else if (sub === "new") {
      cliNewChat();
    } else if (sub === "open") {
      const index = Number(args[1]) - 1;
      const conv = state.conversations[index];
      if (!conv) {
        cliPrint("序号无效。输入 /chat list 查看会话。", "err");
      } else {
        currentId = conv.id;
        saveState();
        renderAll();
        cliPrint(`已打开「${convTitle(conv)}」。`, "ok");
      }
    } else if (sub === "clear") {
      const conv = currentConv();
      if (!conv || !conv.messages.length) {
        cliPrint("当前对话已经是空的。", "muted");
      } else if (confirm("清空当前会话的所有消息？这个操作没法撤销。")) {
        conv.messages = [];
        conv.title = "新的对话";
        saveState();
        renderMessages();
        renderConvList();
        cliPrint("当前对话已清空。", "ok");
      }
    } else if (sub === "backup") {
      cliBackup();
    } else {
      cliPrint("用法：/chat list | /chat open <序号> | /chat clear | /chat backup", "err");
    }
  } else if (cmd === "/intensity") {
    const aliases = {
      slow: "slow", "1": "slow", "轻度": "slow",
      medium: "medium", "2": "medium", "中": "medium", "中速": "medium",
      speed: "speed", "3": "speed", "快速": "speed",
      speedlimits: "speedlimits", "4": "speedlimits", "极速": "speedlimits",
      ultra: "ultra", "5": "ultra", "极限": "ultra",
    };
    const key = aliases[rest.toLowerCase()];
    if (!key) {
      cliPrint("用法：/intensity <slow|medium|speed|speedlimits|ultra>", "err");
      return;
    }
    state.settings.local.intensity = key;
    saveState();
    syncModeUI();
    cliPrint(`思考强度已设为 ${INTENSITY_PRESETS[key].label}。`, "ok");
  } else if (cmd === "/thinking") {
    const model = LOCAL_MODELS.find((m) => m.id === state.settings.local.modelId);
    if (!model?.thinkingSupported) {
      cliPrint("当前模型不支持思考链。", "err");
      return;
    }
    const value = rest.toLowerCase();
    if (value === "on" || value === "1" || value === "开") {
      state.settings.local.thinkingEnabled = true;
    } else if (value === "off" || value === "0" || value === "关") {
      state.settings.local.thinkingEnabled = false;
    } else {
      cliPrint(`思考链当前：${state.settings.local.thinkingEnabled ? "开" : "关"}。用法：/thinking on|off`, "muted");
      return;
    }
    saveState();
    syncModeUI();
    cliPrint(`思考链已${state.settings.local.thinkingEnabled ? "开启" : "关闭"}。`, "ok");
  } else if (cmd === "/perf") {
    cliPrint("正在打开性能预估…", "ok");
    closeCli();
    openPerf();
  } else if (cmd === "/status") {
    const model = LOCAL_MODELS.find((m) => m.id === state.settings.local.modelId);
    const intensity = INTENSITY_PRESETS[state.settings.local.intensity] || INTENSITY_PRESETS.medium;
    const conv = currentConv();
    cliPrint("运行状态：", "head");
    cliPrint(`  模型：${model?.name || "未选择"}（${model?.vram || "-"}）`);
    cliPrint(`  强度：${intensity.label} · 思考链：${state.settings.local.thinkingEnabled ? "开" : "关"}`);
    cliPrint(`  缓存：${model && cachedModels.has(model.id) ? "已缓存" : "未缓存"}`);
    cliPrint(`  WebGPU：${webgpuSupported ? "可用" : "不可用"}`);
    cliPrint(`  对话：${conv ? convTitle(conv) : "无"} · ${conv?.messages.length || 0} 条消息`);
  } else if (cmd === "/stop") {
    if (!busy) {
      cliPrint("现在没有正在生成的内容。", "muted");
    } else {
      stopGeneration();
      cliPrint("已请求停止生成。", "ok");
    }
  } else if (cmd === "/clear") {
    $("cliOutput").innerHTML = "";
    cliPrint("终端已清空。输入 /help 查看命令。", "muted");
  } else if (cmd === "/export") {
    cliBackup();
  } else {
    cliPrint(`未知命令：${cmd}。输入 /help 查看可用命令。`, "err");
  }
}

function cliComplete() {
  const input = $("cliInput");
  const value = input.value;
  if (!value.startsWith("/")) return;
  const matches = CLI_COMMANDS.filter((command) => command.startsWith(value));
  if (matches.length === 1) {
    input.value = matches[0] + " ";
  } else if (matches.length > 1) {
    cliPrint(`sodijat@local:~$ ${value}`, "cmd");
    matches.forEach((command) => cliPrint("  " + command, "muted"));
  }
}

/* ---------- Events ---------- */
function bindEvents() {
  $("newChatBtn").onclick = newChat;
  $("sendBtn").onclick = sendMessage;
  $("stopBtn").onclick = stopGeneration;
  $("clearBtn").onclick = clearCurrent;
  $("exportBtn").onclick = exportCurrent;
  $("openSettings").onclick = () => openSettings("local");
  $("topSettingsBtn").onclick = () => openSettings("local");
  $("closeSettings").onclick = closeSettings;
  $("scrim").onclick = () => { closeSettings(); closeSidebar(); };
  $("menuBtn").onclick = openSidebar;
  $("sidebarClose").onclick = closeSidebar;
  $("openCli").onclick = openCli;
  $("closeCli").onclick = closeCli;
  $("cli").addEventListener("click", (event) => {
    if (event.target === $("cli")) closeCli();
  });

  $("cliInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const value = $("cliInput").value;
      $("cliInput").value = "";
      cliRun(value);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!cliHistory.length) return;
      cliHistoryIndex = Math.max(0, cliHistoryIndex - 1);
      $("cliInput").value = cliHistory[cliHistoryIndex] || "";
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      cliHistoryIndex = Math.min(cliHistory.length, cliHistoryIndex + 1);
      $("cliInput").value = cliHistory[cliHistoryIndex] || "";
    } else if (event.key === "Tab") {
      event.preventDefault();
      cliComplete();
    } else if (event.key === "Escape") {
      closeCli();
    }
  });

  document.querySelectorAll(".settings-tab").forEach((btn) => btn.onclick = () => selectSettingsTab(btn.dataset.tab));
  $("refreshCacheBtn").onclick = async () => { await refreshCacheStatus(); toast("缓存状态已刷新", "ok"); };

  $("perfBtn").onclick = openPerf;
  $("closePerf").onclick = closePerf;
  $("perfBuildPreset").onchange = (event) => {
    if (event.target.value) applyPerfBuild(event.target.value);
  };
  $("perfCpuPreset").onchange = (event) => {
    if (event.target.value) applyPerfCpu(event.target.value);
  };
  $("perfGpuPreset").onchange = (event) => {
    if (event.target.value) applyPerfGpu(event.target.value);
  };
  $("perfModal").addEventListener("click", (event) => {
    if (event.target === $("perfModal")) {
      closePerf();
      return;
    }
    const option = event.target.closest(".perf-option");
    if (!option) return;
    const group = option.parentElement;
    group.querySelectorAll(".perf-option").forEach((node) => node.classList.toggle("selected", node === option));
    if (group.id === "perfRamOptions") {
      perfState.ram = Number(option.dataset.value);
      $("perfRamCustom").value = "";
      $("perfBuildPreset").value = "";
    } else if (group.id === "perfVramOptions") {
      perfState.vram = option.dataset.value === "unknown" ? null : Number(option.dataset.value);
      $("perfBuildPreset").value = "";
      $("perfGpuPreset").value = "";
    } else if (group.id === "perfPreferenceOptions") {
      perfState.preference = option.dataset.value;
    } else if (group.id === "perfLanguageOptions") {
      perfState.language = option.dataset.value;
    }
  });
  $("perfRamCustom").addEventListener("input", () => {
    document.querySelectorAll("#perfRamOptions .perf-option").forEach((node) => node.classList.remove("selected"));
    perfState.ram = Number($("perfRamCustom").value) || null;
    $("perfBuildPreset").value = "";
  });
  $("perfGpuInput").addEventListener("input", () => {
    perfState.gpu = $("perfGpuInput").value;
    $("perfBuildPreset").value = "";
    $("perfGpuPreset").value = "";
  });
  $("perfNext1").onclick = () => {
    if (!perfGetRam()) {
      toast("先选一个内存大小。", "err");
      return;
    }
    perfShowStep(2);
  };
  $("perfBack2").onclick = () => perfShowStep(1);
  $("perfNext2").onclick = () => {
    perfState.gpu = $("perfGpuInput").value.trim();
    perfShowStep(3);
  };
  $("perfBack3").onclick = () => perfShowStep(2);
  $("perfRun").onclick = perfRunEstimate;
  $("perfAgain").onclick = openPerf;
  $("perfDone").onclick = closePerf;

  const applyIntensityIndex = (index) => {
    const clamped = Math.max(0, Math.min(INTENSITY_LEVELS.length - 1, index));
    const key = INTENSITY_LEVELS[clamped];
    if (key === state.settings.local.intensity) return;
    state.settings.local.intensity = key;
    saveState();
    syncModeUI();
  };

  $("intensityTrigger").addEventListener("click", (event) => {
    event.stopPropagation();
    toggleIntensityPanel();
  });
  document.querySelectorAll(".intensity-tab").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      selectIntensityPane(btn.dataset.pane);
    });
  });
  $("thinkingToggle").addEventListener("change", (event) => {
    event.stopPropagation();
    state.settings.local.thinkingEnabled = event.target.checked;
    saveState();
    syncModeUI();
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest("#intensityPopover")) closeIntensityPanel();
  });

  $("codexModelLine").addEventListener("click", (event) => {
    event.stopPropagation();
    selectIntensityPane("model");
  });
  $("codexReset").addEventListener("click", (event) => {
    event.stopPropagation();
    selectIntensityPane("intensity");
    applyIntensityIndex(1);
  });
  $("codexFullMode").addEventListener("click", (event) => {
    event.stopPropagation();
    if (!confirm("是否开启完整模式？\n\n开启完整模式会自动切换到 Ultra，并打开思考链。")) return;
    state.settings.local.intensity = "ultra";
    state.settings.local.thinkingEnabled = true;
    saveState();
    syncModeUI();
    selectIntensityPane("intensity");
  });

  $("intensityRange").addEventListener("input", (event) => {
    applyIntensityIndex(Number(event.target.value));
  });

  const input = $("promptInput");
  input.addEventListener("input", autoResizeInput);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      sendMessage();
    }
  });

  document.querySelectorAll("#suggestions button").forEach((btn) => {
    btn.onclick = () => {
      input.value = btn.dataset.prompt;
      autoResizeInput();
      input.focus();
    };
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!$("perfModal").hidden) {
      closePerf();
      return;
    }
    if (cliOpen) {
      closeCli();
      return;
    }
    closeIntensityPanel();
    if (!$("settings").hidden) closeSettings();
    else if (sidebarOpen) closeSidebar();
  });
}

async function init() {
  populatePerfPresets();
  bindEvents();
  if (!currentConv() && state.conversations.length) currentId = state.conversations[0].id;
  if (!currentConv()) ensureConversation();
  renderAll();
  probeLocal();
}

init();
