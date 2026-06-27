export type CheckStatus = 'pass' | 'warn' | 'fail';
export type SeoAction = 'add' | 'remove' | 'improve' | 'keep';

export interface SeoCheck {
  id: string;
  label: string;
  status: CheckStatus;
  score: number;
  maxScore: number;
  detail: string;
  explanation: string;
  action: SeoAction;
  actionText: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface SeoCategory {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  checks: SeoCheck[];
}

export interface SeoActionItem {
  id: string;
  label: string;
  category: string;
  status: CheckStatus;
  priority: 'critical' | 'high' | 'medium' | 'low';
  detail: string;
  explanation: string;
  actionText: string;
  action: SeoAction;
}

export interface SeoActionPlan {
  criticalFailures: SeoActionItem[];
  needsImprovement: SeoActionItem[];
  shouldAdd: SeoActionItem[];
  shouldRemove: SeoActionItem[];
  workingWell: SeoActionItem[];
}

export interface SeoAuditCounts {
  pass: number;
  warn: number;
  fail: number;
  total: number;
}

export function countChecks(categories: SeoCategory[]): SeoAuditCounts {
  const all = categories.flatMap((c) => c.checks);
  return {
    pass: all.filter((c) => c.status === 'pass').length,
    warn: all.filter((c) => c.status === 'warn').length,
    fail: all.filter((c) => c.status === 'fail').length,
    total: all.length,
  };
}

export function buildActionPlan(categories: SeoCategory[]): SeoActionPlan {
  const plan: SeoActionPlan = {
    criticalFailures: [],
    needsImprovement: [],
    shouldAdd: [],
    shouldRemove: [],
    workingWell: [],
  };

  for (const cat of categories) {
    for (const c of cat.checks) {
      const item: SeoActionItem = {
        id: c.id,
        label: c.label,
        category: cat.name,
        status: c.status,
        priority: c.priority,
        detail: c.detail,
        explanation: c.explanation,
        actionText: c.actionText,
        action: c.action,
      };

      if (c.status === 'pass') {
        plan.workingWell.push(item);
        continue;
      }

      if (c.status === 'fail') plan.criticalFailures.push(item);
      else plan.needsImprovement.push(item);

      if (c.action === 'add' && c.status !== 'pass') plan.shouldAdd.push(item);
      if (c.action === 'remove') plan.shouldRemove.push(item);
    }
  }

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortFn = (a: SeoActionItem, b: SeoActionItem) =>
    priorityOrder[a.priority] - priorityOrder[b.priority];

  plan.criticalFailures.sort(sortFn);
  plan.needsImprovement.sort(sortFn);
  plan.shouldAdd.sort(sortFn);
  plan.shouldRemove.sort(sortFn);

  return plan;
}