import nodemailer from 'nodemailer';
import { applyTemplate } from './ai/emailCampaignStore.js';
import {
  getActiveEmailProvider,
  isEmailProviderConfigured,
  loadEmailProviderConfig,
} from './emailProviderStore.js';

function toHtmlBody(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#222;">${escaped.replace(/\n/g, '<br>')}</div>`;
}

async function sendViaSmtp(
  to: string,
  subject: string,
  text: string,
  html: string
): Promise<{ id: string; status: string }> {
  const config = loadEmailProviderConfig();
  const { host, port, secure, user, pass } = config.smtp;
  if (!host || !user || !pass) throw new Error('SMTP not configured (host, user, password required).');

  const transport = nodemailer.createTransport({
    host,
    port: port ?? 587,
    secure: secure ?? false,
    auth: { user, pass },
  });

  const info = await transport.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to,
    replyTo: config.replyTo || config.fromEmail,
    subject,
    text,
    html,
  });

  return { id: info.messageId ?? `smtp-${Date.now()}`, status: 'sent' };
}

async function sendViaResend(
  to: string,
  subject: string,
  text: string,
  html: string
): Promise<{ id: string; status: string }> {
  const config = loadEmailProviderConfig();
  if (!config.resend.apiKey) throw new Error('Resend API key not configured.');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resend.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: [to],
      reply_to: config.replyTo || config.fromEmail,
      subject,
      text,
      html,
    }),
  });

  const data = (await response.json()) as { id?: string; message?: string };
  if (!response.ok) throw new Error(data.message ?? 'Resend send failed');
  return { id: data.id ?? `resend-${Date.now()}`, status: 'sent' };
}

async function sendViaSendGrid(
  to: string,
  subject: string,
  text: string,
  html: string
): Promise<{ id: string; status: string }> {
  const config = loadEmailProviderConfig();
  if (!config.sendgrid.apiKey) throw new Error('SendGrid API key not configured.');

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.sendgrid.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: config.fromEmail, name: config.fromName },
      reply_to: { email: config.replyTo || config.fromEmail },
      subject,
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || 'SendGrid send failed');
  }

  return { id: `sg-${Date.now()}`, status: 'sent' };
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<{ id: string; status: string }> {
  const provider = getActiveEmailProvider();
  if (!isEmailProviderConfigured(provider)) {
    throw new Error(`Email provider "${provider}" not configured.`);
  }

  const html = toHtmlBody(body);
  if (provider === 'resend') return sendViaResend(to, subject, body, html);
  if (provider === 'sendgrid') return sendViaSendGrid(to, subject, body, html);
  return sendViaSmtp(to, subject, body, html);
}

export async function sendEmailTemplate(
  to: string,
  subjectTemplate: string,
  bodyTemplate: string,
  vars: Record<string, string>
): Promise<{ id: string; status: string }> {
  const subject = applyTemplate(subjectTemplate, vars);
  const body = applyTemplate(bodyTemplate, vars);
  return sendEmail(to, subject, body);
}

export async function testEmailConnection(): Promise<{ ok: boolean; message: string }> {
  const provider = getActiveEmailProvider();
  const config = loadEmailProviderConfig();
  if (!config.fromEmail) return { ok: false, message: 'From email is required.' };

  if (provider === 'smtp') {
    if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
      return { ok: false, message: 'SMTP host, user, and password are required.' };
    }
    try {
      const transport = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port ?? 587,
        secure: config.smtp.secure ?? false,
        auth: { user: config.smtp.user, pass: config.smtp.pass },
      });
      await transport.verify();
      return { ok: true, message: `SMTP connected — ${config.smtp.host}` };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'SMTP verify failed' };
    }
  }

  if (provider === 'resend') {
    if (!config.resend.apiKey) return { ok: false, message: 'Resend API key required.' };
    return { ok: true, message: 'Resend API key saved (send a test campaign to verify delivery).' };
  }

  if (!config.sendgrid.apiKey) return { ok: false, message: 'SendGrid API key required.' };
  return { ok: true, message: 'SendGrid API key saved (send a test campaign to verify delivery).' };
}