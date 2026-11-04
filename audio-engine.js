/**
 * 🎵 彩虹魔法畫布 Rainbow Magic Canvas Pro - Web Audio API 零外部依賴音效與音樂合成引擎
 * 支援：
 * 1. Do-Re-Mi 彩虹音階畫筆音效 (選色/塗色時觸發)
 * 2. 水滴/泡泡填色音效 (區域智慧填色時觸發)
 * 3. 貼紙Q彈啵啵聲、煙火慶祝和弦、遊戲得分與快門音效
 * 4. 輕柔馬林巴木琴創意背景音樂 (BGM)
 * 5. Web Speech API 台灣國語 (zh-TW) 溫柔語音小幫手
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.sfxEnabled = true;
    this.bgmEnabled = false;
    this.voiceEnabled = true;
    this.bgmTimer = null;
    this.bgmStep = 0;
    // C大調五聲音階與高音擴展 (Hz)
    this.scaleFreqs = [
      261.63, // C4 Do
      293.66, // D4 Re
      329.63, // E4 Mi
      349.23, // F4 Fa
      392.00, // G4 Sol
      440.00, // A4 La
      493.88, // B4 Si
      523.25, // C5 High Do
      587.33, // D5 High Re
      659.25, // E5 High Mi
      698.46, // F5 High Fa
      783.99  // G5 High Sol
    ];
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 播放指定頻率與波形的短音
  playTone(freq = 440, duration = 0.18, type = 'sine', volume = 0.16, slideFreq = null) {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideFreq) {
      osc.frequency.exponentialRampToValueAtTime(slideFreq, now + duration);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // 選取顏色或塗色時播放對應彩虹音階 (BabyBus / Sago Mini 音樂畫筆特色)
  playColorNote(index = 0) {
    const freq = this.scaleFreqs[Math.abs(index) % this.scaleFreqs.length];
    this.playTone(freq, 0.22, 'triangle', 0.18);
  }

  // 區塊填色完成時的療癒水滴啵啵聲
  playFillPop(index = 0) {
    const base = this.scaleFreqs[Math.abs(index) % this.scaleFreqs.length];
    this.playTone(base * 0.85, 0.16, 'sine', 0.22, base * 1.45);
  }

  // 蓋印章時的 Q 彈音效
  playStampBoing() {
    if (!this.sfxEnabled) return;
    this.playTone(320, 0.12, 'sine', 0.2, 640);
    setTimeout(() => this.playTone(640, 0.18, 'triangle', 0.16, 480), 70);
  }

  // 魔法仙女棒閃亮音效
  playSparkle() {
    if (!this.sfxEnabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      setTimeout(() => this.playTone(n, 0.14, 'sine', 0.1), i * 45);
    });
  }

  // 完成作品或過關的歡樂號角和弦
  playFanfare() {
    if (!this.sfxEnabled) return;
    const melody = [
      { f: 523.25, d: 0.14, t: 0 },
      { f: 659.25, d: 0.14, t: 110 },
      { f: 783.99, d: 0.14, t: 220 },
      { f: 1046.5, d: 0.42, t: 330 }
    ];
    melody.forEach(m => {
      setTimeout(() => this.playTone(m.f, m.d, 'triangle', 0.22), m.t);
    });
  }

  // 答錯或溫柔提醒音效（絕不刺耳）
  playGentleHint() {
    if (!this.sfxEnabled) return;
    this.playTone(349.23, 0.18, 'sine', 0.14, 329.63);
  }

  // 相機快門聲 (儲存至畫廊時)
  playShutter() {
    if (!this.sfxEnabled) return;
    this.playTone(880, 0.05, 'square', 0.08, 440);
    setTimeout(() => this.playTone(1200, 0.08, 'sine', 0.12), 55);
  }

  // 輕音樂 BGM 控制
  toggleBgm(forceState) {
    this.bgmEnabled = typeof forceState === 'boolean' ? forceState : !this.bgmEnabled;
    if (this.bgmEnabled) {
      this.init();
      this.startBgmLoop();
    } else {
      this.stopBgmLoop();
    }
    return this.bgmEnabled;
  }

  startBgmLoop() {
    this.stopBgmLoop();
    const pattern = [261.63, 329.63, 392.00, 523.25, 440.00, 392.00, 329.63, 293.66];
    this.bgmTimer = setInterval(() => {
      if (!this.bgmEnabled) return;
      const freq = pattern[this.bgmStep % pattern.length];
      this.bgmStep++;
      this.playTone(freq, 0.35, 'sine', 0.045);
    }, 480);
  }

  stopBgmLoop() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  // 台灣國語語音導覽 (TTS)
  speak(text) {
    if (!this.voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'zh-TW';
      utter.rate = 1.0;
      utter.pitch = 1.12;
      window.speechSynthesis.speak(utter);
    } catch (e) {
      // 忽略部分瀏覽器語音限制
    }
  }
}

window.soundEngine = new SoundEngine();
