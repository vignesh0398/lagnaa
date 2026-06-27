import fs from 'fs';
import path from 'path';
import { buildActionPlan, countChecks } from './seoActionPlan.js';
import type { SeoAuditResult } from './seoAuditor.js';

const STORE_PATH = path.join(process.cwd(), 'server', 'data', 'seo-audits.json');
const MAX_HISTORY = 100;

function normalizeAudit(raw: SeoAuditResult): SeoAuditResult {
  const categories = raw.categories ?? [];
  const counts = raw.counts ?? countChecks(categories);
  const actionPlan = raw.actionPlan ?? buildActionPlan(categories);

  const checks = categories.flatMap((c) => c.checks);
  const withFields = checks.every((c) => 'explanation' in c && c.explanation);

  if (!withFields) {
    return raw;
  }

  return { ...raw, counts, actionPlan };
}

function loadAll(): SeoAuditResult[] {
  if (!fs.existsSync(STORE_PATH)) return [];
  const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8')) as SeoAuditResult[];
  return parsed.map(normalizeAudit);
}

function saveAll(audits: SeoAuditResult[]): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(audits.slice(0, MAX_HISTORY), null, 2));
}

export function saveAudit(result: SeoAuditResult): void {
  const audits = loadAll();
  audits.unshift(result);
  saveAll(audits);
}

export function listAudits(): SeoAuditResult[] {
  return loadAll();
}

export function getAuditById(id: string): SeoAuditResult | undefined {
  return loadAll().find((a) => a.id === id);
}

export function deleteAudit(id: string): boolean {
  const audits = loadAll();
  const next = audits.filter((a) => a.id !== id);
  if (next.length === audits.length) return false;
  saveAll(next);
  return true;
}