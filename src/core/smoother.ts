/** Median over recent readings; restarts when the pitch jumps (new note plucked). */
export class Smoother {
  private buf: number[] = [];

  constructor(private size = 5, private jumpCents = 50) {}

  push(freq: number): number {
    if (this.buf.length && Math.abs(1200 * Math.log2(freq / this.median())) > this.jumpCents) {
      this.buf = [];
    }
    this.buf.push(freq);
    if (this.buf.length > this.size) this.buf.shift();
    return this.median();
  }

  reset() {
    this.buf = [];
  }

  private median(): number {
    const s = [...this.buf].sort((a, b) => a - b);
    const mid = s.length >> 1;
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }
}
