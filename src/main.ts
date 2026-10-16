import './style.css';
import { Tuner } from './core/tuner';
import { guqin } from './instruments/guqin';
import type { Instrument, InstrumentView } from './instruments/types';
import { yangqin } from './instruments/yangqin';

const INSTRUMENTS: Instrument[] = [guqin, yangqin];

const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `
  <header>
    <select class="instrument">${INSTRUMENTS.map((x) => `<option value="${x.id}">${x.name}</option>`).join('')}</select>
    <label>A4 <input class="a4" type="number" min="415" max="466" step="1" value="440"> Hz</label>
    <button class="toggle">开始</button>
  </header>
  <p class="status"></p>
  <main></main>`;

const instSelect = app.querySelector<HTMLSelectElement>('.instrument')!;
const a4Input = app.querySelector<HTMLInputElement>('.a4')!;
const toggle = app.querySelector<HTMLButtonElement>('.toggle')!;
const status = app.querySelector<HTMLElement>('.status')!;
const main = app.querySelector<HTMLElement>('main')!;

let a4 = 440;
let view: InstrumentView;
const tuner = new Tuner(INSTRUMENTS[0].detector, (f) => view.update(f));

function mount(inst: Instrument) {
  view = inst.createView(main, { a4: () => a4 });
  tuner.setConfig(inst.detector);
}

instSelect.onchange = () => mount(INSTRUMENTS.find((x) => x.id === instSelect.value)!);
a4Input.onchange = () => {
  const v = Number(a4Input.value);
  if (v >= 415 && v <= 466) a4 = v;
  else a4Input.value = String(a4);
};
toggle.onclick = async () => {
  if (tuner.running) {
    tuner.stop();
    toggle.textContent = '开始';
    return;
  }
  try {
    status.textContent = '';
    await tuner.start();
    toggle.textContent = '停止';
  } catch (e) {
    status.textContent = `无法使用麦克风：${(e as Error).message}`;
  }
};

mount(INSTRUMENTS[0]);
