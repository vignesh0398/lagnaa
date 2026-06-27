import fs from 'fs';
import path from 'path';
import { DEFAULT_WHITE_LABEL, type WhiteLabelConfig } from './marketingTypes.js';

const STORE_PATH = path.join(process.cwd(), 'server', 'data', 'white-label.json');

export function getWhiteLabelConfig(): WhiteLabelConfig {
  if (!fs.existsSync(STORE_PATH)) return { ...DEFAULT_WHITE_LABEL };
  try {
    return { ...DEFAULT_WHITE_LABEL, ...JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8')) };
  } catch {
    return { ...DEFAULT_WHITE_LABEL };
  }
}

export function saveWhiteLabelConfig(config: Partial<WhiteLabelConfig>): WhiteLabelConfig {
  const merged = { ...getWhiteLabelConfig(), ...config };
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(merged, null, 2));
  return merged;
}