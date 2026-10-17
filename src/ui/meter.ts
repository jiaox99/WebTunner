export type TuneState = 'in-tune' | 'close' | 'off';

const IN_TUNE_CENTS = 3;
const CLOSE_CENTS = 10;

export function tuneState(cents: number): TuneState {
  const a = Math.abs(cents);
  return a <= IN_TUNE_CENTS ? 'in-tune' : a <= CLOSE_CENTS ? 'close' : 'off';
}

// Gauge geometry in viewBox units: the scale is an arc around a pivot below the face,
// like a moving-coil meter, so the needle swings about that pivot.
const CX = 585;
const R = 800;
const PIVOT_Y = 450 + R;
const DEG_PER_CENT = 0.66;
const NEEDLE_FROM = 640;
const MAJOR = 52;
const MID = 38;
const MINOR = 26;

const BEZEL = 'M0 700V215C0 185 20 168 50 158Q585 -120 1120 158C1150 168 1170 185 1170 215V700Z';
const FACE = 'M52 660V232C52 215 66 205 85 196Q585 -50 1085 196C1104 205 1118 215 1118 232V660Z';

const NAME_MAX = 130;
const SUB_MAX = 46;

const rad = (cents: number) => (cents * DEG_PER_CENT * Math.PI) / 180;
const polar = (r: number, cents: number): [number, number] => [
  CX + r * Math.sin(rad(cents)),
  PIVOT_Y - r * Math.cos(rad(cents)),
];
const pt = ([x, y]: [number, number]) => `${x.toFixed(1)} ${y.toFixed(1)}`;

function ticks(len: number, pick: (cents: number) => boolean): string {
  let d = '';
  for (let c = -50; c <= 50; c++) if (pick(c)) d += `M${pt(polar(R, c))}L${pt(polar(R + len, c))}`;
  return d;
}

/** Downward-pointing marker above the scale at ±cents. */
function marker(cents: number): string {
  const [tip, base] = [polar(R + MAJOR + 6, cents), polar(R + MAJOR + 30, cents)];
  const [dx, dy] = [11 * Math.cos(rad(cents)), 11 * Math.sin(rad(cents))];
  return `<polygon points="${pt(tip)} ${pt([base[0] - dx, base[1] - dy])} ${pt([base[0] + dx, base[1] + dy])}"/>`;
}

function scaleLabel(text: string, cents: number): string {
  const [x, y] = polar(R + MAJOR + 34, cents);
  const at = `${x.toFixed(1)} ${y.toFixed(1)}`;
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" transform="rotate(${cents * DEG_PER_CENT} ${at})" text-anchor="middle">${text}</text>`;
}

/** Rough text width in em, to shrink long labels to fit the face. */
const emWidth = (s: string) =>
  [...s].reduce((w, ch) => w + (ch.charCodeAt(0) > 0x2e80 ? 1 : ch === ' ' ? 0.3 : 0.62), 0);

function setText(el: SVGTextElement, text: string, maxSize: number) {
  el.textContent = text;
  el.style.fontSize = `${Math.min(maxSize, (maxSize === NAME_MAX ? 900 : 960) / Math.max(emWidth(text), 1))}px`;
}

