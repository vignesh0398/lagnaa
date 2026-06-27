import type { ProspectResult, ProspectSearchFilters, TitleLevel } from './prospectTypes.js';

const CEO_PATTERNS = [/chief executive/i, /\bceo\b/i, /managing director/i, /\bmd\b/i, /founder/i, /president/i];
const CFO_PATTERNS = [/chief financial/i, /\bcfo\b/i, /finance director/i, /financial director/i];
const DIRECTOR_PATTERNS = [/director/i, /partner/i, /proprietor/i, /executive/i];

export function matchesTitleLevel(level: TitleLevel, title: string, role: string): boolean {
  if (level === 'all') return true;
  const combined = `${title} ${role}`;
  if (level === 'ceo') return CEO_PATTERNS.some((p) => p.test(combined));
  if (level === 'cfo') return CFO_PATTERNS.some((p) => p.test(combined));
  if (level === 'director') return DIRECTOR_PATTERNS.some((p) => p.test(combined));
  return true;
}

export function titleForLevel(level: TitleLevel): string {
  if (level === 'ceo') return 'Chief Executive Officer';
  if (level === 'cfo') return 'Chief Financial Officer';
  if (level === 'director') return 'Director';
  return 'Senior Executive';
}

export function filterProspects(prospects: ProspectResult[], filters: ProspectSearchFilters): ProspectResult[] {
  let out = prospects;

  const level = filters.titleLevel ?? 'all';
  if (level !== 'all') {
    out = out.filter((p) => matchesTitleLevel(level, p.title, p.officerRole));
  }

  if (filters.region?.trim()) {
    const region = filters.region.trim().toLowerCase();
    out = out.filter(
      (p) =>
        p.region.toLowerCase().includes(region) ||
        region.includes(p.region.toLowerCase()) ||
        p.address.toLowerCase().includes(region)
    );
  }

  if (filters.sicCode?.trim()) {
    const sic = filters.sicCode.trim().toLowerCase();
    out = out.filter(
      (p) =>
        p.sicCodes.some((c) => c.toLowerCase().startsWith(sic)) ||
        p.industry.toLowerCase().includes(sic) ||
        sic.includes(p.industry.toLowerCase())
    );
  }

  if (filters.query?.trim()) {
    const q = filters.query.trim().toLowerCase();
    out = out.filter(
      (p) =>
        p.company.toLowerCase().includes(q) ||
        p.fullName.toLowerCase().includes(q) ||
        p.industry.toLowerCase().includes(q)
    );
  }

  if (filters.hasEmail) out = out.filter((p) => Boolean(p.email?.trim()));
  if (filters.hasPhone) out = out.filter((p) => Boolean(p.phone?.trim()));

  return out;
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}