import { Router } from 'express';
import { getBillingUsage } from '../ai/billingUsage.js';
import {
  getBillingAccount,
  getPlanDefinition,
  PLANS,
  updateBillingAccount,
  type PlanTier,
} from '../billingStore.js';

const router = Router();

router.get('/usage', (_req, res) => {
  res.json(getBillingUsage());
});

router.get('/plan', (_req, res) => {
  const account = getBillingAccount();
  const plan = getPlanDefinition(account.planTier);
  res.json({
    account,
    plan,
    availablePlans: Object.values(PLANS),
  });
});

router.put('/plan', (req, res) => {
  const { planTier, billingEmail, companyName } = req.body as {
    planTier?: PlanTier;
    billingEmail?: string;
    companyName?: string;
  };

  if (planTier && !PLANS[planTier]) {
    return res.status(400).json({ error: 'Invalid plan tier' });
  }

  const account = updateBillingAccount({
    ...(planTier ? { planTier } : {}),
    ...(billingEmail ? { billingEmail: billingEmail.trim() } : {}),
    ...(companyName ? { companyName: companyName.trim() } : {}),
  });

  res.json({ success: true, account, usage: getBillingUsage() });
});

export default router;