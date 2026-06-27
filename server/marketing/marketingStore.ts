import fs from 'fs';
import path from 'path';
import { buildActionPlan, countChecks } from '../seo/seoActionPlan.js';
import type { MarketingToolResult, MarketingToolType } from './marketingTypes.js';

const STORE_PATH = path.join(process.cwd(), 'server', 'data', 'marketing-tools.json');
const MAX_HISTORY = 100;

function normalize(raw: MarketingToolResult): MarketingToolResult {
  const categories = raw.categories ?? [];
  return {
    ...raw,
    counts: raw.counts ?? countChecks(categories),
    actionPlan: raw.actionPlan ?? buildActionPlan(categories),
  };
}

function loadAll(): MarketingToolResult[] {
  if (!fs.existsSync(STORE_PATH)) return [];
  return (JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8')) as MarketingToolResult[]).map(normalize);
}

function saveAll(items: MarketingToolResult[]): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(items.slice(0, MAX_HISTORY), null, 2));
}

export function saveMarketingResult(result: MarketingToolResult): void {
  const items = loadAll();
  items.unshift(normalize(result));
  saveAll(items);
}

export function listMarketingResults(type?: MarketingToolType): MarketingToolResult[] {
  const all = loadAll();
  return type ? all.filter((i) => i.type === type) : all;
}

export function getMarketingById(id: string): MarketingToolResult | undefined {
  return loadAll().find((i) => i.id === id);
}

export function deleteMarketingResult(id: string): boolean {
  const items = loadAll();
  const next = items.filter((i) => i.id !== id);
  if (next.length === items.length) return false;
  saveAll(next);
  return true;
}