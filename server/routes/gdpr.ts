import { Router } from 'express';
import type { GdprLegalBasis } from '../contacts/gdprContact.js';
import {
  eraseContactGdprData,
  exportContactGdprData,
  getGdprSettings,
  runGdprRetention,
  saveGdprSettings,
  updateContactGdprFields,
} from '../gdpr/gdprService.js';

const router = Router();

router.get('/settings', (_req, res) => {
  res.json({ settings: getGdprSettings() });
});

router.put('/settings', (req, res) => {
  try {
    const body = req.body as {
      retentionMonths?: number;
      companyName?: string;
      dpoEmail?: string;
    };
    res.json({ success: true, settings: saveGdprSettings(body) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Save failed' });
  }
});

router.get('/export/:contactId', (req, res) => {
  try {
    const data = exportContactGdprData(req.params.contactId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Export failed' });
  }
});

router.put('/contacts/:contactId', (req, res) => {
  try {
    const body = req.body as {
      gdprLegalBasis?: GdprLegalBasis;
      gdprConsentAt?: string;
      gdprConsentSource?: string;
    };
    const contact = updateContactGdprFields(req.params.contactId, body);
    res.json({ success: true, contact });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Update failed' });
  }
});

router.post('/erase/:contactId', (req, res) => {
  try {
    const result = eraseContactGdprData(req.params.contactId);
    res.json({
      success: true,
      message: 'Contact personal data erased. Active AI calls were not interrupted.',
      ...result,
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Erase failed' });
  }
});

router.post('/retention/run', (_req, res) => {
  try {
    const result = runGdprRetention();
    res.json({
      success: true,
      message: `Retention complete — ${result.erased} contact(s) erased.`,
      ...result,
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Retention failed' });
  }
});

export default router;