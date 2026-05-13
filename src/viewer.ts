import { stripVTControlCharacters, styleText } from 'node:util';
import { Renderer, renderString } from 'ansivision';
import { CLEAR, HIDE, PLAY_INTERVAL, SHOW } from './constants.js';
import { playIntro } from './intro.js';

const BAR_BG = ['bgGray', 'white'] as const;

export class Viewer {
  #timer: NodeJS.Timeout | null = null;
  #index: number = 0;
  #renderer: Renderer | null = null;
  #source: string;

  public constructor(input: string) {
    this.#source = input;
  }

  public async start(): Promise<void> {
    this.#renderer = await renderString(this.#source);
    await playIntro(process.stdout);
    this.#initialRender();
    this.#render();
  }

  public async stop(): Promise<void> {
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
    process.stdin.off('data', this.#onStdin);
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdout.write(SHOW + '\n');
  }

  #renderBar(left: string, right: string = ''): string {
    const width = process.stdout.columns || 80;
    const used =
      stripVTControlCharacters(left).length +
      stripVTControlCharacters(right).length;
    const gap = Math.max(1, width - used - 2);
    return (
      styleText(BAR_BG, ' ') +
      left +
      styleText(BAR_BG, ' '.repeat(gap)) +
      right +
      styleText(BAR_BG, ' ')
    );
  }

  #initialRender(): void {
    process.stdin.on('data', this.#onStdin);
    process.stdout.write(HIDE);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
  }

  #onStdin = (key: string): void => {
    if (!this.#renderer) {
      return;
    }

    if (key === 'q' || key === '\x1b' || key === '\x03') {
      this.stop();
    } else if (key === 'h' || key === '\x1b[D') {
      if (this.#index > 0) {
        this.#index--;
      }
      this.#renderer.previousFrame();
      this.#render();
    } else if (key === 'l' || key === '\x1b[C') {
      const total = this.#renderer.frames.length;
      if (this.#index < total - 1) {
        this.#index++;
      }
      this.#renderer.nextFrame();
      this.#render();
    } else if (key === ' ') {
      this.#togglePlay();
    }
  };

  #togglePlay() {
    if (!this.#renderer) {
      return;
    }

    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = null;
    } else {
      const total = this.#renderer.frames.length;

      if (this.#index >= total - 1) {
        this.#index = 0;
        this.#renderer.goToFrame(0);
      }
      this.#timer = setInterval(() => {
        if (this.#index >= total - 1) {
          if (this.#timer) {
            clearInterval(this.#timer);
          }
          this.#timer = null;
        } else {
          this.#index++;
          this.#renderer?.nextFrame();
        }
        this.#render();
      }, PLAY_INTERVAL);
    }

    this.#render();
  }

  #header(): string {
    const renderer = this.#renderer!;
    const playing = this.#timer !== null;
    const status = playing
      ? styleText(['bgGray', 'greenBright', 'bold'], ' ▶  PLAY  ')
      : styleText(['bgGray', 'yellowBright', 'bold'], ' ⏸  PAUSE ');
    const sep = styleText(['bgGray', 'gray'], '│ ');
    const title = styleText(
      ['bgGray', 'whiteBright', 'bold'],
      renderer.currentTitle || 'untitled',
    );

    const total = renderer.frames.length;
    const counter =
      styleText(
        ['bgGray', 'cyanBright', 'bold'],
        String(this.#index + 1).padStart(String(total).length),
      ) +
      styleText(['bgGray', 'gray'], ' / ') +
      styleText(['bgGray', 'white'], String(total));

    return this.#renderBar(status + sep + title, counter);
  }

  #footer(): string {
    const binding = (k: string, t: string) =>
      styleText(['bgGray', 'cyanBright', 'bold'], k) +
      styleText(['bgGray', 'white'], ' ' + t);
    const sep = styleText(['bgGray', 'gray'], '  ·  ');
    const left =
      styleText(['bgGray'], ' ') +
      [
        binding('h/←', 'prev'),
        binding('l/→', 'next'),
        binding('space', 'play/pause'),
        binding('q/esc', 'quit'),
      ].join(sep);
    return this.#renderBar(left);
  }

  #render(): void {
    if (!this.#renderer) {
      return;
    }
    const rows = process.stdout.rows || 24;
    process.stdout.write(
      CLEAR +
        this.#header() +
        '\n' +
        this.#renderer.currentFrame +
        `\x1b[${rows};1H` +
        this.#footer(),
    );
  }
}
