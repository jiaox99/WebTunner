/** Additive-synthesis recipe approximating an instrument's tone. */
export interface Timbre {
  /** Relative amplitude of harmonics 1, 2, 3… */
  partials: number[];
  /** Seconds for the fundamental to die away. */
  decay: number;
  /** Higher partials decay faster: partial n lasts decay / (1 + tilt·(n−1)). */
  tilt: number;
  /** Seconds to reach full level; shorter sounds harder (struck vs. plucked). */
  attack: number;
  /** Stretches upper partials (stiff strings): f_n = n·f·√(1 + B·n²). */
  inharmonicity?: number;
}

let ctx: AudioContext | undefined;

export function playNote(freq: number, t: Timbre) {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.6 / t.partials.reduce((a, b) => a + b, 0);
  master.connect(ctx.destination);

  let end = now;
  t.partials.forEach((amp, i) => {
    const n = i + 1;
    const f = n * freq * Math.sqrt(1 + (t.inharmonicity ?? 0) * n * n);
    if (f > ctx!.sampleRate * 0.45) return;
    const dur = t.decay / (1 + t.tilt * (n - 1));
    const osc = ctx!.createOscillator();
    const g = ctx!.createGain();
    osc.frequency.value = f;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(amp, now + t.attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t.attack + dur);
    osc.connect(g).connect(master);
    osc.start(now);
    osc.stop(now + t.attack + dur);
    end = Math.max(end, now + t.attack + dur);
  });
  setTimeout(() => master.disconnect(), (end - now) * 1000 + 100);
}
