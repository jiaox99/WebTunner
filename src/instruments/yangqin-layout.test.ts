import { describe, expect, it } from 'vitest';
import { noteToMidi } from '../core/music';
import { BRIDGES } from './yangqin-layout';

const labels = BRIDGES.flatMap((b) => b.spots.flatMap((s) => [s.l, s.r].filter((x): x is string => !!x)));
const midisOf = (raw: string) => raw.replace(/[()]/g, '').split('/').map(noteToMidi);

describe('yangqin layout', () => {
  it('has every spot and label of the chart', () => {
    expect(BRIDGES.map((b) => b.spots.length)).toEqual([3, 13, 2, 11, 10, 10, 1]);
    expect(labels).toHaveLength(3 + 26 + 2 + 11 + 10 + 10 + 2);
  });

  // The chart boxes exactly these notes as 同音异位: they sit at two places on the instrument.
  it('repeats exactly the notes the chart marks as 同音异位', () => {
    const count = new Map<number, number>();
    for (const raw of labels) for (const m of midisOf(raw)) count.set(m, (count.get(m) ?? 0) + 1);
    const repeated = [...count].filter(([, n]) => n > 1).map(([m]) => m).sort((a, b) => a - b);
    const boxed = ['G#3', 'Bb3', 'C4', 'C#4', 'Eb4', 'F4', 'G4', 'G#4', 'Bb4', 'C5', 'D5', 'E5'].map(noteToMidi);
    expect(repeated).toEqual(boxed);
    for (const [, n] of count) expect(n).toBeLessThanOrEqual(2);
  });

  it('covers the range F#2 – B6', () => {
    const all = labels.flatMap(midisOf);
    expect(Math.min(...all)).toBe(noteToMidi('E2'));
    expect(Math.max(...all)).toBe(noteToMidi('B6'));
  });
});
