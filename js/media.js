import { push, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { CONSTANTS } from './config.js';

export class VoiceRecorder {
  constructor(onFinish) {
    this.onFinish = onFinish;
    this.stream = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.startTime = null;
    this.timer = null;
    this.analyser = null;
    this.audioCtx = null;
    this.type = 'audio';
    this.gesture = { startY: null, dy: 0 };
    this.previewEl = document.getElementById('rec-preview');
    this.canvas = document.getElementById('audio-canvas');
    this.facingMode = 'user';
  }

  async init(type) {
    this.type = type;
    await this.getStream();
    if (this.type === 'audio') {
      this.previewEl.style.display = 'none';
      this.canvas.style.display = 'block';
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      const src = this.audioCtx.createMediaStreamSource(this.stream);
      src.connect(this.analyser);
    } else {
      this.previewEl.style.display = 'block';
      this.previewEl.srcObject = this.stream;
      this.canvas.style.display = 'none';
    }
    return true;
  }

  async getStream() {
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    const constraints = this.type === 'video' 
      ? { audio: true, video: { facingMode: this.facingMode, width: 480, height: 480 } } 
      : { audio: { echoCancellation: true, noiseSuppression: true } };
    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    if (this.type === 'video') this.previewEl.srcObject = this.stream;
  }

  start(onTick) {
    const mime = this.type === 'video' ? 'video/webm;codecs=vp9,opus' : 'audio/webm;codecs=opus';
    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: mime });
    this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.chunks.push(e.data); };
    this.mediaRecorder.onstop = async () => {
      const blob = new Blob(this.chunks, { type: this.type === 'video' ? 'video/webm' : 'audio/webm' });
      const file = new File([blob], `${this.type}_${Date.now()}.webm`, { type: blob.type });
      const duration = Math.floor((Date.now() - this.startTime) / 1000);
      await this.onFinish(file, duration);
    };
    this.mediaRecorder.start(1000);
    this.startTime = Date.now();
    if (this.type === 'audio') this.drawWaveform();
    this.timer = setInterval(() => onTick?.(this.getElapsed()), 1000);
    setTimeout(() => { if (this.mediaRecorder?.state === 'recording') this.stop('send'); }, CONSTANTS.RECORDING_MAX_SEC * 1000);
  }

  getElapsed() { return this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0; }

  stop(action = 'send') {
    clearInterval(this.timer);
    if (this.mediaRecorder?.state === 'recording') this.mediaRecorder.stop();
    if (action === 'cancel') {
      this.stream?.getTracks().forEach(t => t.stop());
      if (this.audioCtx) this.audioCtx.close();
      this.mediaRecorder = null;
    }
  }

  drawWaveform() {
    if (!this.canvas || !this.analyser) return;
    const ctx = this.canvas.getContext('2d');
    const draw = () => {
      if (!this.analyser) return;
      const data = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      const w = this.canvas.width / 32;
      data.forEach((v, i) => {
        const h = (v / 255) * this.canvas.height * 0.8;
        ctx.fillStyle = '#3390ec';
        ctx.fillRect(i * w * 1.8 + 4, this.canvas.height - h, w * 0.8, h);
      });
      requestAnimationFrame(draw);
    };
    draw();
  }

  handleMove(clientY) {
    if (this.gesture.startY === null) this.gesture.startY = clientY;
    this.gesture.dy = clientY - this.gesture.startY;
    
    const hint = document.getElementById('rec-hint');
    const fill = document.getElementById('rec-progress-fill');
    const cancelBtn = document.getElementById('rec-cancel');
    const sendBtn = document.getElementById('rec-send');
    
    if (this.gesture.dy < -50) {
      hint.textContent = 'Отменить запись';
      hint.style.color = '#e53935';
      fill.classList.add('cancel'); fill.classList.remove('send');
      cancelBtn.classList.add('active'); sendBtn.classList.remove('active');
    } else if (this.gesture.dy > 50) {
      hint.textContent = 'Отправить';
      hint.style.color = '#4caf50';
      fill.classList.add('send'); fill.classList.remove('cancel');
      sendBtn.classList.add('active'); cancelBtn.classList.remove('active');
    } else {
      hint.textContent = 'Зажмите кнопку записи';
      hint.style.color = '#707579';
      fill.classList.remove('cancel', 'send');
      cancelBtn.classList.remove('active'); sendBtn.classList.remove('active');
    }
  }

  getAction() {
    return this.gesture.dy < -50 ? 'cancel' : 'send';
  }

  async flipCamera() {
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    this.previewEl.style.transform = this.facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
    await this.getStream();
    if (this.mediaRecorder?.state === 'recording') {
      this.stop();
      setTimeout(() => this.start(), 100);
    }
  }
}