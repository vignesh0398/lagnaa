import './bootstrapEnv.js';
import http from 'http';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { attachConversationRelay } from './ai/conversationRelay.js';
import twilioRoutes from './routes/twilio.js';
import voiceRoutes from './routes/voice.js';
import aiRoutes from './routes/ai.js';
import agentsRoutes from './routes/agents.js';
import dashboardRoutes from './routes/dashboard.js';
import promptsRoutes from './routes/prompts.js';
import teamRoutes from './routes/team.js';
import knowledgeRoutes from './routes/knowledge.js';
import whatsappRoutes from './routes/whatsapp.js';
import emailRoutes from './routes/email.js';
import analyticsRoutes from './routes/analytics.js';
import integrationsRoutes from './routes/integrations.js';
import billingRoutes from './routes/billing.js';
import ghlRoutes from './routes/ghl.js';
import seoRoutes from './routes/seo.js';
import marketingRoutes from './routes/marketing.js';
import socialStudioRoutes from './routes/socialStudio.js';
import contactsRoutes from './routes/contacts.js';
import prospectsRoutes from './routes/prospects.js';
import mapsLeadsRoutes from './routes/mapsLeads.js';
import newsRoutes from './routes/news.js';
import { getWebhookBaseUrl, startTunnel } from './tunnel.js';
import { loadedSecretFiles } from './bootstrapEnv.js';
import { isMongoConfigured } from './db/mongoTeam.js';
import {
  getMongoInitError,
  initTeamStore,
  isTeamPersistenceDurable,
  getTeamPersistenceMode,
} from './teamStore.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/social-generated', express.static(path.join(process.cwd(), 'public', 'social-generated')));

app.use((req, _res, next) => {
  if (req.path.includes('/voice/') || req.path.includes('/whatsapp/') || req.path.includes('/email/')) {
    console.log(`[Webhook] ${req.method} ${req.path}`, JSON.stringify(req.body).slice(0, 200));
  }
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'lagnaa-api',
    teamPersistence: getTeamPersistenceMode(),
    teamDataDurable: isTeamPersistenceDurable(),
    mongodbEnvSet: isMongoConfigured(),
    secretEnvFilesLoaded: loadedSecretFiles,
    mongodbError: getMongoInitError(),
  });
});

app.use('/api/twilio', twilioRoutes);
app.use('/api/twilio/voice', voiceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/prompts', promptsRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/ghl', ghlRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/social', socialStudioRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/prospects', prospectsRoutes);
app.use('/api/maps-leads', mapsLeadsRoutes);
app.use('/api/news', newsRoutes);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '..', 'dist');

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const server = http.createServer(app);
attachConversationRelay(server);

async function startServer(): Promise<void> {
  await initTeamStore();
  server.listen(PORT, async () => {
    console.log(`Lagnaa API running on port ${PORT}`);
    console.log(`[Team] Persistence: ${getTeamPersistenceMode()} (durable=${isTeamPersistenceDurable()})`);
    if (process.env.NODE_ENV === 'production' && !isTeamPersistenceDurable()) {
      console.warn('[Team] Live team accounts reset on each Render redeploy unless MONGODB_URI or DATA_DIR is set.');
    }
    if (process.env.NODE_ENV === 'production') {
      const base = getWebhookBaseUrl();
      if (base) console.log(`Public URL: ${base}`);
    }
    await startTunnel(PORT);
  });
}

startServer().catch((error) => {
  console.error('Failed to start Lagnaa API:', error);
  process.exit(1);
});