import type { Contact } from '../../api/contacts';
import { displayName, formatCreatedAt, formatDobDDMMYYYY } from '../../utils/contactDisplay';

function DetailItem({ label, value }: { label: string; value: string }) {
  if (!value || value === '—') return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm text-slate-200">{value}</p>
    </div>
  );
}

export function ContactProfileDetails({ contact }: { contact: Contact }) {
  return (
    <div className="border-b border-white/10 bg-white/[0.02] px-5 py-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DetailItem label="Full name" value={displayName(contact)} />
        <DetailItem label="First name" value={contact.firstName?.trim() || '—'} />
        <DetailItem label="Middle name" value={contact.middleName?.trim() || '—'} />
        <DetailItem label="Last name" value={contact.lastName?.trim() || '—'} />
        <DetailItem label="Contact ID" value={contact.id} />
        <DetailItem label="Phone" value={contact.phone} />
        <DetailItem label="Phone (alt)" value={contact.phoneAlt?.trim() || '—'} />
        <DetailItem label="Email" value={contact.email?.trim() || '—'} />
        <DetailItem label="Date of birth" value={formatDobDDMMYYYY(contact.dob)} />
        <DetailItem label="Address" value={contact.address?.trim() || '—'} />
        <DetailItem label="Postcode" value={contact.postcode?.trim() || '—'} />
        <DetailItem label="Company" value={contact.company?.trim() || '—'} />
        <DetailItem label="Source" value={contact.source} />
        <DetailItem label="Created" value={formatCreatedAt(contact.createdAt)} />
        <DetailItem label="Last called" value={contact.lastCalledAt ? formatCreatedAt(contact.lastCalledAt) : '—'} />
        <DetailItem label="Total calls" value={String(contact.callCount)} />
      </div>

      {contact.tags.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Tags</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {contact.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {contact.notes?.trim() && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Notes</p>
          <p className="mt-1.5 whitespace-pre-wrap rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-300">
            {contact.notes.trim()}
          </p>
        </div>
      )}
    </div>
  );
}