let publicUrl: string | null =
  process.env.PUBLIC_WEBHOOK_URL?.trim() ||
  process.env.RENDER_EXTERNAL_URL?.trim() ||
  null;

export function getWebhookBaseUrl(): string | null {
  return publicUrl;
}

export function getRelayWebSocketUrl(): string | null {
  const base = getWebhookBaseUrl();
  if (!base) return null;
  const wsBase = base.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:');
  return `${wsBase}/api/twilio/voice/relay`;
}

export function setWebhookBaseUrl(url: string): void {
  publicUrl = url.replace(/\/$/, '');
}

async function startNgrok(port: number): Promise<string | null> {
  const token = process.env.NGROK_AUTHTOKEN;
  if (!token) return null;

  try {
    const ngrok = await import('@ngrok/ngrok');
    const listener = await ngrok.forward({ addr: port, authtoken: token });
    const url = listener.url();
    if (url) {
      publicUrl = url.replace(/\/$/, '');
      console.log(`\n🌐 Ngrok webhook URL (recommended): ${publicUrl}\n`);
      return publicUrl;
    }
  } catch (error) {
    console.warn('Ngrok failed:', error instanceof Error ? error.message : error);
  }
  return null;
}

async function startLocaltunnel(port: number): Promise<string | null> {
  try {
    const lt = (await import('localtunnel')).default;
    const tunnel = await lt({ port });
    publicUrl = tunnel.url;
    console.log(`\n🌐 Localtunnel URL (fallback): ${publicUrl}`);
    console.log('   If AI calls fail, add NGROK_AUTHTOKEN to .env for reliable webhooks.\n');

    tunnel.on('close', () => {
      publicUrl = null;
      console.warn('Tunnel closed — AI voice calls will not work until tunnel restarts.');
    });

    return publicUrl;
  } catch (error) {
    console.warn('Could not start localtunnel:', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function startTunnel(port: number): Promise<string | null> {
  if (publicUrl) {
    console.log(`Using webhook URL: ${publicUrl}`);
    return publicUrl;
  }

  if (process.env.ENABLE_TUNNEL === 'false' || process.env.NODE_ENV === 'production') {
    if (!publicUrl) {
      console.warn(
        'No public webhook URL. Set PUBLIC_WEBHOOK_URL or deploy to Render (uses RENDER_EXTERNAL_URL).'
      );
    }
    return null;
  }

  const ngrokUrl = await startNgrok(port);
  if (ngrokUrl) return ngrokUrl;

  return startLocaltunnel(port);
}