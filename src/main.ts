import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { Viewer } from './viewer.js';

export async function cli(): Promise<void> {
  const { positionals } = parseArgs({ allowPositionals: true });
  const file = positionals[0];

  if (!file) {
    console.error('usage: foo.mjs <file>');
    process.exit(1);
  }

  const input = await readFile(file, 'utf8');
  const viewer = new Viewer(input);
  await viewer.start();
}
