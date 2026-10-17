import { detectPitch } from './pitch';
import { Smoother } from './smoother';

export interface DetectorConfig {
  minFreq: number;
  maxFreq: number;
  /** Power of two; must hold at least ~2 periods of minFreq. */
  bufferSize: number;
}

/** Keep showing the last reading briefly after the sound decays. */
const HOLD_MS = 800;

export class Tuner {
  private ctx?: AudioContext;
  private stream?: MediaStream;
  private analyser?: AnalyserNode;
  private buf = new Float32Array(0);
  private raf = 0;
  private lastHeard = 0;
  private smoother = new Smoother();

  constructor(private cfg: DetectorConfig, private onReading: (freq: number | null) => void) {}

  get running() {
    return !!this.ctx;
  }

  async start() {
    // Created before the await so it is still inside the click gesture; iOS Safari
    // leaves contexts created after the permission prompt suspended.
    const ctx = new AudioContext();
    try {
      // Voice processing would distort or gate the instrument signal.
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e) {
      ctx.close();
      throw e;
    }
    this.ctx = ctx;
    this.analyser = ctx.createAnalyser();
    ctx.createMediaStreamSource(this.stream).connect(this.analyser);
    this.setConfig(this.cfg);
    this.tick();
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close();
    this.ctx = this.stream = this.analyser = undefined;
    this.onReading(null);
  }

  setConfig(cfg: DetectorConfig) {
    this.cfg = cfg;
    this.smoother.reset();
    if (this.analyser) {
      this.analyser.fftSize = cfg.bufferSize;
      this.buf = new Float32Array(cfg.bufferSize);
    }
  }

  private tick = () => {
    const { analyser, ctx, cfg } = this;
    if (!analyser || !ctx) return;
    analyser.getFloatTimeDomainData(this.buf);
    const r = detectPitch(this.buf, ctx.sampleRate, cfg.minFreq, cfg.maxFreq);
    const now = performance.now();
    if (r) {
      this.lastHeard = now;
      this.onReading(this.smoother.push(r.freq));
    } else if (this.lastHeard && now - this.lastHeard > HOLD_MS) {
      this.lastHeard = 0;
      this.smoother.reset();
      this.onReading(null);
    }
    this.raf = requestAnimationFrame(this.tick);
  };
}
