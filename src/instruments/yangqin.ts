import { centsBetween, midiToFreq, noteToMidi } from '../core/music';
import { createMeter, tuneState } from '../ui/meter';
import type { Instrument } from './types';
import { BODY, BRIDGES, VIEW } from './yangqin-layout';

// The chart spells every black key with a sharp (♯d, ♯a).
const GROUP_PC = ['c', '♯c', 'd', '♯d', 'e', 'f', '♯f', 'g', '♯g', 'a', '♯a', 'b'];
const SCI_PC = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const SUP = ['¹', '²', '³', '⁴'];

/** Pitch-group name as printed on yangqin charts: G (大字组), c (小字组), c¹, c²… */
function groupName(midi: number): string {
  const oct = Math.floor(midi / 12) - 1;
  const pc = GROUP_PC[midi % 12];
  return oct < 3 ? pc.toUpperCase() : pc + (SUP[oct - 4] ?? '');
}
const sciName = (midi: number) => SCI_PC[midi % 12] + (Math.floor(midi / 12) - 1);
const strLabel = (n: number) => `${n}#${n <= 25 ? '缠弦' : '钢弦'}`;

interface Mark {
  spot: number;
  side: 'l' | 'r';
  midi: number;
  text: string;
}

/** Consecutive rows of a bridge sharing a string number, bracketed together on the chart. */
interface Group {
  str: number;
  dx: number;
  spots: number[];
}

const spots = BRIDGES.flatMap((b) => b.spots);
const marks: Mark[] = spots.flatMap((s, spot) =>
  (['l', 'r'] as const).flatMap((side) => {
    const raw = s[side];
    if (!raw) return [];
    const midi = noteToMidi(raw);
    return [{ spot, side, midi, text: groupName(midi) }];
  }),
);
const ALL_MIDIS = [...new Set(marks.map((m) => m.midi))];

const groups: Group[] = [];
let offset = 0;
for (const b of BRIDGES) {
  let cur: Group | undefined;
  b.spots.forEach((s, i) => {
    if (b.braceDx === undefined) return;
    if (cur?.str === s.str) cur.spots.push(offset + i);
    else groups.push((cur = { str: s.str, dx: b.braceDx, spots: [offset + i] }));
  });
  offset += b.spots.length;
}
const groupOf = marks.map((m) => groups.findIndex((g) => g.spots.includes(m.spot)));

const LABEL_GAP = 24;
const CHAR_W = 24;
const markSvg = (m: Mark) => {
  const s = spots[m.spot];
  const left = m.side === 'l';
  const w = 16 + CHAR_W * m.text.length;
  return `<g class="mark">
    <rect class="hit" x="${left ? s.x - 12 - w : s.x + 12}" y="${s.y - 34}" width="${w}" height="68" rx="10"/>
    <text x="${left ? s.x - LABEL_GAP : s.x + LABEL_GAP}" y="${s.y}" dy=".35em" text-anchor="${left ? 'end' : 'start'}">${m.text}</text>
  </g>`;
};

const groupSvg = (g: Group) => {
  const first = spots[g.spots[0]];
  const last = spots[g.spots[g.spots.length - 1]];
  const x = (first.x + last.x) / 2 + g.dx;
  return `<g class="str ${g.str <= 25 ? 'wound' : 'steel'}">
    <path d="M${x - 7} ${first.y - 27}H${x}V${last.y + 27}H${x - 7}"/>
    <text x="${x + 12}" y="${(first.y + last.y) / 2}" dy=".35em">${g.str}#</text>
  </g>`;
};

const barSvg = BRIDGES.flatMap(({ bar }) =>
  bar ? [`<line class="bar" x1="${bar[0]}" y1="${bar[1]}" x2="${bar[2]}" y2="${bar[3]}"/>`] : [],
).join('');
const linkSvg = spots
  .filter((s) => s.dashFrom !== undefined)
  .map((s) => `<line class="link" x1="${s.dashFrom}" y1="${s.y}" x2="${s.x - 12}" y2="${s.y}"/>`)
  .join('');

/** Kept across view re-creation so switching instruments does not reset it. */
let showStrings = true;

