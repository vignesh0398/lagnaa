import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { Header } from '../components/layout/Header';

export function PrivacyPolicy() {
  return (
    <div>
      <Header title="Privacy" subtitle="GDPR information" />

      <div className="mx-auto max-w-3xl space-y-6 p-8 text-sm leading-relaxed text-slate-300">
        <div className="glass-card flex items-start gap-3 p-5">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-accent-violet" />
          <p>
            This page describes how <strong className="text-white">Lagnaa One</strong> (operated by DataCrew) handles personal
            data. Configure company details in <Link to="/settings/gdpr" className="text-accent-cyan hover:underline">GDPR Settings</Link>.
          </p>
        </div>

        <section className="glass-card space-y-3 p-5">
          <h2 className="text-lg font-bold text-white">What we collect</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Contact details (name, phone, email, address, date of birth when provided)</li>
            <li>Call, WhatsApp, and email conversation records</li>
            <li>Consent outcomes from AI outreach workflows</li>
            <li>Team member login accounts (admin-managed)</li>
          </ul>
        </section>

        <section className="glass-card space-y-3 p-5">
          <h2 className="text-lg font-bold text-white">Why we use it (lawful bases)</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong className="text-white">Consent</strong> — outreach and marketing where the person agreed</li>
            <li><strong className="text-white">Contract</strong> — delivering services the person requested</li>
            <li><strong className="text-white">Legitimate interest</strong> — CRM operations and follow-up, balanced against rights</li>
          </ul>
          <p>Record the legal basis per contact in Conversations → GDPR panel.</p>
        </section>

        <section className="glass-card space-y-3 p-5">
          <h2 className="text-lg font-bold text-white">Your rights</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong className="text-white">Access</strong> — export a contact&apos;s data (Subject Access Request)</li>
            <li><strong className="text-white">Erasure</strong> — remove personal data for a contact (right to be forgotten)</li>
            <li><strong className="text-white">Object / restrict</strong> — use DND or GDPR erase to stop outreach</li>
          </ul>
        </section>

        <section className="glass-card space-y-3 p-5">
          <h2 className="text-lg font-bold text-white">Processors we use</h2>
          <p>Data may be processed by: Render (hosting), MongoDB Atlas (team accounts), Twilio (voice), Groq (AI), and optional Google APIs for lead search.</p>
        </section>

        <section className="glass-card space-y-3 p-5">
          <h2 className="text-lg font-bold text-white">AI calls</h2>
          <p>
            GDPR erase and retention tools remove or anonymize <strong className="text-white">stored</strong> contact data.
            They do <strong className="text-white">not</strong> change AI agent scripts, prompts, or an call that is already in progress.
            New calls to erased contacts are blocked automatically.
          </p>
        </section>

        <p className="text-xs text-slate-500">
          Template summary — replace with your lawyer-approved policy for production use. Last updated June 2026.
        </p>
      </div>
    </div>
  );
}