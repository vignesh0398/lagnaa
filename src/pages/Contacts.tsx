import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Phone,
  PhoneCall,
  Plus,
  Search,
  Tag,
  Trash2,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { DualScrollTable } from '../components/contacts/DualScrollTable';
import { ExcelImportModal } from '../components/contacts/ExcelImportModal';
import {
  bulkAddTagsToContacts,
  callContact,
  callContactsByTags,
  callSelectedContacts,
  createContact,
  deleteContact,
  getContactTags,
  getContacts,
  getContactsConfig,
  getContactsStats,
  saveContactsConfig,
  setContactDnd,
  updateContact,
  type Contact,
  type ContactsConfig,
} from '../api/contacts';
import { getAgents, type Agent } from '../api/agents';
import { getCallReadiness, type CallReadiness } from '../api/twilio';
import {
  CONTACT_FILTER_FIELDS,
  PAGE_SIZE_OPTIONS,
  buildContactNameFromParts,
  displayName,
  formatCreatedAt,
  formatDobDDMMYYYY,
  normalizeDobInput,
  type ContactFilterField,
  type PageSizeOption,
} from '../utils/contactDisplay';

const TABLE_MIN_WIDTH = 2400;

function AgentSelect({
  agents,
  value,
  onChange,
  className = '',
}: {
  agents: Agent[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  if (!agents.length) {
    return <span className="text-xs text-slate-500">No agents — create one in AI Agents</span>;
  }
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`input-field text-xs ${className}`}
    >
      {agents.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name} — {a.workflow} ({a.status})
        </option>
      ))}
    </select>
  );
}

const EMPTY_FORM = {
  firstName: '',
  middleName: '',
  lastName: '',
  phone: '',
  phoneAlt: '',
  email: '',
  dob: '',
  address: '',
  postcode: '',
  company: '',
  notes: '',
  tags: '',
};

