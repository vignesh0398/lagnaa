import fs from 'fs';
import path from 'path';

export type EmailProvider = 'smtp' | 'resend' | 'sendgrid';

export interface EmailProviderConfig {
  provider: EmailProvider;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  smtp: {
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    pass?: string;
  };
  resend: { apiKey?: string };
  sendgrid: { apiKey?: string };
}

const STORE_PATH = path.join(process.cwd(), 'server', 'data', 'email-provider.json');

const DEFAULT: EmailProviderConfig = {
  provider: 'smtp',
  fromEmail: '',
  fromName: 'Mia — Justizia Law',
  smtp: { host: 'smtp.gmail.com', port: 587, secure: false },
  resend: {},
  sendgrid: {},
};

let runtime: EmailProviderConfig | null = null;

export function loadEmailProviderConfig(): EmailProviderConfig {
  if (runtime) return runtime;
  if (fs.existsSync(STORE_PATH)) {
    runtime = { ...DEFAULT, ...JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8')) };
    runtime.smtp = { ...DEFAULT.smtp, ...runtime.smtp };
    runtime.resend = { ...runtime.resend };
    runtime.sendgrid = { ...runtime.sendgrid };
    return runtime;
  }
  runtime = { ...DEFAULT };
  return runtime;
}

export function saveEmailProviderConfig(updates: Partial<EmailProviderConfig>): EmailProviderConfig {
  const current = loadEmailProviderConfig();
  const next: EmailProviderConfig = {
    provider: updates.provider ?? current.provider,
    fromEmail: updates.fromEmail ?? current.fromEmail,
    fromName: updates.fromName ?? current.fromName,
    replyTo: updates.replyTo !== undefined ? updates.replyTo : current.replyTo,
    smtp: { ...current.smtp, ...updates.smtp },
    resend: { ...current.resend, ...updates.resend },
    sendgrid: { ...current.sendgrid, ...updates.sendgrid },
  };
  if (updates.smtp?.pass === '') delete next.smtp.pass;
  else if (updates.smtp?.pass) next.smtp.pass = updates.smtp.pass;
  if (updates.resend?.apiKey === '') delete next.resend.apiKey;
  else if (updates.resend?.apiKey) next.resend.apiKey = updates.resend.apiKey;
  if (updates.sendgrid?.apiKey === '') delete next.sendgrid.apiKey;
  else if (updates.sendgrid?.apiKey) next.sendgrid.apiKey = updates.sendgrid.apiKey;

  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(next, null, 2));
  runtime = next;
  return next;
}

export function maskSecret(s: string): string {
  if (s.length <= 8) return '••••••••';
  return `${s.slice(0, 4)}••••${s.slice(-4)}`;
}

export function isEmailProviderConfigured(provider: EmailProvider): boolean {
  const c = loadEmailProviderConfig();
  if (!c.fromEmail) return false;
  if (provider === 'smtp') return Boolean(c.smtp.host && c.smtp.user && c.smtp.pass);
  if (provider === 'resend') return Boolean(c.resend.apiKey);
  if (provider === 'sendgrid') return Boolean(c.sendgrid.apiKey);
  return false;
}

export function getActiveEmailProvider(): EmailProvider {
  return loadEmailProviderConfig().provider;
}