import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  Loader2,
  Mail,
  MessageCircle,
  PhoneCall,
  Search,
  ShieldOff,
  ShieldCheck,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { EmptyState } from '../components/ui/EmptyState';
import { ContactProfileDetails } from '../components/contacts/ContactProfileDetails';
import { ContactGdprPanel } from '../components/contacts/ContactGdprPanel';
import {
  getContactConversations,
  getContacts,
  setContactDnd,
  type Contact,
  type ContactConversation,
} from '../api/contacts';
import { displayName, formatCreatedAt } from '../utils/contactDisplay';

const CHANNEL_ICON = {
  Voice: PhoneCall,
  WhatsApp: MessageCircle,
  Email: Mail,
} as const;

const CHANNEL_COLOR = {
  Voice: 'text-accent-emerald',
  WhatsApp: 'text-accent-cyan',
  Email: 'text-accent-violet',
} as const;

export function Conversations() {
  const { contactId: routeContactId } = useParams();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(routeContactId ?? null);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [conversations, setConversations] = useState<ContactConversation[]>([]);
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [error, setError] = useState('');
  const [dndSaving, setDndSaving] = useState(false);

  const loadContacts = useCallback(async () => {
    setLoadingContacts(true);
    try {
      const { contacts: list } = await getContacts({ all: true });
      setContacts(list);
    } catch {
      setError('Failed to load contacts');
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  const loadConversations = useCallback(async (contactId: string) => {
    setLoadingConversations(true);
    setError('');
    try {
      const data = await getContactConversations(contactId);
      setActiveContact(data.contact);
      setContacts((prev) => {
        const exists = prev.some((c) => c.id === data.contact.id);
        if (!exists) return [...prev, data.contact];
        return prev.map((c) => (c.id === data.contact.id ? data.contact : c));
      });
      setConversations(data.conversations);
      setSelectedConvoId(data.conversations[0]?.id ?? null);
    } catch {
      setActiveContact(null);
      setConversations([]);
      setSelectedConvoId(null);
      setError('Failed to load conversations');
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    if (routeContactId) {
      setSelectedId(routeContactId);
      return;
    }
    if (contacts.length) {
      navigate(`/conversations/${contacts[0].id}`, { replace: true });
    }
  }, [routeContactId, contacts, navigate]);

  useEffect(() => {
    if (selectedId) void loadConversations(selectedId);
  }, [selectedId, loadConversations]);

  const selectContact = (id: string) => {
    setSelectedId(id);
    navigate(`/conversations/${id}`);
  };

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        displayName(c).toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        c.id.toLowerCase().includes(q)
    );
  }, [contacts, search]);

  const selectedContact =
    (selectedId && activeContact?.id === selectedId ? activeContact : null) ??
    contacts.find((c) => c.id === selectedId);
  const selectedConvo = conversations.find((c) => c.id === selectedConvoId);

  const toggleDnd = async () => {
    if (!selectedContact) return;
    setDndSaving(true);
    try {
      const res = await setContactDnd(selectedContact.id, !selectedContact.dnd);
      setActiveContact(res.contact);
      setContacts((prev) => prev.map((c) => (c.id === res.contact.id ? res.contact : c)));
    } catch {
      setError('Could not update DND');
    } finally {
      setDndSaving(false);
    }
  };

  return (
    <div>
      <Header title="Conversations" subtitle="All channels per contact" onRefresh={loadContacts} />

      <div className="flex h-[calc(100vh-5rem)] min-h-[520px] gap-0 p-6 pt-4">
        {/* Contact list */}
        <div className="glass-card flex w-full max-w-sm shrink-0 flex-col overflow-hidden border-r-0 rounded-r-none">
          <div className="border-b border-white/10 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contacts…"
                className="input-field pl-10 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingContacts ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-accent-cyan" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <p className="p-4 text-center text-sm text-slate-500">No contacts found</p>
            ) : (
              filteredContacts.map((c) => {
                const active = c.id === selectedId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectContact(c.id)}
                    className={`flex w-full items-start gap-3 border-b border-white/5 px-4 py-3 text-left transition ${
                      active ? 'bg-accent-cyan/10' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-white">
                      {(c.firstName || c.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-white">{displayName(c)}</p>
                        {c.dnd && (
                          <span className="shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-300">
                            DND
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-slate-500">{c.phone}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Conversation panel */}
        <div className="glass-card flex min-w-0 flex-1 flex-col overflow-hidden rounded-l-none">
          {!selectedContact && !loadingConversations ? (
            <EmptyState
              icon={MessageCircle}
              title={routeContactId ? 'Contact not found' : 'Select a contact'}
              description={
                routeContactId
                  ? 'This contact may have been deleted. Pick another contact from the list.'
                  : 'Choose a contact on the left to view their profile and conversation history across voice, WhatsApp, and email.'
              }
            />
          ) : loadingConversations && !selectedContact ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
            </div>
          ) : selectedContact ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{displayName(selectedContact)}</h2>
                  <p className="text-xs text-slate-500">
                    {selectedContact.phone}
                    {selectedContact.email ? ` · ${selectedContact.email}` : ''}
                  </p>
                </div>
                <button
                  onClick={toggleDnd}
                  disabled={dndSaving}
                  className={`btn-secondary text-xs ${selectedContact.dnd ? 'border-red-500/30 text-red-300' : ''}`}
                >
                  {dndSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : selectedContact.dnd ? (
                    <ShieldOff className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                  {selectedContact.dnd ? 'DND on — tap to disable' : 'Enable DND'}
                </button>
              </div>

              <ContactProfileDetails contact={selectedContact} />

              <ContactGdprPanel
                contact={selectedContact}
                onUpdated={(updated) => {
                  setActiveContact(updated);
                  setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
                }}
              />

              {selectedContact.dnd && (
                <div className="flex items-center gap-2 border-b border-red-500/20 bg-red-500/10 px-5 py-2 text-xs text-red-200">
                  <ShieldOff className="h-3.5 w-3.5" />
                  DND active — no AI calls, emails, or WhatsApp will be sent to this contact.
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 border-b border-red-500/20 bg-red-500/10 px-5 py-2 text-sm text-red-300">
                  <AlertCircle className="h-4 w-4" /> {error}
                </div>
              )}

              <div className="flex min-h-0 flex-1">
                {/* Conversation list */}
                <div className="w-72 shrink-0 overflow-y-auto border-r border-white/10">
                  {loadingConversations ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-accent-cyan" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <p className="p-4 text-center text-xs text-slate-500">No conversations yet</p>
                  ) : (
                    conversations.map((convo) => {
                      const Icon = CHANNEL_ICON[convo.channel];
                      const active = convo.id === selectedConvoId;
                      return (
                        <button
                          key={convo.id}
                          type="button"
                          onClick={() => setSelectedConvoId(convo.id)}
                          className={`w-full border-b border-white/5 px-4 py-3 text-left transition ${
                            active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={`h-3.5 w-3.5 ${CHANNEL_COLOR[convo.channel]}`} />
                            <span className="text-xs font-semibold text-white">{convo.channel}</span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] text-slate-400">{convo.summary}</p>
                          <p className="mt-1 text-[10px] text-slate-600">{formatCreatedAt(convo.time)}</p>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Messages */}
                <div className="flex min-w-0 flex-1 flex-col">
                  {!selectedConvo ? (
                    <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
                      Select a conversation
                    </div>
                  ) : (
                    <>
                      <div className="border-b border-white/10 px-5 py-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className={`font-semibold ${CHANNEL_COLOR[selectedConvo.channel]}`}>
                            {selectedConvo.channel}
                          </span>
                          <span className="text-slate-600">·</span>
                          <span className="text-slate-400">{selectedConvo.status}</span>
                          <span className="text-slate-600">·</span>
                          <span className="text-slate-400">{selectedConvo.outcome}</span>
                          {selectedConvo.campaignName && (
                            <>
                              <span className="text-slate-600">·</span>
                              <span className="text-slate-500">{selectedConvo.campaignName}</span>
                            </>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{selectedConvo.summary}</p>
                      </div>
                      <div className="flex-1 space-y-3 overflow-y-auto p-5">
                        {selectedConvo.messages.map((msg, i) => (
                          <div
                            key={i}
                            className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
                              msg.role === 'user'
                                ? 'ml-auto bg-accent-cyan/15 text-slate-200'
                                : msg.role === 'assistant'
                                  ? 'bg-white/10 text-slate-300'
                                  : 'bg-white/[0.04] text-slate-500 italic'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <p className="mt-1 text-[10px] opacity-60">
                              {msg.role === 'user' ? 'Customer' : msg.role === 'assistant' ? 'Mia' : 'System'}
                              {msg.timestamp ? ` · ${formatCreatedAt(msg.timestamp)}` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}