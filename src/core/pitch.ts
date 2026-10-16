export interface PitchResult {
  freq: number;
  /** 0..1, higher means more periodic. */
  clarity: number;
}

const SILENCE_RMS = 0.005;

/**
 * YIN pitch detection (de Cheveigné & Kawahara, 2002).
 * Restricting the lag range to the instrument's range avoids most octave errors
 * and keeps the O(n·lag) difference function affordable per frame.
 */
export function detectPitch(
  buf: Float32Array,
  sampleRate: number,
  minFreq: number,
  maxFreq: number,
  threshold = 0.1,
): PitchResult | null {
  const n = buf.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  if (Math.sqrt(rms / n) < SILENCE_RMS) return null;

  const tauMin = Math.max(2, Math.floor(sampleRate / maxFreq));
  const tauMax = Math.min(Math.ceil(sampleRate / minFreq), Math.floor(n / 2) - 1);
  if (tauMin >= tauMax) return null;
  const w = n - (tauMax + 1);

  // Difference function, then cumulative mean normalized difference.
  const d = new Float32Array(tauMax + 2);
  for (let tau = 1; tau <= tauMax + 1; tau++) {
    let sum = 0;
    for (let i = 0; i < w; i++) {
      const diff = buf[i] - buf[i + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }
  d[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax + 1; tau++) {
    running += d[tau];
    d[tau] = running === 0 ? 1 : (d[tau] * tau) / running;
  }

  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (d[t] < threshold) {
      while (t + 1 <= tauMax && d[t + 1] < d[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return null;

  const clarity = 1 - d[tau];
  const period = interpolate(d, tau);

  // High notes span few samples per period; measuring the valley at k periods
  // divides the interpolation error by k.
  const k = Math.min(MAX_MULTIPLE, Math.floor((tauMax - 1) / period));
  if (k > 1) {
    let t = Math.round(k * period);
    while (t > 1 && d[t - 1] < d[t]) t--;
    while (t < tauMax && d[t + 1] < d[t]) t++;
    const refined = interpolate(d, t) / k;
    if (Math.abs(refined - period) < 0.5) return { freq: sampleRate / refined, clarity };
  }
  return { freq: sampleRate / period, clarity };
}

const MAX_MULTIPLE = 8;

/** Parabolic interpolation of the valley at tau for sub-sample precision. */
function interpolate(d: Float32Array, tau: number): number {
  const a = d[tau - 1], b = d[tau], c = d[tau + 1];
  const den = a - 2 * b + c;
  return den !== 0 ? tau + (a - c) / (2 * den) : tau;
}