export function createMeter(el: HTMLElement) {
  el.innerHTML = `
    <div class="meter idle">
      <svg viewBox="0 0 1170 700" role="img" aria-label="音准表">
        <defs>
          <linearGradient id="mt-bezel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#55565c"/><stop offset=".35" stop-color="#34353a"/><stop offset="1" stop-color="#232427"/>
          </linearGradient>
          <radialGradient id="mt-face" cx=".22" cy=".85" r=".95">
            <stop offset="0" stop-color="#c49a66"/><stop offset=".55" stop-color="#8a6234"/><stop offset="1" stop-color="#3b2510"/>
          </radialGradient>
          <clipPath id="mt-clip"><path d="${FACE}"/></clipPath>
          <radialGradient id="mt-vignette" cx=".5" cy=".62" r=".75">
            <stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/>
          </radialGradient>
        </defs>
        <path d="${BEZEL}" fill="url(#mt-bezel)"/>
        <path d="${BEZEL}" fill="none" stroke="#7b7c83" stroke-opacity=".6" stroke-width="3"/>
        <circle class="mt-lamp" cx="${CX}" cy="46" r="13"/>
        <path d="${FACE}" fill="url(#mt-face)"/>
        <path d="${FACE}" fill="url(#mt-vignette)" stroke="#000" stroke-opacity=".5" stroke-width="8"/>
        <text class="mt-name" x="${CX}" y="228" text-anchor="middle"></text>
        <text class="mt-sub" x="${CX}" y="295" text-anchor="middle"></text>
        <g class="mt-scale">
          <path class="base" d="M${pt(polar(R, -50))}A${R} ${R} 0 0 1 ${pt(polar(R, 50))}"/>
          <path class="minor" d="${ticks(MINOR, (c) => c % 5 !== 0)}"/>
          <path class="mid" d="${ticks(MID, (c) => c % 5 === 0 && c % 10 !== 0)}"/>
          <path class="major" d="${ticks(MAJOR, (c) => c % 10 === 0)}"/>
          ${scaleLabel('-50', -50)}${scaleLabel('0', 0)}${scaleLabel('+50', 50)}
          <text class="unit" x="1040" y="458" text-anchor="end">CENT</text>
          ${marker(-CLOSE_CENTS)}${marker(CLOSE_CENTS)}
        </g>
        <g clip-path="url(#mt-clip)">
          <line class="mt-needle" x1="${CX}" y1="${PIVOT_Y - NEEDLE_FROM}" x2="${CX}" y2="${PIVOT_Y - R - MAJOR}"/>
        </g>
        <rect class="mt-pill" y="600" width="0" height="56" rx="14"/>
        <text class="mt-cents" x="${CX}" y="642" text-anchor="middle"></text>
      </svg>
    </div>`;
  const root = el.querySelector<HTMLElement>('.meter')!;
  const name = root.querySelector<SVGTextElement>('.mt-name')!;
  const sub = root.querySelector<SVGTextElement>('.mt-sub')!;
  const needle = root.querySelector<SVGLineElement>('.mt-needle')!;
  const centsEl = root.querySelector<SVGTextElement>('.mt-cents')!;
  const pill = root.querySelector<SVGRectElement>('.mt-pill')!;
  needle.style.transformOrigin = `${CX}px ${PIVOT_Y}px`;

  /** Readout on a dark strip, drawn over the needle's tail so the text stays legible. */
  const setReadout = (text: string) => {
    centsEl.textContent = text;
    const w = text ? emWidth(text) * 40 + 56 : 0;
    pill.setAttribute('x', String(CX - w / 2));
    pill.setAttribute('width', String(w));
  };

  const swing = (cents: number) => {
    needle.style.transform = `rotate(${Math.max(-53, Math.min(53, cents)) * DEG_PER_CENT}deg)`;
  };

  return {
    show(label: string, cents: number, freq: number, extra = '') {
      const state = tuneState(cents);
      root.className = `meter ${state}`;
      setText(name, label, NAME_MAX);
      setText(sub, `${freq.toFixed(2)} Hz${extra && ` · ${extra}`}`, SUB_MAX);
      swing(cents);
      const c = `${cents > 0 ? '+' : ''}${cents.toFixed(1)} 音分`;
      setReadout(state === 'in-tune' ? `${c} · 准` : `${c} · ${cents < 0 ? '偏低，调紧' : '偏高，放松'}`);
    },
    clear(hint: string) {
      root.className = 'meter idle';
      setText(name, '--', NAME_MAX);
      setText(sub, hint, SUB_MAX);
      swing(0);
      setReadout('');
    },
  };
}
