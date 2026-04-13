/**
 * AI対話型入力ヘルパー
 * 対話型で症状を聞き取って、構造化データにまとめる
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
 * チャットオーバーレイUIを表示
 */
function showChatOverlay({ diseaseId, onComplete, onCancel } = {}) {
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
      <div style="padding:12px 16px;background:var(--white);border-top:1px solid var(--gray-200);">
        <div style="display:flex;gap:8px;">
          <input type="text" id="chat-input" placeholder="メッセージを入力..." style="flex:1;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:20px;font-size:15px;outline:none;">
          <button id="chat-send" class="btn btn-primary" style="width:auto;padding:10px 18px;">送信</button>
        </div>
        <div style="margin-top:8px;">
          <button id="chat-finish" class="btn btn-teal" style="display:none;">この内容で記録する</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const msgsEl = overlay.querySelector("#chat-messages");
  const inputEl = overlay.querySelector("#chat-input");
  const sendBtn = overlay.querySelector("#chat-send");
  const finishBtn = overlay.querySelector("#chat-finish");

  const chat = new SymptomChat({ diseaseId });

  function appendMessage(role, text) {
    const bubble = document.createElement("div");
    bubble.style.cssText = role === "user"
      ? "background:var(--brand-500);color:#fff;padding:10px 14px;border-radius:16px 16px 4px 16px;margin:6px 0 6px auto;max-width:80%;width:fit-content;font-size:14px;"
      : "background:var(--white);padding:10px 14px;border-radius:16px 16px 16px 4px;margin:6px auto 6px 0;max-width:80%;width:fit-content;font-size:14px;box-shadow:var(--shadow-sm);";
    bubble.textContent = text;
    msgsEl.appendChild(bubble);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  // 初回メッセージ
  appendMessage("assistant", "こんにちは。今日の体調を一緒に記録しましょう。どんな感じでしたか？");

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
      if (finished || Object.keys(collected).length >= 3) {
        finishBtn.style.display = "block";
      }
    } catch (err) {
      appendMessage("assistant", "ごめんなさい、エラーが起きました: " + err.message);
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = "送信";
    }
  }

  sendBtn.addEventListener("click", handleSend);
  inputEl.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSend();
  });

  finishBtn.addEventListener("click", () => {
    document.body.removeChild(overlay);
    if (onComplete) onComplete(chat.collected);
  });

  overlay.querySelector("#chat-close").addEventListener("click", () => {
    if (Object.keys(chat.collected).length > 0) {
      if (!confirm("記録内容を保存せずに閉じますか？")) return;
    }
    document.body.removeChild(overlay);
    if (onCancel) onCancel();
  });

  setTimeout(() => inputEl.focus(), 100);
}

window.SymptomChat = SymptomChat;
window.showChatOverlay = showChatOverlay;
