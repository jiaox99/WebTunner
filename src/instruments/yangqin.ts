import { freqToMidi, midiToName, noteToMidi } from '../core/music';
import { createMeter, tuneState } from '../ui/meter';
import type { Instrument } from './types';

// 402 型扬琴音域 G–a³，全半音
const LOW = noteToMidi('G2');
const HIGH = noteToMidi('A6');

export const yangqin: Instrument = {
  id: 'yangqin',
  name: '扬琴',
  detector: { minFreq: 90, maxFreq: 2000, bufferSize: 4096 },

  createView(root, ctx) {
    const octaves: number[] = [];
    for (let o = Math.floor(LOW / 12) - 1; o <= Math.floor(HIGH / 12) - 1; o++) octaves.push(o);
    root.innerHTML = `
      <div class="toolbar"><span class="desc">402 型 · G2–A6 · 半音</span></div>
      <div class="meter-slot"></div>
      <div class="yq-grid">
        ${octaves
          .map((o) => {
            const cells = Array.from({ length: 12 }, (_, pc) => {
              const m = (o + 1) * 12 + pc;
              return m < LOW || m > HIGH
                ? '<span class="cell empty"></span>'
                : `<span class="cell${/[♯♭]/.test(midiToName(m)) ? ' accidental' : ''}" data-m="${m}">${midiToName(m)}</span>`;
            }).join('');
            return `<div class="yq-row">${cells}</div>`;
          })
          .join('')}
      </div>
      <p class="hint">逐个击弦，同一音的每根弦分别调准；多根弦同度时听拍音消失为准。</p>`;
    const meter = createMeter(root.querySelector('.meter-slot')!);
    const cells = new Map<number, HTMLElement>();
    root.querySelectorAll<HTMLElement>('.cell[data-m]').forEach((c) => cells.set(Number(c.dataset.m), c));
    let active: HTMLElement | undefined;
    meter.clear('请击弦');

    return {
      update(freq) {
        active?.classList.remove('active', 'in-tune', 'close', 'off');
        active = undefined;
        if (freq === null) {
          meter.clear('请击弦');
          return;
        }
        const midi = freqToMidi(freq, ctx.a4());
        const m = Math.round(midi);
        const cents = (midi - m) * 100;
        meter.show(midiToName(m), cents, freq);
        active = cells.get(m);
        active?.classList.add('active', tuneState(cents));
      },
    };
  },
};
