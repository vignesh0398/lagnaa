import type { ClientBrandingInput, TopicImageContent, CarouselSlide } from './socialImageTypes.js';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clientFooter(branding: ClientBrandingInput, width: number): string {
  if (!branding.includeBranding || !branding.clientName?.trim()) return '';
  const name = esc(branding.clientName.trim());
  const logo = branding.clientLogoUrl?.trim();
  const logoHtml = logo
    ? `<img src="${esc(logo)}" alt="" style="width:44px;height:44px;object-fit:contain;border-radius:8px;" />`
    : `<div style="width:44px;height:44px;border-radius:10px;background:rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;">${name.charAt(0)}</div>`;

  return `
    <div class="client-bar">
      ${logoHtml}
      <span class="client-name">${name}</span>
    </div>`;
}

function baseStyles(c: TopicImageContent, w: number, h: number): string {
  const p = c.palette;
  return `
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      width:${w}px; height:${h}px;
      font-family:'Plus Jakarta Sans',system-ui,sans-serif;
      background:${p.background};
      color:#f1f5f9;
      overflow:hidden;
      position:relative;
    }
    .bg-glow {
      position:absolute; inset:0;
      background:
        radial-gradient(ellipse 70% 55% at 15% 20%, ${p.accent}33, transparent 55%),
        radial-gradient(ellipse 60% 50% at 90% 85%, ${p.secondary}44, transparent 50%);
    }
    .content { position:relative; z-index:2; height:100%; display:flex; flex-direction:column; padding:56px 64px 80px; }
    h1 { font-size:clamp(32px,4.5vw,52px); font-weight:800; line-height:1.1; letter-spacing:-0.03em; }
    h2 { font-size:clamp(22px,3vw,34px); font-weight:700; line-height:1.2; }
    p.sub { font-size:20px; color:#94a3b8; margin-top:12px; line-height:1.4; }
    .accent-bar { width:80px; height:5px; border-radius:99px; background:linear-gradient(90deg,${p.accent},${p.secondary}); margin:20px 0 28px; }
    ul { list-style:none; }
    ul li { font-size:19px; line-height:1.45; margin-bottom:14px; padding-left:28px; position:relative; color:#cbd5e1; }
    ul li::before { content:'✓'; position:absolute; left:0; color:${p.accent}; font-weight:800; }
    .client-bar {
      position:absolute; bottom:28px; right:40px; z-index:5;
      display:flex; align-items:center; gap:12px;
      padding:10px 16px; border-radius:14px;
      background:rgba(15,23,42,0.75); border:1px solid rgba(255,255,255,0.1);
    }
    .client-name { font-size:15px; font-weight:700; color:#e2e8f0; }
    .slide-num { font-size:13px; font-weight:700; letter-spacing:0.15em; text-transform:uppercase; color:${p.accent}; margin-bottom:16px; }
  `;
}

function wrapHtml(body: string, c: TopicImageContent, w: number, h: number, branding: ClientBrandingInput): string {
  return `<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet"/>
    <style>${baseStyles(c, w, h)}</style>
  </head><body>
    <div class="bg-glow"></div>
    ${body}
    ${clientFooter(branding, w)}
  </body></html>`;
}

function templateGraphic(c: TopicImageContent, branding: ClientBrandingInput, w: number, h: number): string {
  const kw = (c.keywords ?? []).slice(0, 5).map((k) => `<span class="kw">${esc(k)}</span>`).join('');
  const bullets = (c.bullets ?? []).slice(0, 4).map((b) => `<li>${esc(b)}</li>`).join('');
  const body = `
    <div class="content" style="justify-content:center;">
      <p class="slide-num">${esc(c.visualMood ?? 'Topic visual')}</p>
      <h1>${esc(c.title)}</h1>
      <div class="accent-bar"></div>
      ${c.subtitle ? `<p class="sub">${esc(c.subtitle)}</p>` : ''}
      ${c.bodyText ? `<p style="font-size:22px;margin-top:20px;line-height:1.45;max-width:90%;">${esc(c.bodyText)}</p>` : ''}
      <ul style="margin-top:28px;">${bullets}</ul>
      <div style="margin-top:32px;display:flex;flex-wrap:wrap;gap:10px;">${kw}</div>
    </div>
    <style>.kw{padding:8px 14px;border-radius:99px;background:${c.palette.accent}22;border:1px solid ${c.palette.accent}55;font-size:14px;font-weight:600;color:${c.palette.accent};}</style>`;
  return wrapHtml(body, c, w, h, branding);
}

