import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const LEADING_META = /^(?:Script started|Command:)[^\n]*\n/;
const TRAILING_META = /\n(?:Script done|Command exit status:)[^\n]*(?=\n|$)/g;

function trimScriptWrapping(data: string): string {
  let out = data;
  while (LEADING_META.test(out)) {
    out = out.replace(LEADING_META, '');
  }
  return out.replace(TRAILING_META, '');
}

export async function record(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'ansivision-'));
  const out = join(dir, 'typescript');
  const shell = process.env.SHELL ?? '/bin/sh';

  const args =
    process.platform === 'darwin' ? [out, shell] : ['-q', '-c', shell, out];

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn('script', args, { stdio: 'inherit' });
      child.on('error', reject);
      child.on('exit', () => resolve());
    });
    return trimScriptWrapping(await readFile(out, 'utf8'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
