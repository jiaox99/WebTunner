import { centsBetween, midiToFreq, midiToName, noteToMidi } from '../core/music';
import { createMeter, tuneState } from '../ui/meter';
import type { Instrument } from './types';

interface GuqinTuning {
  name: string;
  desc: string;
  /** 一弦 → 七弦 */
  notes: string[];
  jianpu: string[];
}

const TUNINGS: GuqinTuning[] = [
  { name: '正调', desc: '1=F', notes: ['C2', 'D2', 'F2', 'G2', 'A2', 'C3', 'D3'], jianpu: ['5', '6', '1', '2', '3', '5', '6'] },
  { name: '慢角调', desc: '慢三弦 · 1=C', notes: ['C2', 'D2', 'E2', 'G2', 'A2', 'C3', 'D3'], jianpu: ['1', '2', '3', '5', '6', '1', '2'] },
  { name: '蕤宾调', desc: '紧五弦 · 1=♭B', notes: ['C2', 'D2', 'F2', 'G2', 'Bb2', 'C3', 'D3'], jianpu: ['2', '3', '5', '6', '1', '2', '3'] },
  { name: '慢宫调', desc: '慢一、三、六弦 · 1=G', notes: ['B1', 'D2', 'E2', 'G2', 'A2', 'B2', 'D3'], jianpu: ['3', '5', '6', '1', '2', '3', '5'] },
];

const STRING_NAMES = ['一', '二', '三', '四', '五', '六', '七'];
/** 十三徽 positions as fractions of the sounding length, measured from 岳山. */
const HUI = [1 / 8, 1 / 6, 1 / 5, 1 / 4, 1 / 3, 2 / 5, 1 / 2, 3 / 5, 2 / 3, 3 / 4, 4 / 5, 5 / 6, 7 / 8];

export const guqin: Instrument = {
  id: 'guqin',
  name: '古琴',
  detector: { minFreq: 50, maxFreq: 700, bufferSize: 4096 },

  createView(root, ctx) {
    root.innerHTML = `
      <div class="toolbar">
        <label>定弦 <select class="tuning">${TUNINGS.map((t, i) => `<option value="${i}">${t.name}</option>`).join('')}</select></label>
        <span class="desc"></span>
      </div>
      <div class="meter-slot"></div>
      <div class="qin">
        <div class="hui">${HUI.map((p, i) => `<i class="${i === 6 ? 'big' : ''}" style="right:${p * 100}%"></i>`).join('')}</div>
        <div class="strings"></div>
      </div>
      <p class="hint">自动识别最近的弦；点击某根弦可锁定（调音偏差大时使用），再次点击解除。</p>`;
    const select = root.querySelector<HTMLSelectElement>('.tuning')!;
    const desc = root.querySelector<HTMLElement>('.desc')!;
    const stringsEl = root.querySelector<HTMLElement>('.strings')!;
    const meter = createMeter(root.querySelector('.meter-slot')!);

    let tuning = TUNINGS[0];
    let locked: number | null = null;
    let rows: HTMLElement[] = [];

    function render() {
      desc.textContent = tuning.desc;
      stringsEl.innerHTML = tuning.notes
        .map(
          (n, i) => `
          <div class="qin-string" data-i="${i}">
            <span class="label">${STRING_NAMES[i]}弦</span>
            <div class="line" style="height:${3.5 - i * 0.35}px"></div>
            <span class="note">${midiToName(noteToMidi(n))} <em>${tuning.jianpu[i]}</em></span>
          </div>`,
        )
        .join('');
      rows = [...stringsEl.querySelectorAll<HTMLElement>('.qin-string')];
      rows.forEach((r, i) => {
        r.classList.toggle('locked', locked === i);
        r.onclick = () => {
          locked = locked === i ? null : i;
          rows.forEach((x, j) => x.classList.toggle('locked', locked === j));
        };
      });
      meter.clear('请拨弦');
    }

    select.onchange = () => {
      tuning = TUNINGS[Number(select.value)];
      render();
    };
    render();

    return {
      update(freq) {
        rows.forEach((r) => r.classList.remove('active', 'in-tune', 'close', 'off'));
        if (freq === null) {
          meter.clear(locked === null ? '请拨弦' : `已锁定${STRING_NAMES[locked]}弦`);
          return;
        }
        const targets = tuning.notes.map((n) => midiToFreq(noteToMidi(n), ctx.a4()));
        const i =
          locked ??
          targets.reduce(
            (best, t, j) =>
              Math.abs(Math.log2(freq / t)) < Math.abs(Math.log2(freq / targets[best])) ? j : best,
            0,
          );
        const cents = centsBetween(freq, targets[i]);
        meter.show(`${STRING_NAMES[i]}弦 ${midiToName(noteToMidi(tuning.notes[i]))}`, cents, freq);
        rows[i].classList.add('active', tuneState(cents));
      },
    };
  },
};
