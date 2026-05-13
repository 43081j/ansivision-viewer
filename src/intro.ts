import { HIDE, CLEAR } from './constants.js';

const ART = [
  '   ___   _  ___________   __________________  _  __',
  '  / _ | / |/ / __/  _/ | / /  _/ __/  _/ __ \\/ |/ /',
  ' / __ |/    /\\ \\_/ / | |/ // /_\\ \\_/ // /_/ /    / ',
  '/_/ |_/_/|_/___/___/ |___/___/___/___/\\____/_/|_/  ',
] as const;

const FRAMES = 55;
const FRAME_MS = 35;
const WIPE_SLOPE = 0.6;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function playIntro(stream: NodeJS.WriteStream): Promise<void> {
  const artWidth = ART[0].length;
  const artHeight = ART.length;
  const cols = stream.columns || 80;
  const rows = stream.rows || 24;
  const startCol = Math.max(1, Math.floor((cols - artWidth) / 2) + 1);
  const startRow = Math.max(1, Math.floor((rows - artHeight) / 2));

  stream.write(HIDE + CLEAR);

  for (let f = 0; f < FRAMES; f++) {
    let out = '';
    for (const [y, row] of ART.entries()) {
      out += `\x1b[${startRow + y};${startCol}H`;
      for (let x = 0; x < artWidth; x++) {
        const ch = row.charAt(x);
        if (ch === ' ') {
          out += ' ';
          continue;
        }
        const t = f - (x + y) * WIPE_SLOPE;
        if (t < 0) {
          out += ' ';
          continue;
        }
        const phase = t * 0.25 + (x + y) * 0.08;
        const r = Math.round(Math.sin(phase) * 110 + 145);
        const g = Math.round(Math.sin(phase + 2.094) * 110 + 145);
        const b = Math.round(Math.sin(phase + 4.188) * 110 + 145);
        out += `\x1b[1;38;2;${r};${g};${b}m${ch}`;
      }
    }
    stream.write(out);
    await sleep(FRAME_MS);
  }

  await sleep(250);
  stream.write('\x1b[0m' + CLEAR);
}
