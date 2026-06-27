import { Router } from 'express';
import {
  callContactsByIds,
  callContactsByTags,
  tryTriggerOnNewTags,
  triggerCallForContact,
} from '../contacts/contactCallTrigger.js';
import { getContactConversations } from '../contacts/contactConversations.js';
import { buildContactName, prepareContactInput, type ContactFilterField } from '../contacts/contactHelpers.js';
import {
  bulkAddTags,
  bulkImportContacts,
  createContact,
  deleteContact,
  getContactById,
  getContactsConfig,
  getContactsStats,
  listAllContactTags,
  listContacts,
  listContactsPaginated,
  saveContactsConfig,
  setContactDnd,
  updateContact,
} from '../contacts/contactsStore.js';
import type { Contact } from '../contacts/contactsTypes.js';

const FILTER_FIELDS: ContactFilterField[] = [
  'firstName',
  'middleName',
  'lastName',
  'id',
  'createdAt',
  'dob',
  'email',
  'phone',
  'phoneAlt',
  'address',
  'postcode',
];

const router = Router();

router.get('/stats', (_req, res) => {
  res.json(getContactsStats());
});

router.get('/config', (_req, res) => {
  res.json(getContactsConfig());
});

router.put('/config', (req, res) => {
  const { autoCallOnTag, callTriggerTag } = req.body as {
    autoCallOnTag?: boolean;
    callTriggerTag?: string;
  };
  res.json({
    success: true,
    config: saveContactsConfig({ autoCallOnTag, callTriggerTag }),
  });
});

router.get('/tags', (_req, res) => {
  res.json({ tags: listAllContactTags() });
});

router.get('/', (req, res) => {
  const search = req.query.search as string | undefined;
  const tag = req.query.tag as string | undefined;
  const filterField = req.query.filterField as ContactFilterField | undefined;
  const filterValue = req.query.filterValue as string | undefined;
  const all = req.query.all === 'true';
  const page = req.query.page ? Number(req.query.page) : 1;
  const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 20;

  const opts = {
    search,
    tag,
    filterField: filterField && FILTER_FIELDS.includes(filterField) ? filterField : undefined,
    filterValue,
    page,
    pageSize,
    all,
  };

  if (all) {
    res.json({ contacts: listContacts(opts) });
    return;
  }

  res.json(listContactsPaginated(opts));
});

router.post('/', (req, res) => {
  const body = req.body as Partial<Contact>;
  const name = buildContactName(body);
  if ((!body.firstName?.trim() && !body.name?.trim() && !body.lastName?.trim()) || !body.phone?.trim()) {
    return res.status(400).json({ error: 'First or last name and phone are required.' });
  }
  const contact = createContact({
    ...prepareContactInput({ ...body, name }),
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
    ghlContactId: body.ghlContactId,
    source: 'manual',
  });
  res.json({ success: true, contact });
});

router.post('/bulk/tags', async (req, res) => {
  const { contactIds, tags } = req.body as { contactIds?: string[]; tags?: string[] };
  if (!contactIds?.length) return res.status(400).json({ error: 'Select at least one contact.' });
  if (!tags?.length) return res.status(400).json({ error: 'Enter at least one tag.' });

  const normTags = tags.map((t) => t.trim()).filter(Boolean);
  const before = contactIds.map((id) => getContactById(id)).filter((c): c is Contact => Boolean(c));
  const { updated } = bulkAddTags(contactIds, normTags);

  let triggersFired = 0;
  for (const prev of before) {
    const added = normTags.filter(
      (t) => !prev.tags.some((x) => x.toLowerCase() === t.toLowerCase())
    );
    if (!added.length) continue;
    const trigger = await tryTriggerOnNewTags(prev.id, added);
    if (trigger.triggered) triggersFired += 1;
  }

  res.json({
    success: true,
    updated,
    triggersFired,
    message: `Tag added to ${updated} contact(s)`,
  });
});

router.post('/bulk/call', async (req, res) => {
  const { contactIds, agentId } = req.body as { contactIds?: string[]; agentId?: string };
  if (!contactIds?.length) return res.status(400).json({ error: 'Select at least one contact.' });
  const result = await callContactsByIds(contactIds, 'contact_bulk_selected', agentId?.trim() || undefined);
  res.json({ success: true, ...result });
});

router.post('/call-by-tags', async (req, res) => {
  const { tags, agentId } = req.body as { tags?: string[]; agentId?: string };
  if (!tags?.length) return res.status(400).json({ error: 'Select at least one tag.' });
  const result = await callContactsByTags(tags, 'contact_tag_campaign', agentId?.trim() || undefined);
  res.json({ success: true, ...result });
});

