import { Router } from 'express';
import { listCustomFields, testGhlConnection } from '../ghlClient.js';
import { handleGhlWebhook, triggerCallForGhlContact } from '../ghlCallTrigger.js';
import { importContactsFromGhl } from '../ghlSync.js';
import {
  disconnectGhl,
  getPublicGhlConfig,
  setGhlConnected,
  updateGhlConfig,
} from '../ghlStore.js';
import { getWebhookBaseUrl } from '../tunnel.js';

const router = Router();

function buildGhlWebhookUrl(): string | null {
  const base = getWebhookBaseUrl();
  return base ? `${base}/api/ghl/webhook/inbound` : null;
}

router.get('/config', (_req, res) => {
  res.json({
    ...getPublicGhlConfig(),
    inboundWebhookUrl: buildGhlWebhookUrl(),
    webhookReady: Boolean(getWebhookBaseUrl()),
  });
});

router.put('/config', (req, res) => {
  const {
    apiKey,
    locationId,
    autoSyncOutcomes,
    addTagsOnSync,
    importTagFilter,
    autoCallOnTag,
    callTriggerTag,
    fieldMapping,
  } = req.body as {
    apiKey?: string;
    locationId?: string;
    autoSyncOutcomes?: boolean;
    addTagsOnSync?: boolean;
    importTagFilter?: string;
    autoCallOnTag?: boolean;
    callTriggerTag?: string;
    fieldMapping?: Record<string, string>;
  };

  const updates: Parameters<typeof updateGhlConfig>[0] = {};
  if (apiKey !== undefined) updates.apiKey = apiKey.trim();
  if (locationId !== undefined) updates.locationId = locationId.trim();
  if (autoSyncOutcomes !== undefined) updates.autoSyncOutcomes = autoSyncOutcomes;
  if (addTagsOnSync !== undefined) updates.addTagsOnSync = addTagsOnSync;
  if (importTagFilter !== undefined) updates.importTagFilter = importTagFilter.trim();
  if (autoCallOnTag !== undefined) updates.autoCallOnTag = autoCallOnTag;
  if (callTriggerTag !== undefined) updates.callTriggerTag = callTriggerTag.trim();
  if (fieldMapping) updates.fieldMapping = fieldMapping;

  updateGhlConfig(updates);
  res.json({
    success: true,
    config: { ...getPublicGhlConfig(), inboundWebhookUrl: buildGhlWebhookUrl(), webhookReady: Boolean(getWebhookBaseUrl()) },
  });
});

router.post('/connect', async (req, res) => {
  const { apiKey, locationId } = req.body as { apiKey?: string; locationId?: string };
  const key = (apiKey ?? '').trim();
  const loc = (locationId ?? '').trim();

  if (!key || !loc) {
    return res.status(400).json({ error: 'API key and Location ID are required' });
  }

  updateGhlConfig({ apiKey: key, locationId: loc });

  try {
    const result = await testGhlConnection(key, loc);
    setGhlConnected(true, result.locationName);
    res.json({
      success: true,
      message: `Connected to ${result.locationName}`,
      config: { ...getPublicGhlConfig(), inboundWebhookUrl: buildGhlWebhookUrl(), webhookReady: Boolean(getWebhookBaseUrl()) },
    });
  } catch (err) {
    setGhlConnected(false);
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Connection failed — check API key and Location ID',
    });
  }
});

router.post('/disconnect', (_req, res) => {
  disconnectGhl();
  res.json({ success: true, config: getPublicGhlConfig() });
});

router.get('/custom-fields', async (_req, res) => {
  try {
    const fields = await listCustomFields();
    res.json({ fields });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load custom fields' });
  }
});

router.post('/webhook/inbound', (req, res) => {
  res.sendStatus(200);
  void handleGhlWebhook(req.body as Record<string, unknown>);
});

router.post('/trigger/call', async (req, res) => {
  const { contactId } = req.body as { contactId?: string };
  if (!contactId?.trim()) {
    return res.status(400).json({ error: 'contactId is required' });
  }
  const result = await triggerCallForGhlContact(contactId.trim(), 'manual_trigger');
  if (!result.ok) return res.status(400).json({ error: result.message });
  res.json({ success: true, ...result, config: getPublicGhlConfig() });
});

router.post('/sync/import', async (req, res) => {
  const { tag, limit } = req.body as { tag?: string; limit?: number };
  try {
    const result = await importContactsFromGhl({ tag, limit });
    res.json({
      success: true,
      imported: result.imported,
      contacts: result.contacts.map((c) => ({
        id: c.id,
        name: c.name ?? ([c.firstName, c.lastName].filter(Boolean).join(' ') || '—'),
        phone: c.phone ?? '',
        email: c.email ?? '',
        tags: c.tags ?? [],
      })),
      config: getPublicGhlConfig(),
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Import failed' });
  }
});

export default router;