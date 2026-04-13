/**
 * 音声入力ヘルパー（Web Speech API ラッパー）
 * 使い方: const vi = new VoiceInput({ onFinal, onInterim, onError }); vi.start();
 */

class VoiceInput {
  constructor({ onFinal, onInterim, onError, onStart, onEnd, lang = "ja-JP" } = {}) {
    this.onFinal = onFinal;
    this.onInterim = onInterim;
    this.onError = onError;
    this.onStart = onStart;
    this.onEnd = onEnd;
    this.lang = lang;
    this.recognition = null;
    this.isRecording = false;
  }

  /** ブラウザがサポートしているか */
  static isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  start() {
    if (this.isRecording) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      if (this.onError) this.onError(new Error("音声入力はこのブラウザでは使えません"));
      return;
    }

    this.recognition = new Recognition();
    this.recognition.lang = this.lang;
    this.recognition.interimResults = true;
    this.recognition.continuous = true;
    this.finalText = "";

    this.recognition.onstart = () => {
      this.isRecording = true;
      if (this.onStart) this.onStart();
    };

    this.recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          this.finalText += r[0].transcript;
        } else {
          interim += r[0].transcript;
        }
      }
      if (this.onInterim) this.onInterim(interim, this.finalText);
    };

    this.recognition.onerror = (event) => {
      if (this.onError) this.onError(new Error(event.error));
    };

    this.recognition.onend = () => {
      this.isRecording = false;
      if (this.onFinal) this.onFinal(this.finalText);
      if (this.onEnd) this.onEnd();
    };

    this.recognition.start();
  }

  stop() {
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
    }
  }
}

window.VoiceInput = VoiceInput;