export const yangqin: Instrument = {
  id: 'yangqin',
  name: '扬琴',
  detector: { minFreq: 75, maxFreq: 2300, bufferSize: 4096 },

  createView(root, ctx) {
    root.innerHTML = `
      <div class="toolbar"><span class="desc">402 型 C 调基本音位 · F–♯a³ · 点击音名锁定目标音</span>
        <label class="check"><input type="checkbox" class="show-str"${showStrings ? ' checked' : ''}> 显示弦位</label>
      </div>
      <div class="meter-slot"></div>
      <div class="yq-scroll">
        <svg viewBox="${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}" role="img" aria-label="402 型扬琴音位与弦位图">
          <defs>
            <linearGradient id="yq-wood" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#3b2616"/><stop offset=".5" style="stop-color:var(--wood)"/><stop offset="1" stop-color="#3b2616"/>
            </linearGradient>
          </defs>
          <polygon class="body" points="${BODY}"/>
          ${barSvg}
          ${linkSvg}
          ${groups.map(groupSvg).join('')}
          ${spots.map((s) => `<circle class="dot" cx="${s.x}" cy="${s.y}" r="11"/>`).join('')}
          ${marks.map(markSvg).join('')}
        </svg>
      </div>
      <p class="hint">击弦后，该音在琴上的位置亮起（同音异位的两处同时亮），右侧括号里的数字是这些音位用的琴弦号：15#–25# 缠弦（铜色），26#–30# 钢弦（银色）。偏差较大时点击要调的音名锁定目标，再次点击解除；同度的几根弦听拍音消失为准。</p>`;
    const scroller = root.querySelector<HTMLElement>('.yq-scroll')!;
    const strToggle = root.querySelector<HTMLInputElement>('.show-str')!;
    scroller.classList.toggle('hide-str', !showStrings);
    const svg = scroller.querySelector('svg')!;
    const dots = [...svg.querySelectorAll('.dot')];
    const markEls = [...svg.querySelectorAll('.mark')];
    const groupEls = [...svg.querySelectorAll('.str')];
    const meter = createMeter(root.querySelector('.meter-slot')!);

    let locked: Mark | null = null;
    let last: number | null = null;
    let litEls: Element[] = [];
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
        for (const el of litEls) el.classList.remove(...STATES);
        litEls = [];
        if (freq === null) {
          revealed = undefined;
          meter.clear(locked ? `已锁定 ${locked.text}` : '请击弦');
          return;
        }
        const a4 = ctx.a4();
        let best = 0;
        let bestCents = Infinity;
        for (const midi of locked ? [locked.midi] : ALL_MIDIS) {
          const c = centsBetween(freq, midiToFreq(midi, a4));
          if (Math.abs(c) < Math.abs(bestCents)) [best, bestCents] = [midi, c];
        }
        const lit = locked ? [locked] : marks.filter((m) => m.midi === best);
        const strings = [...new Set(lit.map((m) => strLabel(spots[m.spot].str)))].join(' / ');
        meter.show(`${groupName(best)} · ${sciName(best)}`, bestCents, freq, showStrings ? strings : '');
        const state = tuneState(bestCents);
        for (const m of lit) {
          const i = marks.indexOf(m);
          litEls.push(markEls[i], dots[m.spot], ...(groupOf[i] >= 0 ? [groupEls[groupOf[i]]] : []));
        }
        for (const el of litEls) el.classList.add('active', state);
        if (lit[0] !== revealed) {
          revealed = lit[0];
          reveal(spots[lit[0].spot].x);
        }
      },
    };

    strToggle.onchange = () => {
      showStrings = strToggle.checked;
      scroller.classList.toggle('hide-str', !showStrings);
      view.update(last);
    };

    svg.onclick = (e) => {
      const g = (e.target as Element).closest('.mark');
      if (!g) return;
      const m = marks[markEls.indexOf(g)];
      locked = locked === m ? null : m;
      markEls.forEach((el, i) => el.classList.toggle('locked', marks[i] === locked));
      view.update(last);
    };

    meter.clear('请击弦');
    return view;
  },
};