router.post('/import', async (req, res) => {
  const { contacts } = req.body as { contacts?: Partial<Contact>[] };
  if (!contacts?.length) {
    return res.status(400).json({ error: 'No contacts to import.' });
  }
  const result = bulkImportContacts(
    contacts.map((c) =>
      prepareContactInput({
        ...c,
        name: c.name?.trim() || 'Unknown',
        phone: c.phone?.trim() ?? '',
        tags: Array.isArray(c.tags) ? c.tags.map(String) : [],
        ghlContactId: c.ghlContactId,
        source: 'csv' as const,
      })
    )
  );

  const config = getContactsConfig();
  if (config.autoCallOnTag && config.callTriggerTag) {
    for (const row of contacts) {
      if (row.tags?.some((t) => t.toLowerCase() === config.callTriggerTag.toLowerCase())) {
        const match = listContacts({ search: row.phone }).find(
          (c) => c.phone.replace(/\D/g, '') === (row.phone ?? '').replace(/\D/g, '')
        );
        if (match) void tryTriggerOnNewTags(match.id, [config.callTriggerTag]);
      }
    }
  }

  res.json({ success: true, ...result });
});

router.get('/:id/conversations', (req, res) => {
  const contact = getContactById(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json({ contact, conversations: getContactConversations(req.params.id) });
});

router.put('/:id/dnd', (req, res) => {
  const existing = getContactById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });
  const { dnd } = req.body as { dnd?: boolean };
  if (typeof dnd !== 'boolean') return res.status(400).json({ error: 'dnd boolean required' });
  const contact = setContactDnd(req.params.id, dnd);
  res.json({ success: true, contact });
});

router.get('/:id', (req, res) => {
  const contact = getContactById(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json(contact);
});

router.put('/:id', (req, res) => {
  const existing = getContactById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });

  const body = req.body as Partial<Contact>;
  const oldTags = new Set(existing.tags.map((t) => t.toLowerCase()));
  const newTags = Array.isArray(body.tags) ? body.tags.map(String) : existing.tags;
  const addedTags = newTags.filter((t) => !oldTags.has(t.toLowerCase()));

  const merged = {
    ...existing,
    ...body,
    tags: newTags,
    name: body.name ?? existing.name,
    firstName: body.firstName !== undefined ? body.firstName : existing.firstName,
    middleName: body.middleName !== undefined ? body.middleName : existing.middleName,
    lastName: body.lastName !== undefined ? body.lastName : existing.lastName,
    phone: body.phone?.trim() ?? existing.phone,
    phoneAlt: body.phoneAlt !== undefined ? body.phoneAlt : existing.phoneAlt,
    email: body.email !== undefined ? body.email : existing.email,
    dob: body.dob !== undefined ? body.dob : existing.dob,
    address: body.address !== undefined ? body.address : existing.address,
    postcode: body.postcode !== undefined ? body.postcode : existing.postcode,
    company: body.company !== undefined ? body.company : existing.company,
    notes: body.notes !== undefined ? body.notes : existing.notes,
    ghlContactId: body.ghlContactId ?? existing.ghlContactId,
    dnd: typeof body.dnd === 'boolean' ? body.dnd : existing.dnd,
  };
  const contact = updateContact(req.params.id, {
    ...prepareContactInput(merged),
    dnd: merged.dnd,
  });

  if (addedTags.length) {
    void tryTriggerOnNewTags(req.params.id, addedTags);
  }

  res.json({ success: true, contact });
});

router.delete('/:id', (req, res) => {
  if (!deleteContact(req.params.id)) return res.status(404).json({ error: 'Contact not found' });
  res.json({ success: true });
});

router.post('/:id/call', async (req, res) => {
  const { agentId } = req.body as { agentId?: string };
  const result = await triggerCallForContact(req.params.id, 'contact_click', agentId?.trim() || undefined);
  if (!result.ok) return res.status(400).json({ error: result.message });
  res.json({ success: true, ...result });
});

router.post('/:id/tags', async (req, res) => {
  const existing = getContactById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });

  const { tags } = req.body as { tags?: string[] };
  if (!tags?.length) return res.status(400).json({ error: 'Tags required.' });

  const merged = [...new Set([...existing.tags, ...tags.map((t) => t.trim()).filter(Boolean)])];
  const added = tags.filter((t) => !existing.tags.some((x) => x.toLowerCase() === t.toLowerCase()));
  const contact = updateContact(req.params.id, { tags: merged });

  let triggerMessage: string | undefined;
  if (added.length) {
    const trigger = await tryTriggerOnNewTags(req.params.id, added);
    if (trigger.triggered) triggerMessage = trigger.message;
  }

  res.json({ success: true, contact, triggerMessage });
});

router.delete('/:id/tags/:tag', (req, res) => {
  const existing = getContactById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });
  const tag = decodeURIComponent(req.params.tag);
  const contact = updateContact(req.params.id, {
    tags: existing.tags.filter((t) => t.toLowerCase() !== tag.toLowerCase()),
  });
  res.json({ success: true, contact });
});

export default router;