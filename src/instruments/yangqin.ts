import { centsBetween, midiToFreq, midiToName, noteToMidi } from '../core/music';
import { createMeter, tuneState } from '../ui/meter';
import type { Instrument } from './types';
import { BODY, BRIDGES, VIEW } from './yangqin-layout';

const GROUP_PC = ['c', '♯c', 'd', '♭e', 'e', 'f', '♯f', 'g', '♯g', 'a', '♭b', 'b'];
const SUP = ['¹', '²', '³', '⁴'];

/** Pitch-group name as printed on yangqin charts: G (大字组), c (小字组), c¹, c²… */
function groupName(midi: number): string {
  const oct = Math.floor(midi / 12) - 1;
  const pc = GROUP_PC[midi % 12];
  return oct < 3 ? pc.toUpperCase() : pc + (SUP[oct - 4] ?? '');
}

interface Mark {
  spot: number;
  side: 'l' | 'r';
  midis: number[];
  text: string;
}

const spots = BRIDGES.flatMap((b) => b.spots);
const marks: Mark[] = spots.flatMap((s, spot) =>
  (['l', 'r'] as const).flatMap((side) => {
    const raw = s[side];
    if (!raw) return [];
    const midis = raw.replace(/[()]/g, '').split('/').map(noteToMidi);
    const text = midis.map(groupName).join('/');
    return [{ spot, side, midis, text: raw.startsWith('(') ? `(${text})` : text }];
  }),
);
const ALL_MIDIS = [...new Set(marks.flatMap((m) => m.midis))];

const LABEL_GAP = 24;
const markSvg = (m: Mark) => {
  const s = spots[m.spot];
  const left = m.side === 'l';
  const x = left ? s.x - LABEL_GAP : s.x + LABEL_GAP;
  const hitX = left ? s.x - 130 : s.x + 12;
  return `<g class="mark">
    <rect class="hit" x="${hitX}" y="${s.y - 34}" width="118" height="68" rx="10"/>
    <text x="${x}" y="${s.y}" dy=".35em" text-anchor="${left ? 'end' : 'start'}">${m.text}</text>
  </g>`;
};

export const yangqin: Instrument = {
  id: 'yangqin',
  name: '扬琴',
  detector: { minFreq: 75, maxFreq: 2300, bufferSize: 4096 },

  createView(root, ctx) {
    root.innerHTML = `
      <div class="toolbar"><span class="desc">402 型 · ♯F–b³ · 点击音名锁定目标音</span></div>
      <div class="meter-slot"></div>
      <div class="yq-scroll">
        <svg viewBox="${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}" role="img" aria-label="402 型扬琴音位图">
          <defs>
            <linearGradient id="yq-wood" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#3b2616"/><stop offset=".5" style="stop-color:var(--wood)"/><stop offset="1" stop-color="#3b2616"/>
            </linearGradient>
          </defs>
          <polygon class="body" points="${BODY}"/>
          ${BRIDGES.map((b) => `<line class="bar" x1="${b.bar[0]}" y1="${b.bar[1]}" x2="${b.bar[2]}" y2="${b.bar[3]}"/>`).join('')}
          ${spots.map((s) => `<circle class="dot" cx="${s.x}" cy="${s.y}" r="11"/>`).join('')}
          ${marks.map(markSvg).join('')}
        </svg>
      </div>
      <p class="hint">击弦后，该音在琴上的位置亮起（同音异位的两处同时亮）。偏差较大时点击要调的音名锁定目标，再次点击解除；同度的几根弦听拍音消失为准。</p>`;
    const scroller = root.querySelector<HTMLElement>('.yq-scroll')!;
    const svg = scroller.querySelector('svg')!;
    const dots = [...svg.querySelectorAll('.dot')];
    const els = [...svg.querySelectorAll('.mark')];
    const meter = createMeter(root.querySelector('.meter-slot')!);

    let locked: Mark | null = null;
    let last: number | null = null;
    let lit: Mark[] = [];
    let revealed: Mark | undefined;

    const STATES = ['active', 'in-tune', 'close', 'off'];
    function reveal(x: number) {
      const px = ((x - VIEW.x) * svg.getBoundingClientRect().width) / VIEW.w;
      const { scrollLeft, clientWidth } = scroller;
      if (px < scrollLeft + 80 || px > scrollLeft + clientWidth - 80) {
        scroller.scrollTo({ left: px - clientWidth / 2, behavior: 'smooth' });
      }
    }

    const view = {
      update(freq: number | null) {
        last = freq;
        for (const m of lit) {
          els[marks.indexOf(m)].classList.remove(...STATES);
          dots[m.spot].classList.remove(...STATES);
        }
        lit = [];
        if (freq === null) {
          revealed = undefined;
          meter.clear(locked ? `已锁定 ${locked.text}` : '请击弦');
          return;
        }
        const a4 = ctx.a4();
        let best = 0;
        let bestCents = Infinity;
        for (const midi of locked ? locked.midis : ALL_MIDIS) {
          const c = centsBetween(freq, midiToFreq(midi, a4));
          if (Math.abs(c) < Math.abs(bestCents)) [best, bestCents] = [midi, c];
        }
        meter.show(`${groupName(best)} · ${midiToName(best)}`, bestCents, freq);
        lit = locked ? [locked] : marks.filter((m) => m.midis.includes(best));
        for (const m of lit) {
          els[marks.indexOf(m)].classList.add('active', tuneState(bestCents));
          dots[m.spot].classList.add('active', tuneState(bestCents));
        }
        if (lit[0] !== revealed) {
          revealed = lit[0];
          reveal(spots[lit[0].spot].x);
        }
      },
    };

    svg.onclick = (e) => {
      const g = (e.target as Element).closest('.mark');
      if (!g) return;
      const m = marks[els.indexOf(g)];
      locked = locked === m ? null : m;
      els.forEach((el, i) => el.classList.toggle('locked', marks[i] === locked));
      view.update(last);
    };

    meter.clear('请击弦');
    return view;
  },
};
