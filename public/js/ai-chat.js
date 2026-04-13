/**
 * AI対話型入力ヘルパー
 * 対話型で症状を聞き取って、構造化データにまとめる
 * 音声入力（MediaRecorder + Gemini書き起こし）を統合
 */

class SymptomChat {
  constructor({ diseaseId, onComplete, onError }) {
    this.diseaseId = diseaseId;
    this.onComplete = onComplete;
    this.onError = onError;
    this.messages = [];
    this.collected = {};
    this.finished = false;
  }

  async send(userMessage) {
    this.messages.push({ role: "user", content: userMessage });
    try {
      const res = await apiPost("/api/ai/chat-symptom", {
        messages: this.messages,
        diseaseId: this.diseaseId,
      });
      this.messages.push({ role: "assistant", content: res.reply });
      this.collected = { ...this.collected, ...res.collected };
      this.finished = res.finished;
      return {
        reply: res.reply,
        collected: this.collected,
        finished: this.finished,
      };
    } catch (err) {
      if (this.onError) this.onError(err);
      throw err;
    }
  }
}

/**
 * 初回ウェルカムメッセージを疾患別に生成（自然言語化）
 */
function buildWelcomeMessages(template) {
  const metrics = template?.symptomConfig?.metrics || [];
  // 自然言語の項目リスト（ラベルのみ、最初の4項目）
  const topicList = metrics.slice(0, 4).map((m) => `・${m.label}`).join("\n");

  // 疾患別の例文（話しやすい自然な言葉で）
  const examples = {
    uc: "排便は4回くらい、血便は少しあって、お腹は軽く痛い感じ。ちょっと疲れた",
    crohn: "排便3回、血便はなし、お腹の痛みは軽い、体重は変わらない",
    parkinson: "薬が効いてた時間は10時間くらい、調子悪い時間は3時間、すくみ足があった、転んでしまった",
    sle: "関節が少し痛い、皮疹が出た、熱はなし、だるい",
    ra: "朝のこわばりは30分くらい、関節が痛い、手首が腫れてる、疲れる",
    ms: "500mくらい歩けた、視力は変わらない、しびれがある、疲れやすい",
    mg: "筋力が少し落ちてる、まぶたが下がる、飲み込みは大丈夫、夕方しんどい",
    fabry: "手足が少し痛む、お腹の調子は悪い、めまいはない、疲れた",
    pah: "息切れは軽くある、SpO2は95、500mは歩ける、むくみは軽い",
    t1d: "TIR 75％、変動係数32、低血糖が2回、TDDは38単位",
  };
  const example = examples[template?.id] || examples.uc;

  const welcome = `こんにちは！今日の体調を一緒に記録しましょう 😊

今日の症状について、下記のようなことを教えてください：
${topicList}

💡 話し方は自由です。例えばこんな感じでOKです：

「${example}」

全部まとめて話しても、少しずつでも大丈夫。
下の入力欄に入力するか、🎙ボタンで音声入力もできます。どうぞ始めてください。`;
  return welcome;
}

/**
 * チャットオーバーレイUIを表示
 */
