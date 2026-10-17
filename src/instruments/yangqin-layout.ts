/**
 * 402 型扬琴音位, transcribed from the "402型扬琴音位图" chart
 * (https://www.huain.com/attach/uploadfile/article/images/2024/0607/20240607084138196002.jpg).
 *
 * Coordinates are that chart's pixel coordinates (dots of a bridge are spread evenly between
 * its first and last dot), so only the relative layout is meaningful.
 * Notes use scientific names: the chart's 大字组 G is G2, 小字组 c is C3, c¹ is C4, a³ is A6.
 */
export interface Spot {
  x: number;
  y: number;
  /** Note sounding left / right of the bridge: 'F#2', 'Bb6/B6' (either one), '(E2)' (optional). */
  l?: string;
  r?: string;
}

export interface Bridge {
  bar: [x1: number, y1: number, x2: number, y2: number];
  spots: Spot[];
}

export const VIEW = { x: 20, y: 60, w: 1760, h: 1190 };
export const BODY = '125,110 1450,110 1745,1200 60,1200';

function bridge(top: [number, number], bottom: [number, number], pairs: [l: string, r: string][]): Bridge {
  const n = pairs.length - 1;
  const dx = (bottom[0] - top[0]) / n;
  const dy = (bottom[1] - top[1]) / n;
  return {
    bar: [top[0] - dx / 3, top[1] - dy / 3, bottom[0] + dx / 3, bottom[1] + dy / 3],
    spots: pairs.map(([l, r], i) => ({ x: top[0] + dx * i, y: top[1] + dy * i, l: l || undefined, r: r || undefined })),
  };
}

export const BRIDGES: Bridge[] = [
  // far-left short bridge: f³ ♭e³ ♯c³
  bridge([193, 215], [167, 358], [['', 'F6'], ['', 'Eb6'], ['', 'C#6']]),
  // main left bridge, both sides are struck
  bridge([431, 174], [306, 1055], [
    ['F#6', 'A6'], ['E6', 'G6'], ['D6', 'Bb5'], ['C6', 'G#5'], ['B5', 'F5'], ['A5', 'Eb5'], ['G5', 'C#5'],
    ['F#5', 'B4'], ['E5', 'A4'], ['D5', 'G4'], ['C5', 'F4'], ['Bb4', 'Eb4'], ['G#4', 'C#4'],
  ]),
  // short bridge at the top: ♭b³ or b³, ♯g³
  bridge([813, 177], [813, 243], [['', 'Bb6/B6'], ['', 'G#6']]),
  bridge([753, 275], [753, 1020], [
    ['E5', ''], ['D5', ''], ['C5', ''], ['Bb4', ''], ['G#4', ''], ['F#4', ''], ['E4', ''], ['D4', ''], ['C4', ''],
    ['Bb3', ''], ['G#3', ''],
  ]),
  bridge([1047, 355], [1107, 1023], [
    ['G4', ''], ['F4', ''], ['Eb4', ''], ['C#4', ''], ['B3', ''], ['A3', ''], ['G3', ''], ['F3', ''], ['Eb3', ''],
    ['C#3', ''],
  ]),
  // bass bridge
  bridge([1352, 375], [1440, 1039], [
    ['C4', ''], ['Bb3', ''], ['G#3', ''], ['F#3', ''], ['E3', ''], ['D3', ''], ['C3', ''], ['B2', ''], ['A2', ''],
    ['G2', ''],
  ]),
  // lowest note; (E) is optional
  { bar: [1551, 1080, 1547, 1133], spots: [{ x: 1547, y: 1133, l: 'F#2', r: '(E2)' }] },
];
