# Deploy Lagnaa to Render (free)

One server runs the **API + React app** together in production.

## Before you start

1. Push this project to **GitHub** (private repo is fine).
2. Copy your local `.env` values — you will paste them into Render.
3. Default login on first deploy: `admin@datacrew.ai` / `admin123` (change after login).

## Option A — Blueprint (recommended)

1. Go to [render.com](https://render.com) and sign up.
2. **New → Blueprint**.
3. Connect your GitHub repo.
4. Render reads `render.yaml` and creates the **lagnaa** web service.
5. When prompted, fill in secret env vars:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
   - `GROQ_API_KEY` (optional)
   - `GOOGLE_PLACES_API_KEY` (optional, for Maps Lead Finder)
6. Click **Apply**. First deploy takes ~3–5 minutes.

## Option B — Manual web service

1. **New → Web Service** → connect GitHub repo.
2. Settings:

   | Field | Value |
   |-------|--------|
   | Runtime | Node |
   | Region | Singapore (closest to India) |
   | Branch | `main` |
   | Build Command | `npm ci && npm run build` |
   | Start Command | `npm start` |
   | Plan | Free |

3. **Environment variables:**

   | Key | Value |
   |-----|--------|
   | `NODE_ENV` | `production` |
   | `ENABLE_TUNNEL` | `false` |
   | `TWILIO_ACCOUNT_SID` | your value |
   | `TWILIO_AUTH_TOKEN` | your value |
   | `TWILIO_PHONE_NUMBER` | your value |
   | `GROQ_API_KEY` | your value (optional) |
   | `GOOGLE_PLACES_API_KEY` | your value (optional) |

4. **Health Check Path:** `/api/health`
5. Deploy.

## After deploy

Your app URL will look like:

`https://lagnaa.onrender.com`

- Open that URL in a browser → login page.
- Webhook URL for Twilio is set **automatically** via `RENDER_EXTERNAL_URL`.
- In Twilio Console, set voice webhook to:
  `https://YOUR-APP.onrender.com/api/twilio/voice/incoming`

## Auto-updates

Connect GitHub in Render → every `git push` to your main branch:

1. Runs `npm ci && npm run build`
2. Restarts the server with new code

No manual upload needed after the first setup.

## Free tier limits (important)

| Limit | What it means |
|-------|----------------|
| **Sleeps after 15 min idle** | First visit after idle takes ~1 min to wake |
| **750 hours/month** | Enough for testing, not 24/7 all month |
| **No persistent disk** | Data in `server/data/` resets on redeploy/restart |
| **Voice calls** | May miss calls while server is asleep — upgrade to paid ($7/mo) for always-on |

## Upgrade when ready

Render Dashboard → your service → **Upgrade** to Starter ($7/mo):

- Always on (no sleep)
- Better for Twilio voice calls
- Optional persistent disk for data

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails | Check Render logs; ensure Node 20+ |
| Login fails | Wait for deploy to finish; check `/api/health` returns `{"ok":true}` |
| Maps shows few results | Add `GOOGLE_PLACES_API_KEY` + enable **Places API (New)** in Google Cloud |
| Voice calls fail | Server may be asleep (free tier) or Twilio webhook URL wrong |
| Custom domain | Render → Settings → Custom Domains, then set `PUBLIC_WEBHOOK_URL` |

## Local vs cloud

| | Local (`npm run dev`) | Render |
|--|----------------------|--------|
| Frontend | Vite :5173 | Served from `dist/` |
| API | :3001 | Same port (Render sets `PORT`) |
| Tunnel | ngrok/localtunnel | Not needed |
| Webhook URL | ngrok | `RENDER_EXTERNAL_URL` auto |