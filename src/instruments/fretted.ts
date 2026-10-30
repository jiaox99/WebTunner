import { centsBetween, midiToFreq, midiToName, noteToMidi } from '../core/music';
import type { DetectorConfig } from '../core/tuner';
import { createMeter, tuneState } from '../ui/meter';
import type { Instrument } from './types';

interface Tuning {
  name: string;
  desc: string;
  /** 从最粗的弦到最细的弦；尤克里里的 re-entrant 定弦不按音高排序，所以按弦序列出 */
  notes: string[];
}

/** 吉他、尤克里里共用：列出每根弦，自动识别最近的弦，可点击锁定。 */
function createFretted(opts: {
  id: string;
  name: string;
  detector: DetectorConfig;
  tunings: Tuning[];
}): Instrument {
  return {
    id: opts.id,
    name: opts.name,
    detector: opts.detector,

    createView(root, ctx) {
      root.innerHTML = `
        <div class="toolbar">
          <label>定弦 <select class="tuning">${opts.tunings.map((t, i) => `<option value="${i}">${t.name}</option>`).join('')}</select></label>
          <span class="desc"></span>
        </div>
        <div class="meter-slot"></div>
        <div class="qin"><div class="strings"></div></div>
        <p class="hint">自动识别最近的弦；点击某根弦可锁定（调音偏差大时使用），再次点击解除。</p>`;
      const select = root.querySelector<HTMLSelectElement>('.tuning')!;
      const desc = root.querySelector<HTMLElement>('.desc')!;
      const stringsEl = root.querySelector<HTMLElement>('.strings')!;
      const meter = createMeter(root.querySelector('.meter-slot')!);

      let tuning = opts.tunings[0];
      let locked: number | null = null;
      let rows: HTMLElement[] = [];
      /** 弦号从最细的弦算起，与琴谱习惯一致 */
      const label = (i: number) => `${tuning.notes.length - i}弦`;

      function render() {
        desc.textContent = tuning.desc;
        stringsEl.innerHTML = tuning.notes
          .map(
            (n, i) => `
            <div class="qin-string" data-i="${i}">
              <span class="label">${label(i)}</span>
              <div class="line" style="height:${3.5 - (i * 2) / tuning.notes.length}px"></div>
              <span class="note">${midiToName(noteToMidi(n))}</span>
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
        tuning = opts.tunings[Number(select.value)];
        locked = null;
        render();
      };
      render();

      return {
        update(freq) {
          rows.forEach((r) => r.classList.remove('active', 'in-tune', 'close', 'off'));
          if (freq === null) {
            meter.clear(locked === null ? '请拨弦' : `已锁定${label(locked)}`);
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
          meter.show(`${label(i)} ${midiToName(noteToMidi(tuning.notes[i]))}`, cents, freq);
          rows[i].classList.add('active', tuneState(cents));
        },
      };
    },
  };
}

export const guitar = createFretted({
  id: 'guitar',
  name: '吉他',
  // 最低 D2（降半音/Drop D 约 73 Hz），最高 E4 及调偏余量
  detector: { minFreq: 60, maxFreq: 700, bufferSize: 4096 },
  tunings: [
    { name: '标准', desc: 'E A D G B E', notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
    { name: 'Drop D', desc: '六弦降到 D', notes: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
    { name: '降半音', desc: '全部降半音', notes: ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'] },
    { name: 'DADGAD', desc: '挂留 D 调弦', notes: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'] },
    { name: 'Open G', desc: 'D G D G B D', notes: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'] },
  ],
});

export const ukulele = createFretted({
  id: 'ukulele',
  name: '尤克里里',
  // 最低 D3（巴里通）约 147 Hz，最高 A4 及调偏余量
  detector: { minFreq: 100, maxFreq: 900, bufferSize: 4096 },
  tunings: [
    { name: '标准', desc: 'G C E A（四弦高音 G）', notes: ['G4', 'C4', 'E4', 'A4'] },
    { name: 'Low G', desc: '四弦低八度 G', notes: ['G3', 'C4', 'E4', 'A4'] },
    { name: '巴里通', desc: 'D G B E', notes: ['D3', 'G3', 'B3', 'E4'] },
  ],
});