async function showChatOverlay({ diseaseId, onComplete, onCancel } = {}) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:400;display:flex;flex-direction:column;align-items:center;";
  overlay.innerHTML = `
    <div style="background:var(--white);width:100%;max-width:430px;height:100%;display:flex;flex-direction:column;">
      <div style="background:linear-gradient(135deg,var(--brand-500),var(--brand-600));color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px;">
        <button id="chat-close" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;">&times;</button>
        <div style="flex:1;font-weight:700;">AIと会話して記録</div>
      </div>
      <div style="background:#fef3c7;padding:8px 16px;font-size:11px;color:#92400e;">💡 AIは入力を手伝うだけです。診断ではありません</div>
      <div id="chat-messages" style="flex:1;overflow-y:auto;padding:16px;background:var(--gray-50);"></div>
      <div id="chat-progress" style="padding:6px 16px;background:#f0fdf9;font-size:11px;color:var(--teal-dark);display:none;"></div>

      <!-- 録音中オーバーレイ -->
      <div id="rec-indicator" class="hidden" style="padding:14px 16px;background:#fef3c7;border-top:1px solid var(--gray-200);display:flex;align-items:center;gap:12px;">
        <div style="width:14px;height:14px;background:var(--danger);border-radius:50%;animation:blink 1s infinite;"></div>
        <div style="flex:1;font-size:13px;color:#92400e;">
          <strong>録音中...</strong> <span id="rec-timer">00:00</span>
        </div>
        <button id="rec-stop" class="btn btn-primary" style="width:auto;padding:6px 14px;font-size:12px;">話し終わった</button>
      </div>

      <div id="chat-input-bar" style="padding:12px 16px;background:var(--white);border-top:1px solid var(--gray-200);">
        <div style="display:flex;gap:8px;align-items:center;">
          <button id="chat-mic" title="音声で入力" style="flex-shrink:0;width:44px;height:44px;border-radius:50%;border:2px solid var(--brand-200);background:var(--white);color:var(--brand-600);font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;">🎙</button>
          <input type="text" id="chat-input" placeholder="メッセージを入力..." style="flex:1;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:20px;font-size:15px;outline:none;">
          <button id="chat-send" class="btn btn-primary" style="width:auto;padding:10px 18px;flex-shrink:0;">送信</button>
        </div>
        <div style="margin-top:8px;">
          <button id="chat-finish" class="btn btn-teal" style="display:none;">この内容で記録する</button>
        </div>
      </div>
    </div>
    <style>
      @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
    </style>`;
  document.body.appendChild(overlay);

  const msgsEl = overlay.querySelector("#chat-messages");
  const inputEl = overlay.querySelector("#chat-input");
  const sendBtn = overlay.querySelector("#chat-send");
  const finishBtn = overlay.querySelector("#chat-finish");
  const progressEl = overlay.querySelector("#chat-progress");
  const micBtn = overlay.querySelector("#chat-mic");
  const recIndicator = overlay.querySelector("#rec-indicator");
  const recTimerEl = overlay.querySelector("#rec-timer");
  const recStopBtn = overlay.querySelector("#rec-stop");
  const inputBar = overlay.querySelector("#chat-input-bar");

  const chat = new SymptomChat({ diseaseId });
  const template = getTemplate();
  const metrics = template?.symptomConfig?.metrics || [];

  function appendMessage(role, text) {
    const bubble = document.createElement("div");
    bubble.style.cssText = role === "user"
      ? "background:var(--brand-500);color:#fff;padding:10px 14px;border-radius:16px 16px 4px 16px;margin:6px 0 6px auto;max-width:85%;width:fit-content;font-size:14px;white-space:pre-wrap;line-height:1.5;"
      : "background:var(--white);padding:10px 14px;border-radius:16px 16px 16px 4px;margin:6px auto 6px 0;max-width:85%;width:fit-content;font-size:14px;box-shadow:var(--shadow-sm);white-space:pre-wrap;line-height:1.6;";
    bubble.textContent = text;
    msgsEl.appendChild(bubble);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function appendSystemHint(text) {
    const hint = document.createElement("div");
    hint.style.cssText = "text-align:center;color:var(--gray-400);font-size:11px;padding:6px 0;";
    hint.textContent = text;
    msgsEl.appendChild(hint);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function updateProgress() {
    const filled = Object.keys(chat.collected).filter((k) => chat.collected[k] !== null && chat.collected[k] !== undefined).length;
    const total = metrics.length;
    if (filled > 0) {
      progressEl.style.display = "block";
      progressEl.textContent = `📝 記録中: ${filled} / ${total} 項目`;
    }
  }

  // 初回ウェルカムメッセージ（疾患別・自然言語化）
  appendMessage("assistant", buildWelcomeMessages(template));

  async function handleSend() {
    const text = inputEl.value.trim();
    if (!text) return;
    appendMessage("user", text);
    inputEl.value = "";
    sendBtn.disabled = true;
    sendBtn.textContent = "...";

    try {
      const { reply, collected, finished } = await chat.send(text);
      appendMessage("assistant", reply);
      updateProgress();
      if (finished || Object.keys(collected).length >= Math.min(3, metrics.length)) {
        finishBtn.style.display = "block";
      }
    } catch (err) {
      appendMessage("assistant", "ごめんなさい、エラーが起きました: " + err.message);
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = "送信";
    }
  }

  // === 音声入力（チャット内統合） ===
  let recorder = null;
  let recStartTime = null;
  let recInterval = null;

  async function startRecording() {
    if (!VoiceRecorder || !VoiceRecorder.isSupported()) {
      alert("このブラウザは音声入力に対応していません");
      return;
    }
    recorder = new VoiceRecorder({
      onError: (err) => {
        alert("マイクエラー: " + err.message);
        stopRecordingUi();
      },
    });
    try {
      await recorder.start();
      inputBar.style.display = "none";
      recIndicator.classList.remove("hidden");
      recStartTime = Date.now();
      recInterval = setInterval(() => {
        const sec = Math.floor((Date.now() - recStartTime) / 1000);
        recTimerEl.textContent = String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0");
      }, 500);
    } catch (err) {
      alert("マイクへのアクセスが拒否されました: " + err.message);
      stopRecordingUi();
    }
  }

  function stopRecordingUi() {
    inputBar.style.display = "";
    recIndicator.classList.add("hidden");
    if (recInterval) { clearInterval(recInterval); recInterval = null; }
    recStartTime = null;
  }

  async function finishRecording() {
    if (!recorder) return;
    recStopBtn.disabled = true;
    recStopBtn.textContent = "処理中...";

    try {
      const { dataUri } = await recorder.stop();
      appendSystemHint("🎙 音声を書き起こし中...");
      const res = await apiPost("/api/ai/transcribe", { audio: dataUri });
      const transcript = (res.transcript || "").trim();
      if (transcript) {
        inputEl.value = transcript;
        appendSystemHint("📝 書き起こしできました。内容を確認して送信してください");
      } else {
        appendSystemHint("⚠️ 音声を認識できませんでした。もう一度お試しください");
      }
    } catch (err) {
      appendSystemHint("❌ 音声処理に失敗: " + err.message);
    } finally {
      recorder = null;
      stopRecordingUi();
      recStopBtn.disabled = false;
      recStopBtn.textContent = "話し終わった";
    }
  }

  micBtn.addEventListener("click", startRecording);
  recStopBtn.addEventListener("click", finishRecording);
  sendBtn.addEventListener("click", handleSend);
  inputEl.addEventListener("keypress", (e) => { if (e.key === "Enter") handleSend(); });

  finishBtn.addEventListener("click", () => {
    document.body.removeChild(overlay);
    if (onComplete) onComplete(chat.collected);
  });

  overlay.querySelector("#chat-close").addEventListener("click", () => {
    if (Object.keys(chat.collected).length > 0) {
      if (!confirm("記録内容を保存せずに閉じますか？")) return;
    }
    if (recorder) recorder.cancel();
    document.body.removeChild(overlay);
    if (onCancel) onCancel();
  });

  setTimeout(() => inputEl.focus(), 100);
}

window.SymptomChat = SymptomChat;
window.showChatOverlay = showChatOverlay;
