/**
 * 402 型扬琴 C 调基本音位 and 弦位 (string numbers), transcribed from the page
 * "402型扬琴C调音位图[基本音位]及弦位图".
 *
 * Each row of a bridge is one string group, so both notes of a row share its string number.
 * 15#–25# are wound strings (缠弦), 26#–30# are steel strings (钢弦).
 * Coordinates follow the page's layout (scaled by S); only relative positions are meaningful.
 * Notes use scientific names: the chart's 大字组 G is G2, 小字组 c is C3, c¹ is C4, a³ is A6.
 */
export interface Spot {
  x: number;
  y: number;
  /** Note sounding left / right of the bridge. */
  l?: string;
  r?: string;
  /** String number (琴弦号) of this row. */
  str: number;
  /** Draw a dashed connector from this x to the spot (the chart's dashed ♯a³ / ♯g³). */
  dashFrom?: number;
}

export interface Bridge {
  bar?: [x1: number, y1: number, x2: number, y2: number];
  /** Distance from the bridge to the string-number bracket; none when the chart draws no bracket. */
  braceDx?: number;
  spots: Spot[];
}

export const VIEW = { x: -130, y: 240, w: 1190, h: 1140 };
export const BODY = '-80,264 904,264 1040,1360 -120,1360';

/** Page pixels -> view units, keeps ~74 units between rows. */
const S = 0.8;

function bridge(
  top: [number, number],
  bottom: [number, number],
  braceDx: number,
  rows: [l: string, r: string, str: number][],
): Bridge {
  const n = rows.length - 1;
  const x0 = top[0] * S;
  const y0 = top[1] * S;
  const dx = ((bottom[0] - top[0]) * S) / n;
  const dy = ((bottom[1] - top[1]) * S) / n;
  return {
    bar: [x0 - dx / 3, y0 - dy / 3, x0 + dx * (n + 1 / 3), y0 + dy * (n + 1 / 3)],
    braceDx,
    spots: rows.map(([l, r, str], i) => ({ x: x0 + dx * i, y: y0 + dy * i, l: l || undefined, r: r || undefined, str })),
  };
}

// moved left of its page position so its string number clears the main bridge's labels
const left = bridge([-30, 458], [-30, 636], 104, [
  ['', 'F6', 30], ['', 'D#6', 30], ['', 'C#6', 30],
]);

const main = bridge([284, 428], [266, 1539], 104, [
  ['F#6', 'A6', 30], ['E6', 'G6', 30], ['D6', 'A#5', 30], ['C6', 'G#5', 30],
  ['B5', 'F5', 29], ['A5', 'D#5', 29],
  ['G5', 'C#5', 28], ['F#5', 'B4', 28], ['E5', 'A4', 28],
  ['D5', 'G4', 27], ['C5', 'F4', 27],
  ['A#4', 'D#4', 26], ['G#4', 'C#4', 26],
]);

// ♯a³ and ♯g³ hang off the first two rows of the main bridge by dashed lines, i.e. the same strings.
const BRACE_END = 104 + 8;
const top: Bridge = {
  spots: [0, 1].map((i) => ({
    x: 525 * S,
    y: main.spots[i].y,
    r: ['A#6', 'G#6'][i],
    str: main.spots[i].str,
    dashFrom: main.spots[i].x + BRACE_END,
  })),
};

export const BRIDGES: Bridge[] = [
  left,
  main,
  top,
  bridge([586, 629], [633, 1559], 16, [
    ['E5', '', 25], ['D5', '', 25],
    ['C5', '', 24], ['A#4', '', 24], ['G#4', '', 24],
    ['F#4', '', 23], ['E4', '', 23],
    ['D4', '', 22], ['C4', '', 22],
    ['A#3', '', 21], ['G#3', '', 21],
  ]),
  bridge([794, 730], [839, 1574], 16, [
    ['G4', '', 23], ['F4', '', 23],
    ['D#4', '', 22],
    ['C#4', '', 21], ['B3', '', 21], ['A3', '', 21],
    ['G3', '', 20], ['F3', '', 20],
    ['D#3', '', 19], ['C#3', '', 19],
  ]),
  // bass bridge
  bridge([1033, 637], [1078, 1592], 16, [
    ['C4', '', 21], ['A#3', '', 21],
    ['G#3', '', 20], ['F#3', '', 20],
    ['E3', '', 19], ['D3', '', 19],
    ['C3', '', 18], ['B2', '', 18],
    ['A2', '', 17],
    ['G2', '', 16],
    ['F2', '', 15],
  ]),
];