export function Contacts() {
  const location = useLocation();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState({ total: 0, withTags: 0, called: 0, autoCallOnTag: false, triggerTag: 'call-now' });
  const [config, setConfig] = useState<ContactsConfig>({ autoCallOnTag: false, callTriggerTag: 'call-now' });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [filterField, setFilterField] = useState<ContactFilterField>('firstName');
  const [filterValue, setFilterValue] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [callingId, setCallingId] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [bulkWorking, setBulkWorking] = useState(false);
  const [campaignTags, setCampaignTags] = useState<string[]>([]);
  const [campaignCalling, setCampaignCalling] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [callModalContact, setCallModalContact] = useState<Contact | null>(null);
  const [callReadiness, setCallReadiness] = useState<CallReadiness | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, all, tagsRes, s, c, agentsData, readiness] = await Promise.all([
        getContacts({
          search: search || undefined,
          tag: tagFilter || undefined,
          filterField: filterValue.trim() ? filterField : undefined,
          filterValue: filterValue.trim() || undefined,
          page,
          pageSize,
        }),
        getContacts({ all: true }),
        getContactTags(),
        getContactsStats(),
        getContactsConfig(),
        getAgents(),
        getCallReadiness().catch(() => null),
      ]);
      setContacts(list.contacts);
      setTotal(list.total);
      setTotalPages(list.totalPages);
      setPage(list.page);
      setAllContacts(all.contacts);
      setAllTags(tagsRes.tags);
      setStats(s);
      setConfig(c);
      setAgents(agentsData.agents);
      setCallReadiness(readiness);
      setSelectedAgentId((prev) => {
        if (prev && agentsData.agents.some((a) => a.id === prev)) return prev;
        return agentsData.publishedId || agentsData.agents[0]?.id || '';
      });
      setSelectedIds((prev) => {
        const visible = new Set(list.contacts.map((x) => x.id));
        const next = new Set([...prev].filter((id) => visible.has(id)));
        return next.size === prev.size ? prev : next;
      });
    } catch {
      setContacts([]);
      setError('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [search, tagFilter, filterField, filterValue, page, pageSize]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, tagFilter, filterField, filterValue, pageSize]);

  useEffect(() => {
    const denied = (location.state as { accessDenied?: boolean } | null)?.accessDenied;
    if (!denied) return;
    setMessage('That page is admin-only. You have member access to Contacts, Conversations, and outreach tools.');
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const campaignMatchCount = useMemo(() => {
    if (!campaignTags.length) return 0;
    const wanted = campaignTags.map((t) => t.toLowerCase());
    return allContacts.filter((c) =>
      wanted.some((t) => c.tags.some((x) => x.toLowerCase() === t))
    ).length;
  }, [allContacts, campaignTags]);

  const allVisibleSelected =
    contacts.length > 0 && contacts.every((c) => selectedIds.has(c.id));
  const someVisibleSelected = contacts.some((c) => selectedIds.has(c.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        contacts.forEach((c) => next.delete(c.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        contacts.forEach((c) => next.add(c.id));
        return next;
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCampaignTag = (tag: string) => {
    setCampaignTags((prev) =>
      prev.some((t) => t.toLowerCase() === tag.toLowerCase())
        ? prev.filter((t) => t.toLowerCase() !== tag.toLowerCase())
        : [...prev, tag]
    );
  };

  const handleSaveContact = async () => {
    if ((!form.firstName.trim() && !form.lastName.trim()) || !form.phone.trim()) {
      setError('First or last name and phone are required.');
      return;
    }
    setError('');
    const tags = form.tags.split(/[,|]/).map((t) => t.trim()).filter(Boolean);
    const payload = {
      ...form,
      dob: normalizeDobInput(form.dob),
      name: buildContactNameFromParts(form),
      tags,
    };
    try {
      if (editContact) {
        await updateContact(editContact.id, payload);
        setMessage('Contact updated');
      } else {
        await createContact(payload);
        setMessage('Contact added');
      }
      setShowAdd(false);
      setEditContact(null);
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const handleBulkAddTag = async () => {
    const tags = bulkTagInput.split(/[,|]/).map((t) => t.trim()).filter(Boolean);
    if (!selectedIds.size || !tags.length) {
      setError('Select contacts and enter at least one tag.');
      return;
    }
    setBulkWorking(true);
    setError('');
    try {
      const result = await bulkAddTagsToContacts([...selectedIds], tags);
      setMessage(result.message);
      setBulkTagInput('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk tag failed');
    } finally {
      setBulkWorking(false);
    }
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  const handleCallSelected = async () => {
    if (!selectedIds.size) return;
    const agentLabel = selectedAgent?.name ?? 'default agent';
    if (!window.confirm(`Queue AI calls for ${selectedIds.size} contact(s) using ${agentLabel}?`)) return;
    setBulkWorking(true);
    setError('');
    try {
      const result = await callSelectedContacts([...selectedIds], selectedAgentId || undefined);
      setMessage(
        `Calls: ${result.placed} placed, ${result.queued} queued, ${result.skipped} skipped` +
          (result.errors.length ? ` (${result.errors.length} errors)` : '')
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk call failed');
    } finally {
      setBulkWorking(false);
    }
  };

  const handleCallByTags = async () => {
    if (!campaignTags.length) {
      setError('Select at least one tag for the campaign.');
      return;
    }
    const agentLabel = selectedAgent?.name ?? 'default agent';
    if (
      !window.confirm(
        `Run AI calls for ${campaignMatchCount} contact(s) with tag(s): ${campaignTags.join(', ')} using ${agentLabel}?`
      )
    ) {
      return;
    }
    setCampaignCalling(true);
    setError('');
    try {
      const result = await callContactsByTags(campaignTags, selectedAgentId || undefined);
      setMessage(
        `Tag campaign: ${result.placed} placed, ${result.queued} queued, ${result.skipped} skipped` +
          (result.errors.length ? ` (${result.errors.length} errors)` : '')
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tag campaign failed');
    } finally {
      setCampaignCalling(false);
    }
  };

  const handleToggleDnd = async (contact: Contact) => {
    try {
      await setContactDnd(contact.id, !contact.dnd);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'DND update failed');
    }
  };

  const openCallModal = (contact: Contact) => {
    if (contact.dnd) {
      setError('Contact is on DND — calls are disabled.');
      return;
    }
    setError('');
    setCallModalContact(contact);
  };

  const handleConfirmCall = async () => {
    if (!callModalContact) return;
    setCallingId(callModalContact.id);
    setError('');
    try {
      const result = await callContact(callModalContact.id, selectedAgentId || undefined);
      setMessage(result.message);
      setCallModalContact(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Call failed');
    } finally {
      setCallingId(null);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await saveContactsConfig(config);
      setConfig(res.config);
      setMessage('Tag automation saved');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingConfig(false);
    }
  };

  const openEdit = (c: Contact) => {
    setEditContact(c);
    setForm({
      firstName: c.firstName ?? '',
      middleName: c.middleName ?? '',
      lastName: c.lastName ?? '',
      phone: c.phone,
      phoneAlt: c.phoneAlt ?? '',
      email: c.email ?? '',
      dob: formatDobDDMMYYYY(c.dob) === '—' ? (c.dob ?? '') : formatDobDDMMYYYY(c.dob),
      address: c.address ?? '',
      postcode: c.postcode ?? '',
      company: c.company ?? '',
      notes: c.notes ?? '',
      tags: c.tags.join(', '),
    });
    setShowAdd(true);
  };

  const pageStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(page * pageSize, total);

  return (
    <div>
      <Header
        title="Contacts"
        subtitle="CRM"
        onRefresh={load}
        actions={
          <div className="flex gap-2">
            <button onClick={() => { setShowExcelImport(true); setEditContact(null); }} className="btn-secondary text-xs">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Import Excel
            </button>
            <button
              onClick={() => {
                setShowAdd(true);
                setEditContact(null);
                setForm(EMPTY_FORM);
              }}
              className="btn-primary text-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Add contact
            </button>
          </div>
        }
      />

      <div className="space-y-6 p-8">
        {callReadiness && !callReadiness.ready && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
            <p className="font-semibold text-amber-200">Calls are not ready — &quot;Call now&quot; will fail until this is fixed:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-100/90">
              {callReadiness.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-amber-200/80">
              Fix in{' '}
              <Link to="/gateway" className="underline hover:text-white">
                Connections (Gateway)
              </Link>{' '}
              and{' '}
              <Link to="/agents" className="underline hover:text-white">
                AI Agents (Publish)
              </Link>
              . On Render, set <span className="font-mono">TWILIO_ACCOUNT_SID</span>,{' '}
              <span className="font-mono">TWILIO_AUTH_TOKEN</span>, and{' '}
              <span className="font-mono">TWILIO_PHONE_NUMBER</span> in Environment variables.
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total contacts" value={stats.total} icon={Users} accent="cyan" />
          <StatCard label="Tagged" value={stats.withTags} icon={Tag} accent="violet" />
          <StatCard label="Called" value={stats.called} icon={PhoneCall} accent="emerald" />
          <StatCard
            label="Auto-call"
            value={stats.autoCallOnTag ? 'On' : 'Off'}
            icon={Zap}
            accent={stats.autoCallOnTag ? 'emerald' : 'pink'}
          />
        </div>

        <div className="glass-card border border-accent-violet/20 p-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[200px] flex-1">
              <p className="mb-2 text-sm font-bold text-white">Tag → auto call (like GHL)</p>
              <p className="text-xs text-slate-500">
                When a contact receives the trigger tag, an AI call is queued automatically (10 min dedupe per contact).
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={config.autoCallOnTag}
                onChange={(e) => setConfig((c) => ({ ...c, autoCallOnTag: e.target.checked }))}
                className="rounded border-white/20"
              />
              Enable
            </label>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">Trigger tag</label>
              <input
                value={config.callTriggerTag}
                onChange={(e) => setConfig((c) => ({ ...c, callTriggerTag: e.target.value }))}
                placeholder="call-now"
                className="input-field w-40"
              />
            </div>
            <button onClick={handleSaveConfig} disabled={savingConfig} className="btn-primary text-xs">
              {savingConfig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Save
            </button>
          </div>
        </div>

        <div className="glass-card border border-accent-cyan/20 p-5">
          <p className="text-sm font-bold text-white">AI call campaign by tags</p>
          <p className="mt-1 text-xs text-slate-500">
            Select one or more tags — AI calls run only for contacts that have any of those tags.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {allTags.length ? (
              allTags.map((t) => {
                const active = campaignTags.some((x) => x.toLowerCase() === t.toLowerCase());
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleCampaignTag(t)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      active
                        ? 'bg-accent-cyan/25 text-accent-cyan ring-1 ring-accent-cyan/40'
                        : 'bg-white/10 text-slate-400 hover:bg-white/15 hover:text-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                );
              })
            ) : (
              <span className="text-xs text-slate-600">No tags yet — add tags to contacts first.</span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-400">
              {campaignTags.length
                ? `${campaignMatchCount} contact(s) match selected tag(s)`
                : 'Select tags above'}
            </span>
            <div className="flex items-center gap-2">
              <Bot className="h-3.5 w-3.5 text-slate-500" />
              <AgentSelect
                agents={agents}
                value={selectedAgentId}
                onChange={setSelectedAgentId}
                className="min-w-[220px]"
              />
            </div>
            <button
              onClick={handleCallByTags}
              disabled={!campaignTags.length || !campaignMatchCount || campaignCalling || !agents.length}
              className="btn-primary text-xs"
            >
              {campaignCalling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PhoneCall className="h-3.5 w-3.5" />
              )}
              Run AI calls for selected tags
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Quick search across all fields…"
              className="input-field pl-10"
            />
          </div>
          <select
            value={filterField}
            onChange={(e) => setFilterField(e.target.value as ContactFilterField)}
            className="input-field w-48"
          >
            {CONTACT_FILTER_FIELDS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
          <input
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            placeholder={`Filter by ${CONTACT_FILTER_FIELDS.find((f) => f.id === filterField)?.label ?? 'field'}…`}
            className="input-field min-w-[200px] flex-1"
          />
          <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="input-field w-44">
            <option value="">All tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent-violet/25 bg-accent-violet/10 px-4 py-3">
            <span className="text-sm font-medium text-white">{selectedIds.size} selected</span>
            <input
              value={bulkTagInput}
              onChange={(e) => setBulkTagInput(e.target.value)}
              placeholder="Tag to add (comma for multiple)"
              className="input-field min-w-[200px] flex-1"
            />
            <button onClick={handleBulkAddTag} disabled={bulkWorking} className="btn-secondary text-xs">
              {bulkWorking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Tag className="h-3.5 w-3.5" />}
              Add tag to selected
            </button>
            <div className="flex items-center gap-2">
              <Bot className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <AgentSelect
                agents={agents}
                value={selectedAgentId}
                onChange={setSelectedAgentId}
                className="min-w-[200px]"
              />
            </div>
            <button onClick={handleCallSelected} disabled={bulkWorking || !agents.length} className="btn-primary text-xs">
              {bulkWorking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Phone className="h-3.5 w-3.5" />}
              Call selected
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-400 hover:text-white">
              Clear selection
            </button>
          </div>
        )}

        {message && (
          <div className="flex items-center gap-2 rounded-xl border border-accent-emerald/20 bg-accent-emerald/10 px-4 py-2 text-sm text-accent-emerald">
            <CheckCircle2 className="h-4 w-4" /> {message}
            <button onClick={() => setMessage('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            <AlertCircle className="h-4 w-4" /> {error}
            <button onClick={() => setError('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
          </div>
        ) : contacts.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No contacts found"
            description="Add contacts manually, import an Excel file, or adjust your filters."
            action={
              <button onClick={() => setShowAdd(true)} className="btn-primary">
                <Plus className="h-4 w-4" /> Add contact
              </button>
            }
          />
        ) : (
          <div className="glass-card overflow-hidden p-1">
            <DualScrollTable minWidth={TABLE_MIN_WIDTH}>
              <table className="w-full text-left text-sm" style={{ minWidth: TABLE_MIN_WIDTH }}>
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                    <th className="sticky left-0 z-10 w-10 bg-surface-900/95 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
                        }}
                        onChange={toggleSelectAll}
                        className="rounded border-white/20"
                        title="Select all on this page"
                      />
                    </th>
                    <th className="whitespace-nowrap px-3 py-3">First name</th>
                    <th className="whitespace-nowrap px-3 py-3">Middle name</th>
                    <th className="whitespace-nowrap px-3 py-3">Last name</th>
                    <th className="whitespace-nowrap px-3 py-3">Contact Id</th>
                    <th className="whitespace-nowrap px-3 py-3">Created at</th>
                    <th className="whitespace-nowrap px-3 py-3">Date of birth</th>
                    <th className="whitespace-nowrap px-3 py-3">Email</th>
                    <th className="whitespace-nowrap px-3 py-3">Phone number</th>
                    <th className="whitespace-nowrap px-3 py-3">Phone (alt)</th>
                    <th className="whitespace-nowrap px-3 py-3">Address</th>
                    <th className="whitespace-nowrap px-3 py-3">Postcode</th>
                    <th className="whitespace-nowrap px-3 py-3">Tags</th>
                    <th className="whitespace-nowrap px-3 py-3">Calls</th>
                    <th className="whitespace-nowrap px-3 py-3">Last called</th>
                    <th className="whitespace-nowrap px-3 py-3">DND</th>
                    <th className="sticky right-0 z-10 whitespace-nowrap bg-surface-900/95 px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr
                      key={c.id}
                      className={`border-b border-white/5 transition hover:bg-white/[0.02] ${
                        selectedIds.has(c.id) ? 'bg-accent-violet/5' : ''
                      }`}
                    >
                      <td className="sticky left-0 z-10 bg-surface-900/95 px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          className="rounded border-white/20"
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {c.firstName ? (
                          <Link
                            to={`/conversations/${c.id}`}
                            className="font-medium text-accent-cyan transition hover:text-accent-cyan/80 hover:underline"
                            title="View profile & conversations"
                          >
                            {c.firstName}
                          </Link>
                        ) : (
                          <span className="text-white">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-300">{c.middleName || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-white">{c.lastName || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-400">{c.id}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-400">{formatCreatedAt(c.createdAt)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-300">{formatDobDDMMYYYY(c.dob)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-300">{c.email || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-300">{c.phone}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">{c.phoneAlt || '—'}</td>
                      <td className="max-w-[200px] truncate px-3 py-2.5 text-slate-400" title={c.address}>{c.address || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-300">{c.postcode || '—'}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex max-w-[140px] flex-wrap gap-1">
                          {c.tags.length ? (
                            c.tags.map((t) => (
                              <span
                                key={t}
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  t.toLowerCase() === config.callTriggerTag.toLowerCase()
                                    ? 'bg-accent-cyan/20 text-accent-cyan'
                                    : 'bg-white/10 text-slate-400'
                                }`}
                              >
                                {t}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-600">—</span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">{c.callCount}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500">
                        {c.lastCalledAt ? formatCreatedAt(c.lastCalledAt) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => handleToggleDnd(c)}
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
                            c.dnd
                              ? 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30'
                              : 'bg-white/10 text-slate-500 hover:bg-white/15'
                          }`}
                          title={c.dnd ? 'DND on — click to disable' : 'Click to enable DND'}
                        >
                          {c.dnd ? 'ON' : 'OFF'}
                        </button>
                      </td>
                      <td className="sticky right-0 z-10 bg-surface-900/95 px-3 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openCallModal(c)}
                            disabled={callingId === c.id || c.dnd}
                            className="rounded-lg bg-accent-emerald/15 p-2 text-accent-emerald hover:bg-accent-emerald/25 disabled:opacity-40"
                            title={c.dnd ? 'DND enabled' : 'Call now'}
                          >
                            {callingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                          </button>
                          <button onClick={() => openEdit(c)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" title="Edit">
                            <User className="h-4 w-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm(`Delete ${displayName(c)}?`)) return;
                              await deleteContact(c.id);
                              await load();
                            }}
                            className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DualScrollTable>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
              <p className="text-xs text-slate-400">
                Showing {pageStart}–{pageEnd} of {total} contacts
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-slate-400">
                  Per page
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value) as PageSizeOption)}
                    className="input-field w-20 py-1 text-xs"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="btn-secondary px-3 py-1 text-xs disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="btn-secondary px-3 py-1 text-xs disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setShowAdd(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="glass-card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white">{editContact ? 'Edit contact' : 'New contact'}</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <input placeholder="First name *" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className="input-field" />
                <input placeholder="Middle name" value={form.middleName} onChange={(e) => setForm((f) => ({ ...f, middleName: e.target.value }))} className="input-field" />
                <input placeholder="Last name *" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className="input-field" />
                <input placeholder="Phone number *" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="input-field" />
                <input placeholder="Phone (alternative)" value={form.phoneAlt} onChange={(e) => setForm((f) => ({ ...f, phoneAlt: e.target.value }))} className="input-field" />
                <input placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="input-field" />
                <input placeholder="DOB (DD/MM/YYYY)" value={form.dob} onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))} className="input-field" />
                <input placeholder="Postcode" value={form.postcode} onChange={(e) => setForm((f) => ({ ...f, postcode: e.target.value }))} className="input-field sm:col-span-2" />
                <input placeholder="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="input-field sm:col-span-3" />
                <input placeholder="Company" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} className="input-field sm:col-span-3" />
                <input placeholder="Tags (comma separated)" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} className="input-field sm:col-span-3" />
                <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="input-field min-h-[80px] sm:col-span-3" />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleSaveContact} className="btn-primary">Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showExcelImport && (
          <ExcelImportModal
            onClose={() => setShowExcelImport(false)}
            onImported={(msg) => {
              setMessage(msg);
              void load();
            }}
            onError={setError}
          />
        )}

        {callModalContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => !callingId && setCallModalContact(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              className="glass-card w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Call contact</h3>
                <button
                  onClick={() => setCallModalContact(null)}
                  disabled={!!callingId}
                  className="text-slate-400 hover:text-white disabled:opacity-40"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="mb-4 text-sm text-slate-400">
                Calling{' '}
                <span className="font-medium text-white">{displayName(callModalContact)}</span>
                {' · '}
                <span className="font-mono text-accent-cyan">{callModalContact.phone}</span>
              </p>

              <label className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                <Bot className="h-3.5 w-3.5" />
                AI agent
              </label>
              <AgentSelect
                agents={agents}
                value={selectedAgentId}
                onChange={setSelectedAgentId}
                className="mb-4 w-full text-sm"
              />
              {selectedAgent && (
                <p className="mb-4 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-400">
                  Workflow: <span className="text-slate-300">{selectedAgent.workflow}</span>
                  {' · '}
                  Voice: <span className="text-slate-300">{selectedAgent.tts}</span>
                  {' · '}
                  Status:{' '}
                  <span className={selectedAgent.status === 'published' ? 'text-accent-emerald' : 'text-amber-400'}>
                    {selectedAgent.status}
                  </span>
                </p>
              )}

              <button
                onClick={handleConfirmCall}
                disabled={!!callingId || !agents.length}
                className="btn-primary w-full"
              >
                {callingId === callModalContact.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Phone className="h-4 w-4" />
                )}
                {callingId === callModalContact.id ? 'Calling…' : 'Start AI call'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}