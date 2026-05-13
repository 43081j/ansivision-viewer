import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PLAY_INTERVAL } from './constants.js';
import { Viewer } from './viewer.js';

function makeInput(): NodeJS.ReadStream {
  const input = new EventEmitter() as unknown as NodeJS.ReadStream & {
    setRawMode: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    resume: ReturnType<typeof vi.fn>;
    setEncoding: ReturnType<typeof vi.fn>;
  };
  input.setRawMode = vi.fn();
  input.pause = vi.fn();
  input.resume = vi.fn();
  input.setEncoding = vi.fn();
  return input;
}

function makeOutput(): NodeJS.WriteStream & { written: string[] } {
  const output = {
    columns: 80,
    rows: 24,
    written: [] as string[],
    write(chunk: string) {
      this.written.push(chunk);
      return true;
    },
  } as unknown as NodeJS.WriteStream & { written: string[] };
  return output;
}

// Three-frame source: write content then clear screen to push a frame.
const SOURCE = 'frame-a\x1b[2Jframe-b\x1b[2Jframe-c';

describe('Viewer', () => {
  let input: NodeJS.ReadStream;
  let output: NodeJS.WriteStream & { written: string[] };
  let viewer: Viewer;

  beforeEach(() => {
    vi.useFakeTimers();
    input = makeInput();
    output = makeOutput();
    viewer = new Viewer(SOURCE, { input, output, skipIntro: true });
  });

  afterEach(async () => {
    await viewer.stop();
    vi.useRealTimers();
  });

  it('renders an initial frame on start', async () => {
    await viewer.start();
    const combined = output.written.join('');
    expect(combined).toContain('frame-a');
    expect(combined).toContain('1 / 3');
    expect(input.setRawMode).toHaveBeenCalledWith(true);
  });

  it('advances to the next frame on "l"', async () => {
    await viewer.start();
    output.written.length = 0;
    input.emit('data', 'l');
    const combined = output.written.join('');
    expect(combined).toContain('frame-b');
    expect(combined).toContain('2 / 3');
  });

  it('advances on right-arrow', async () => {
    await viewer.start();
    output.written.length = 0;
    input.emit('data', '\x1b[C');
    expect(output.written.join('')).toContain('2 / 3');
  });

  it('does not advance past the last frame', async () => {
    await viewer.start();
    input.emit('data', 'l');
    input.emit('data', 'l');
    input.emit('data', 'l');
    input.emit('data', 'l');
    const combined = output.written.join('');
    expect(combined).toContain('3 / 3');
    expect(combined).not.toContain('4 / 3');
  });

  it('goes back to the previous frame on "h"', async () => {
    await viewer.start();
    input.emit('data', 'l');
    output.written.length = 0;
    input.emit('data', 'h');
    expect(output.written.join('')).toContain('1 / 3');
  });

  it('does not go before the first frame', async () => {
    await viewer.start();
    output.written.length = 0;
    input.emit('data', 'h');
    expect(output.written.join('')).toContain('1 / 3');
  });

  it('toggles play with space and auto-advances on the timer', async () => {
    await viewer.start();
    input.emit('data', ' ');
    vi.advanceTimersByTime(PLAY_INTERVAL);
    expect(output.written.join('')).toContain('2 / 3');
    vi.advanceTimersByTime(PLAY_INTERVAL);
    expect(output.written.join('')).toContain('3 / 3');
  });

  it('stops the timer when reaching the last frame', async () => {
    await viewer.start();
    input.emit('data', ' ');
    vi.advanceTimersByTime(PLAY_INTERVAL * 10);
    const before = output.written.length;
    vi.advanceTimersByTime(PLAY_INTERVAL * 5);
    expect(output.written.length).toBe(before);
  });

  it('pauses on a second space press', async () => {
    await viewer.start();
    input.emit('data', ' ');
    vi.advanceTimersByTime(PLAY_INTERVAL);
    input.emit('data', ' ');
    const before = output.written.length;
    vi.advanceTimersByTime(PLAY_INTERVAL * 5);
    expect(output.written.length).toBe(before);
  });

  it('quits on "q"', async () => {
    await viewer.start();
    input.emit('data', 'q');
    expect(input.setRawMode).toHaveBeenLastCalledWith(false);
    expect(input.pause).toHaveBeenCalled();
  });

  it('quits on escape', async () => {
    await viewer.start();
    input.emit('data', '\x1b');
    expect(input.setRawMode).toHaveBeenLastCalledWith(false);
  });

  it('quits on ctrl-c', async () => {
    await viewer.start();
    input.emit('data', '\x03');
    expect(input.setRawMode).toHaveBeenLastCalledWith(false);
  });

  it('ignores unknown keys', async () => {
    await viewer.start();
    const before = output.written.length;
    input.emit('data', 'x');
    expect(output.written.length).toBe(before);
  });
});
