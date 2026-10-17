import { describe, expect, it } from 'vitest';
import { centsBetween, freqToMidi, midiToFreq, midiToName, noteToMidi } from './music';
import { detectPitch } from './pitch';

const SR = 48000;

function tone(freq: number, harmonics: number[], n = 4096): Float32Array {
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0;
    harmonics.forEach((amp, k) => (v += amp * Math.sin((2 * Math.PI * freq * (k + 1) * i) / SR)));
    buf[i] = 0.3 * v;
  }
  return buf;
}

describe('music', () => {
  it('converts notes', () => {
    expect(noteToMidi('A4')).toBe(69);
    expect(noteToMidi('C2')).toBe(36);
    expect(noteToMidi('Bb2')).toBe(46);
    expect(noteToMidi('B♭2')).toBe(46);
    expect(noteToMidi('F#3')).toBe(54);
    expect(midiToName(46)).toBe('B♭2');
    expect(midiToFreq(69)).toBe(440);
    expect(midiToFreq(69, 442)).toBe(442);
    expect(freqToMidi(880)).toBeCloseTo(81);
    expect(centsBetween(445, 440)).toBeCloseTo(19.56, 1);
  });
});

describe('detectPitch', () => {
  const cases: [string, number, number[]][] = [
    ['guqin B1 pure', midiToFreq(noteToMidi('B1')), [1]],
    ['guqin C2 rich', midiToFreq(noteToMidi('C2')), [1, 0.8, 0.5, 0.3, 0.2]],
    ['guqin C2 weak fundamental', midiToFreq(noteToMidi('C2')), [0.3, 1, 0.6, 0.4]],
    ['yangqin G2', midiToFreq(noteToMidi('G2')), [1, 0.5, 0.3]],
    ['yangqin A6', midiToFreq(noteToMidi('A6')), [1, 0.3]],
    ['slightly sharp A4', 443, [1, 0.5]],
  ];
  for (const [name, f, h] of cases) {
    it(`${name} within 0.5 cent`, () => {
      const r = detectPitch(tone(f, h), SR, 50, 2000);
      expect(r).not.toBeNull();
      expect(Math.abs(centsBetween(r!.freq, f))).toBeLessThan(0.5);
    });
  }

  // Extremes of the yangqin (F2 – B♭6) with its detector range.
  for (const [name, f] of [['yangqin F2', midiToFreq(noteToMidi('F2'))], ['yangqin Bb6', midiToFreq(noteToMidi('Bb6'))]] as const) {
    it(`${name} within 0.5 cent`, () => {
      const r = detectPitch(tone(f, [1, 0.4]), SR, 75, 2300);
      expect(r).not.toBeNull();
      expect(Math.abs(centsBetween(r!.freq, f))).toBeLessThan(0.5);
    });
  }

  it('returns null on silence and noise', () => {
    expect(detectPitch(new Float32Array(4096), SR, 50, 2000)).toBeNull();
    const noise = new Float32Array(4096).map(() => Math.random() - 0.5);
    expect(detectPitch(noise, SR, 50, 2000)).toBeNull();
  });
});
