/**
 * 音声入力ヘルパー（MediaRecorder版）
 * - ブラウザで音声を録音してBase64データURIを返す
 * - サーバー側で Gemini に送って書き起こし＋構造化抽出
 */

class VoiceRecorder {
  constructor({ onStart, onStop, onError } = {}) {
    this.onStart = onStart;
    this.onStop = onStop;
    this.onError = onError;
    this.mediaRecorder = null;
    this.chunks = [];
    this.stream = null;
    this.isRecording = false;
  }

  static isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  }

  /** 利用可能な最適なmimeTypeを選ぶ */
  static pickMimeType() {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4;codecs=mp4a.40.2",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];
    for (const mt of candidates) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mt)) return mt;
    }
    return "";
  }

  async start() {
    if (this.isRecording) return;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      const mimeType = VoiceRecorder.pickMimeType();
      const options = mimeType ? { mimeType } : {};
      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.chunks = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      if (this.onStart) this.onStart();
    } catch (err) {
      if (this.onError) this.onError(err);
      throw err;
    }
  }

  /** 録音停止 → Blob → Base64データURIに変換して返す */
  async stop() {
    if (!this.isRecording || !this.mediaRecorder) return null;
    return new Promise((resolve, reject) => {
      this.mediaRecorder.onstop = async () => {
        try {
          const mimeType = this.mediaRecorder.mimeType || "audio/webm";
          const blob = new Blob(this.chunks, { type: mimeType });
          // stream を閉じる
          if (this.stream) {
            this.stream.getTracks().forEach((t) => t.stop());
          }
          this.isRecording = false;
          const dataUri = await blobToBase64(blob);
          if (this.onStop) this.onStop({ blob, dataUri, mimeType });
          resolve({ blob, dataUri, mimeType });
        } catch (e) {
          reject(e);
        }
      };
      this.mediaRecorder.stop();
    });
  }

  cancel() {
    if (this.mediaRecorder && this.isRecording) {
      try { this.mediaRecorder.stop(); } catch (e) {}
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
    }
    this.isRecording = false;
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

window.VoiceRecorder = VoiceRecorder;