function templateInfographic(c: TopicImageContent, branding: ClientBrandingInput, w: number, h: number): string {
  const stats = (c.stats ?? []).slice(0, 3).map((s) => `
    <div class="stat"><div class="val">${esc(s.value)}</div><div class="lbl">${esc(s.label)}</div></div>`).join('');
  const bullets = (c.bullets ?? []).slice(0, 5).map((b) => `<li>${esc(b)}</li>`).join('');
  const body = `
    <div class="content">
      <h1>${esc(c.title)}</h1>
      <div class="accent-bar"></div>
      <div class="stats">${stats}</div>
      <ul style="margin-top:24px;">${bullets}</ul>
    </div>
    <style>
      .stats{display:flex;gap:20px;margin-top:8px;}
      .stat{flex:1;padding:20px;border-radius:16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);}
      .val{font-size:36px;font-weight:800;color:${c.palette.accent};}
      .lbl{font-size:13px;color:#94a3b8;margin-top:6px;text-transform:uppercase;letter-spacing:0.08em;}
    </style>`;
  return wrapHtml(body, c, w, h, branding);
}

function templateChecklist(c: TopicImageContent, branding: ClientBrandingInput, w: number, h: number): string {
  const items = (c.checklistItems ?? []).slice(0, 8).map((item, i) => `
    <div class="check-item"><span class="num">${i + 1}</span><span>${esc(item)}</span></div>`).join('');
  const body = `
    <div class="content">
      <p class="slide-num">Cheat sheet</p>
      <h1>${esc(c.title)}</h1>
      <div class="accent-bar"></div>
      <div class="checks">${items}</div>
    </div>
    <style>
      .checks{display:flex;flex-direction:column;gap:12px;margin-top:8px;}
      .check-item{display:flex;align-items:flex-start;gap:14px;font-size:18px;line-height:1.4;padding:14px 16px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);}
      .num{width:28px;height:28px;border-radius:8px;background:${c.palette.accent};color:#fff;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    </style>`;
  return wrapHtml(body, c, w, h, branding);
}

function templateBrandGraphics(c: TopicImageContent, branding: ClientBrandingInput, w: number, h: number): string {
  const showClient = branding.includeBranding && branding.clientName;
  const body = `
    <div class="content" style="justify-content:center;align-items:center;text-align:center;">
      ${showClient && branding.clientLogoUrl ? `<img src="${esc(branding.clientLogoUrl)}" style="width:100px;height:100px;object-fit:contain;margin-bottom:28px;" />` : ''}
      <h1 style="font-size:clamp(36px,5vw,58px);">${esc(c.highlightText ?? c.title)}</h1>
      <div class="accent-bar" style="margin:24px auto;"></div>
      <p style="font-size:24px;max-width:85%;line-height:1.45;color:#cbd5e1;">${esc(c.bodyText ?? c.subtitle ?? '')}</p>
    </div>`;
  return wrapHtml(body, c, w, h, { ...branding, includeBranding: !showClient ? branding.includeBranding : false });
}

function templateBeforeAfter(c: TopicImageContent, branding: ClientBrandingInput, w: number, h: number): string {
  const col = (title: string, items: string[], cls: string) => `
    <div class="${cls}">
      <h3>${esc(title)}</h3>
      ${items.slice(0, 4).map((i) => `<div class="row">${esc(i)}</div>`).join('')}
    </div>`;
  const body = `
    <div class="content">
      <h1>${esc(c.title)}</h1>
      <div class="accent-bar"></div>
      <div class="cols">
        ${col(c.beforeTitle ?? 'Before', c.beforeItems ?? [], 'before')}
        ${col(c.afterTitle ?? 'After', c.afterItems ?? [], 'after')}
      </div>
    </div>
    <style>
      .cols{display:flex;gap:24px;margin-top:12px;flex:1;}
      .before,.after{flex:1;padding:24px;border-radius:16px;}
      .before{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);}
      .after{background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);}
      h3{font-size:18px;font-weight:800;margin-bottom:16px;text-transform:uppercase;letter-spacing:0.1em;}
      .before h3{color:#f87171;} .after h3{color:#34d399;}
      .row{font-size:17px;line-height:1.4;margin-bottom:12px;color:#cbd5e1;padding-left:16px;border-left:3px solid rgba(255,255,255,0.15);}
    </style>`;
  return wrapHtml(body, c, w, h, branding);
}

