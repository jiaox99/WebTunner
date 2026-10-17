export type TuneState = 'in-tune' | 'close' | 'off';

export function tuneState(cents: number): TuneState {
  const a = Math.abs(cents);
  return a <= 3 ? 'in-tune' : a <= 10 ? 'close' : 'off';
}

export function createMeter(el: HTMLElement) {
  el.innerHTML = `
    <div class="meter">
      <div class="meter-note">--</div>
      <div class="meter-sub"></div>
      <div class="meter-scale">
        <span class="tick l">-50</span><span class="tick c">0</span><span class="tick r">+50</span>
        <div class="meter-needle"></div>
      </div>
      <div class="meter-cents"></div>
    </div>`;
  const root = el.querySelector<HTMLElement>('.meter')!;
  const note = root.querySelector<HTMLElement>('.meter-note')!;
  const sub = root.querySelector<HTMLElement>('.meter-sub')!;
  const needle = root.querySelector<HTMLElement>('.meter-needle')!;
  const centsEl = root.querySelector<HTMLElement>('.meter-cents')!;

  return {
    show(label: string, cents: number, freq: number, extra = '') {
      const state = tuneState(cents);
      root.className = `meter ${state}`;
      note.textContent = label;
      sub.textContent = `${freq.toFixed(2)} Hz${extra && ` · ${extra}`}`;
      needle.style.left = `${50 + Math.max(-50, Math.min(50, cents))}%`;
      const c = `${cents > 0 ? '+' : ''}${cents.toFixed(1)} 音分`;
      centsEl.textContent =
        state === 'in-tune' ? `${c} · 准` : `${c} · ${cents < 0 ? '偏低，调紧' : '偏高，放松'}`;
    },
    clear(hint: string) {
      root.className = 'meter idle';
      note.textContent = '--';
      sub.textContent = hint;
      needle.style.left = '50%';
      centsEl.textContent = '';
    },
  };
}
