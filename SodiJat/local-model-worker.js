// SodiJat 本地模型 Worker：WebLLM 的加载、缓存管理与流式推理都在这里，
// 避免模型推理把主线程卡成 PPT。

let webllm = null;
let engine = null;
let loadedModelId = null;
let loading = false;
let interrupted = false;

const send = (message) => self.postMessage(message);

function isLooping(text) {
  if (text.length < 120) return false;
  const tail = text.slice(-24);
  if (tail.length < 12) return false;
  return text.split(tail).length - 1 >= 4;
}

async function ensureWebLLM() {
  if (!webllm) {
    webllm = await import("https://esm.run/@mlc-ai/web-llm@0.2.89");
  }
  return webllm;
}

function appConfigFor(lib) {
  const base = lib.prebuiltAppConfig;
  return {
    ...base,
    model_list: base.model_list.map((record) =>
      record.model_id.startsWith("Qwen3.5")
        ? { ...record, overrides: { ...(record.overrides || {}), max_history_size: 16 } }
        : record
    ),
  };
}

async function checkGPU() {
  try {
    if (!navigator.gpu) return { supported: false, reason: "当前浏览器没有暴露 WebGPU 接口" };
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return { supported: false, reason: "没有找到可用的 GPU 适配器" };
    return { supported: true, reason: "" };
  } catch (error) {
    return { supported: false, reason: String(error?.message || error) };
  }
}

async function loadModel(modelId, id) {
  if (loading) throw new Error("已有模型正在加载，请稍候");
  loading = true;
  try {
    const lib = await ensureWebLLM();
    if (engine && loadedModelId !== modelId) {
      await engine.unload();
      engine = null;
      loadedModelId = null;
    }
    if (!engine) {
      engine = await lib.CreateMLCEngine(modelId, {
        appConfig: appConfigFor(lib),
        initProgressCallback: (report) => {
          send({
            type: "progress",
            id,
            progress: Number(report.progress) || 0,
            text: String(report.text || ""),
          });
        },
      });
      loadedModelId = modelId;
    }
    send({ type: "done", id, ok: true, modelId, reused: false });
  } finally {
    loading = false;
  }
}

async function generate(messages, options, id) {
  if (!engine) throw new Error("本地模型尚未加载");
  interrupted = false;
  await engine.resetChat();
  let fullText = "";
  let fullThinking = "";
  let usage = null;
  try {
    const chunks = await engine.chat.completions.create({
      messages,
      temperature: options.temperature ?? 0.7,
      top_p: options.top_p ?? 0.9,
      max_tokens: options.maxTokens ?? 1024,
      repetition_penalty: options.repetition_penalty ?? 1.1,
      frequency_penalty: options.frequency_penalty ?? 0,
      presence_penalty: options.presence_penalty ?? 0,
      stream: true,
      stream_options: { include_usage: true },
      ...(typeof options.enableThinking === "boolean" ? { extra_body: { enable_thinking: options.enableThinking } } : {}),
    });

    // 无论思考模式开没开，都把 <think>...</think> 藏起来，只把答案显示给用户。
    let thinkBuffer = "";
    let thinkHandled = false;
    const emit = (text) => {
      if (!text) return;
      fullText += text;
      send({ type: "delta", id, text });
    };
    const emitThinking = (text) => {
      if (!text || !text.trim()) return;
      fullThinking += text;
      send({ type: "thinking", id, text });
    };
    const feed = (delta) => {
      if (!delta) return;
      if (thinkHandled) { emit(delta); return; }
      thinkBuffer += delta;
      if (thinkBuffer.startsWith("<think>")) {
        const close = thinkBuffer.indexOf("</think>");
        if (close !== -1) {
          thinkHandled = true;
          emitThinking(thinkBuffer.slice("<think>".length, close));
          emit(thinkBuffer.slice(close + "</think>".length).replace(/^\n+/, ""));
          thinkBuffer = "";
        } else {
          const partial = thinkBuffer.slice("<think>".length);
          if (partial) {
            emitThinking(partial);
            thinkBuffer = "<think>";
          }
        }
        return;
      }
      if ("<think>".startsWith(thinkBuffer)) return;
      thinkHandled = true;
      emit(thinkBuffer);
      thinkBuffer = "";
    };

    for await (const chunk of chunks) {
      feed(chunk?.choices?.[0]?.delta?.content || "");
      if (chunk?.usage) usage = chunk.usage;
      if (isLooping(fullText)) {
        emit("\n\n（检测到模型开始复读，已自动停止。换个问法或切换到 1.7B / 3B 模型会更稳。）");
        break;
      }
    }
    if (!thinkHandled && thinkBuffer) {
      if (thinkBuffer.startsWith("<think>")) emitThinking(thinkBuffer.slice("<think>".length));
      else emit(thinkBuffer);
    }
  } catch (error) {
    if (!interrupted) throw error;
  }
  send({ type: "done", id, text: fullText, thinking: fullThinking, usage, interrupted });
}

self.onmessage = async (event) => {
  const { id, type, payload = {} } = event.data || {};
  try {
    switch (type) {
      case "probe": {
        const gpu = await checkGPU();
        let version = null;
        try {
          const lib = await ensureWebLLM();
          version = lib.modelVersion;
        } catch (error) {
          send({ type: "result", id, ok: false, error: "加载 WebLLM 失败：" + String(error?.message || error) });
          return;
        }
        send({ type: "result", id, ok: true, gpu, version });
        break;
      }
      case "checkCache": {
        const lib = await ensureWebLLM();
        const cached = await lib.hasModelInCache(payload.modelId, appConfigFor(lib));
        send({ type: "result", id, ok: true, cached });
        break;
      }
      case "load": {
        await loadModel(payload.modelId, id);
        break;
      }
      case "generate": {
        await generate(payload.messages, payload.options || {}, id);
        break;
      }
      case "unload": {
        if (engine) await engine.unload();
        engine = null;
        loadedModelId = null;
        send({ type: "result", id, ok: true });
        break;
      }
      case "deleteModel": {
        if (engine && loadedModelId === payload.modelId) {
          await engine.unload();
          engine = null;
          loadedModelId = null;
        }
        const lib = await ensureWebLLM();
        await lib.deleteModelAllInfoInCache(payload.modelId, appConfigFor(lib));
        send({ type: "result", id, ok: true });
        break;
      }
      case "interrupt": {
        interrupted = true;
        if (engine) await engine.interruptGenerate();
        send({ type: "result", id, ok: true });
        break;
      }
      default:
        send({ type: "result", id, ok: false, error: "未知指令：" + type });
    }
  } catch (error) {
    send({
      type: "error",
      id,
      error: String(error?.message || error),
      stack: error?.stack || null,
    });
  }
};
