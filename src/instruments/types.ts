import type { Timbre } from '../core/synth';
import type { DetectorConfig } from '../core/tuner';

export interface ViewContext {
  a4(): number;
  /** When on, clicking a note plays it instead of locking the target. */
  playMode(): boolean;
  play(midi: number): void;
}

export interface InstrumentView {
  /** Smoothed frequency in Hz, or null when nothing is heard. */
  update(freq: number | null): void;
}

export interface Instrument {
  id: string;
  name: string;
  detector: DetectorConfig;
  timbre: Timbre;
  createView(root: HTMLElement, ctx: ViewContext): InstrumentView;
}
