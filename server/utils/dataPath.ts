import fs from 'fs';
import path from 'path';

export function getDataDir(): string {
  const custom = process.env.DATA_DIR?.trim();
  if (custom) {
    fs.mkdirSync(custom, { recursive: true });
    return custom;
  }
  return path.join(process.cwd(), 'server', 'data');
}

export function getDataFile(name: string): string {
  const dir = getDataDir();
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, name);
}

export function getTeamFilePath(): string {
  return getDataFile('team.json');
}