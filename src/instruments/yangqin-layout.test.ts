import { describe, expect, it } from 'vitest';
import { noteToMidi } from '../core/music';
import { BRIDGES } from './yangqin-layout';

const labels = BRIDGES.flatMap((b) => b.spots.flatMap((s) => [s.l, s.r].filter((x): x is string => !!x)));

describe('yangqin layout', () => {
  it('has every spot and label of the chart', () => {
    expect(BRIDGES.map((b) => b.spots.length)).toEqual([3, 13, 2, 11, 10, 11]);
    expect(labels).toHaveLength(3 + 26 + 2 + 11 + 10 + 11);
  });

  // The same 12 notes sit at two places on the instrument (the other chart boxes them as 同音异位).
  it('repeats exactly the notes that sit at two places', () => {
    const count = new Map<number, number>();
    for (const raw of labels) count.set(noteToMidi(raw), (count.get(noteToMidi(raw)) ?? 0) + 1);
    const repeated = [...count].filter(([, n]) => n > 1).map(([m]) => m).sort((a, b) => a - b);
    const twice = ['G#3', 'A#3', 'C4', 'C#4', 'D#4', 'F4', 'G4', 'G#4', 'A#4', 'C5', 'D5', 'E5'].map(noteToMidi);
    expect(repeated).toEqual(twice);
    for (const [, n] of count) expect(n).toBeLessThanOrEqual(2);
  });

  it('covers F2 – B♭6', () => {
    const all = labels.map(noteToMidi);
    expect(Math.min(...all)).toBe(noteToMidi('F2'));
    expect(Math.max(...all)).toBe(noteToMidi('A#6'));
  });

  it('groups rows under the string numbers the chart brackets', () => {
    const runs = (strs: number[]) =>
      strs.reduce<number[][]>((acc, n) => (acc.at(-1)?.[0] === n ? acc.at(-1)!.push(n) : acc.push([n]), acc), []);
    const [left, main, , b2, b3, bass] = BRIDGES.map((b) => runs(b.spots.map((s) => s.str)));
    expect(left.map((r) => [r[0], r.length])).toEqual([[30, 3]]);
    expect(main.map((r) => [r[0], r.length])).toEqual([[30, 4], [29, 2], [28, 3], [27, 2], [26, 2]]);
    expect(b2.map((r) => [r[0], r.length])).toEqual([[25, 2], [24, 3], [23, 2], [22, 2], [21, 2]]);
    expect(b3.map((r) => [r[0], r.length])).toEqual([[23, 2], [22, 1], [21, 3], [20, 2], [19, 2]]);
    expect(bass.map((r) => [r[0], r.length])).toEqual([[21, 2], [20, 2], [19, 2], [18, 2], [17, 1], [16, 1], [15, 1]]);
  });

  it('puts the dashed ♯a³ / ♯g³ on the strings of the rows they hang off', () => {
    const [, main, top] = BRIDGES;
    expect(top.spots.map((s) => [s.str, s.y])).toEqual(main.spots.slice(0, 2).map((s) => [s.str, s.y]));
  });
});