function templateQuote(c: TopicImageContent, branding: ClientBrandingInput, w: number, h: number): string {
  const body = `
    <div class="content" style="justify-content:center;">
      <p style="font-size:120px;line-height:0.6;color:${c.palette.accent};opacity:0.5;">"</p>
      <h1 style="font-size:clamp(28px,4vw,44px);font-weight:700;font-style:italic;line-height:1.35;max-width:92%;">
        ${esc(c.quote ?? c.title)}
      </h1>
      <div class="accent-bar"></div>
      <p class="sub">— ${esc(c.quoteAuthor ?? '')}</p>
    </div>`;
  return wrapHtml(body, c, w, h, branding);
}

function templateTextGraphics(c: TopicImageContent, branding: ClientBrandingInput, w: number, h: number): string {
  const body = `
    <div class="content" style="justify-content:center;">
      ${c.title ? `<p class="slide-num">${esc(c.title)}</p>` : ''}
      <h1 style="font-size:clamp(40px,6vw,72px);text-transform:uppercase;letter-spacing:-0.02em;background:linear-gradient(135deg,#fff,${c.palette.accent});-webkit-background-clip:text;background-clip:text;color:transparent;">
        ${esc(c.highlightText ?? c.title)}
      </h1>
      <div class="accent-bar"></div>
      <p style="font-size:26px;line-height:1.4;max-width:90%;color:#94a3b8;">${esc(c.bodyText ?? '')}</p>
    </div>`;
  return wrapHtml(body, c, w, h, branding);
}

function templateCarouselSlide(
  slide: CarouselSlide,
  index: number,
  total: number,
  c: TopicImageContent,
  branding: ClientBrandingInput,
  w: number,
  h: number
): string {
  const bullets = (slide.bullets ?? []).slice(0, 4).map((b) => `<li>${esc(b)}</li>`).join('');
  const body = `
    <div class="content">
      <p class="slide-num">Slide ${index + 1} / ${total}</p>
      <h2>${esc(slide.title)}</h2>
      <div class="accent-bar"></div>
      <p style="font-size:22px;line-height:1.5;color:#cbd5e1;max-width:95%;">${esc(slide.body)}</p>
      ${bullets ? `<ul style="margin-top:24px;">${bullets}</ul>` : ''}
    </div>`;
  return wrapHtml(body, c, w, h, branding);
}

export function buildImageHtml(
  content: TopicImageContent,
  branding: ClientBrandingInput,
  width: number,
  height: number,
  slide?: { slide: CarouselSlide; index: number; total: number }
): string {
  if (content.style === 'carousel' && slide) {
    return templateCarouselSlide(slide.slide, slide.index, slide.total, content, branding, width, height);
  }

  switch (content.style) {
    case 'infographic':
      return templateInfographic(content, branding, width, height);
    case 'checklist':
      return templateChecklist(content, branding, width, height);
    case 'brand_graphics':
      return templateBrandGraphics(content, branding, width, height);
    case 'before_after':
      return templateBeforeAfter(content, branding, width, height);
    case 'typographic_quote':
      return templateQuote(content, branding, width, height);
    case 'text_graphics':
      return templateTextGraphics(content, branding, width, height);
    case 'carousel':
      return templateCarouselSlide(
        content.slides?.[0] ?? { title: content.title, body: content.bodyText ?? content.topic },
        0,
        content.slides?.length ?? 1,
        content,
        branding,
        width,
        height
      );
    default:
      return templateGraphic(content, branding, width, height);
  }
}