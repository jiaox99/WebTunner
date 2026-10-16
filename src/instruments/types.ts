import type { DetectorConfig } from '../core/tuner';

export interface ViewContext {
  a4(): number;
}

export interface InstrumentView {
  /** Smoothed frequency in Hz, or null when nothing is heard. */
  update(freq: number | null): void;
}

export interface Instrument {
  id: string;
  name: string;
  detector: DetectorConfig;
  createView(root: HTMLElement, ctx: ViewContext): InstrumentView;
}
