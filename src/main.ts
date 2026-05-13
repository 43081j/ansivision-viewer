import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { Viewer } from './viewer.js';
import { record } from './record.js';

export async function cli(): Promise<void> {
  const { values, positionals } = parseArgs({
    options: {
      record: { type: 'boolean', short: 'r' },
      'skip-intro': { type: 'boolean' },
    },
    allowPositionals: true,
  });

  let input: string;

  if (values.record) {
    if (!(await hasScript())) {
      console.error('error: `script` command not found in PATH');
      process.exit(1);
    }
    console.log('recording session - type `exit` or Ctrl-D when done...');
    input = await record();
  } else {
    const file = positionals[0];
    if (!file) {
      console.error('usage: ansivision-viewer <file> | --record');
      process.exit(1);
    }
    input = await readFile(file, 'utf8');
  }

  const viewer = new Viewer(input, {
    output: process.stdout,
    input: process.stdin,
    skipIntro: values['skip-intro'] ?? false,
  });
  await viewer.start();
}

async function hasScript(): Promise<boolean> {
  const { spawn } = await import('node:child_process');
  return new Promise((resolve) => {
    const child = spawn('script', ['--version'], { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('exit', () => resolve(true));
  });
}
