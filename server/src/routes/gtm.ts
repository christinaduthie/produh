import { Router } from 'express';
import PptxGenJS from 'pptxgenjs';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { q, SQL } from '../db/index.js';
import { getLatestSolution } from '../services/strategySolution.js';
import { createUniqueConfluencePage } from '../utils/confluence.js';
import { confluenceAttach } from '../integrations/atlassian.js';
import { ENV } from '../config/env.js';

const r = Router();

const MERMAID_PLACEHOLDER =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HwAFgwJ/l1vH3gAAAABJRU5ErkJggg==';

type Audience = 'Executive' | 'Engineering' | 'General';

r.post('/release-notes', async (req, res) => {
  const { productId } = req.body as { productId?: string };
  if (!productId) return res.status(400).json({ error: 'productId required' });
  const ctx = await buildGtmContext(productId);
  const execHtml = renderReleaseNotes(ctx, 'Executive');
  const engHtml = renderReleaseNotes(ctx, 'Engineering');
  const summary = summarizeContext(ctx);
  const confluence: Record<string, any> = {};

  if (canUseConfluence()) {
    const space = process.env.ATLASSIAN_CONFLUENCE_SPACE_KEY!;
    try {
      confluence.executive = await createUniqueConfluencePage(space, `${ctx.slug}_release_exec`, execHtml);
    } catch (err) {
      confluence.executive = { error: friendlyErr(err) };
    }
    try {
      confluence.engineering = await createUniqueConfluencePage(space, `${ctx.slug}_release_eng`, engHtml);
    } catch (err) {
      confluence.engineering = { error: friendlyErr(err) };
    }
  }

  const channelName = `${ctx.slug}-launch`;
  const teamsStatus = `Simulated: created #${channelName} and posted kickoff summary (${summary.features} features, ${summary.stories} stories).`;

  return res.json({
    notes: {
      executive: { html: execHtml, page: confluence.executive },
      engineering: { html: engHtml, page: confluence.engineering }
    },
    summary,
    communications: {
      teams: {
        channel: `#${channelName}`,
        message: teamsStatus,
        simulated: true
      }
    }
  });
});

r.post('/decks', async (req, res) => {
  const { productId } = req.body as { productId?: string };
  if (!productId) return res.status(400).json({ error: 'productId required' });
  const ctx = await buildGtmContext(productId);
  const audiences: Audience[] = ['Executive', 'Engineering', 'General'];
  const decks: Array<{ audience: Audience; filename: string; base64: string; slideCount: number; filePath: string }> = [];

  for (const audience of audiences) {
    const deck = await buildDeck(audience, ctx);
    decks.push(deck);
  }

  type DeckPageRef = { id: string; link: string; error?: string };
  let deckPage: DeckPageRef | null = null;
  if (canUseConfluence()) {
    const space = process.env.ATLASSIAN_CONFLUENCE_SPACE_KEY!;
    try {
      const html = renderDeckSummaryHtml(ctx, decks);
      const page = await createUniqueConfluencePage(space, `${ctx.slug}_deck_bundle`, html);
      deckPage = { id: page.id, link: page.link };
      for (const deck of decks) {
        try {
          await confluenceAttach(page.id, deck.filename, Buffer.from(deck.base64, 'base64'));
        } catch (err) {
          const prev = deckPage || { id: 'n/a', link: '' };
          deckPage = { ...prev, error: friendlyErr(err) };
          break;
        }
      }
    } catch (err) {
      deckPage = { id: 'n/a', link: '', error: friendlyErr(err) };
    }
  }

  const legacyFile = decks.find((d) => d.audience === 'Executive')?.filePath || decks[0]?.filePath;

  res.json({
    decks: decks.map((deck) => ({
      audience: deck.audience,
      filename: deck.filename,
      base64: deck.base64,
      slideCount: deck.slideCount,
      file: deck.filePath,
      confluencePage: deckPage
    })),
    files: decks.map((deck) => ({ audience: deck.audience, path: deck.filePath })),
    file: legacyFile,
    summary: summarizeContext(ctx)
  });
});

r.post('/comms', async (req, res) => {
  const { productId, links } = req.body as {
    productId?: string;
    links?: { release?: string; decks?: string };
  };
  if (!productId) return res.status(400).json({ error: 'productId required' });
  const ctx = await buildGtmContext(productId);
  const summary = summarizeContext(ctx);
  const releaseLink = links?.release || 'Release notes pending publish';
  const deckLink = links?.decks || 'Deck bundle pending publish';

  const teamsMessage = [
    `Launch update for ${ctx.product?.name || 'product'} · ${summary.features} features / ${summary.stories} stories`,
    `Exec release notes: ${releaseLink}`,
    `Decks: ${deckLink}`,
    `KPIs: ${summary.metrics?.primary || 0} primary · ${summary.metrics?.leading || 0} leading`
  ].join('\n');

  const email = {
    subject: `${ctx.product?.code || ctx.product?.name || 'Product'} launch comms`,
    body: [
      `Hi stakeholders,`,
      '',
      `We're wrapping up the ${ctx.product?.name || 'product'} launch.`,
      `Features ready: ${summary.features}. Stories shipped: ${summary.stories}.`,
      `Exec release notes: ${releaseLink}`,
      `Deck bundle (Exec/Eng/General): ${deckLink}`,
      '',
      'Reply with questions – this is a simulated Outlook draft.'
    ].join('\n'),
    simulated: true
  };

  res.json({
    teamsMessage,
    outlookEmail: email,
    summary,
    simulated: true
  });
});

export default r;

async function buildGtmContext(productId: string) {
  const productRow = (await q('SELECT * FROM product WHERE id=$1', [productId])).rows[0];
  const solution = await getLatestSolution(productId);
  const backlogRow = (await q(SQL.BACKLOG_SELECT_LATEST, [productId])).rows[0];
  const planRow = (await q(SQL.DEV_PLAN_SELECT_LATEST, [productId])).rows[0];

  return {
    product: productRow,
    solution,
    backlog: backlogRow ? parseJson(backlogRow.json, {}) : {},
    plan: planRow ? parseJson(planRow.plan_json, {}) : {},
    slug: (productRow?.code || productRow?.name || 'product')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'product'
  };
}

function summarizeContext(ctx: Awaited<ReturnType<typeof buildGtmContext>>) {
  const features = Array.isArray(ctx.backlog?.features) ? ctx.backlog.features.length : 0;
  const storiesFromPlan = Array.isArray(ctx.plan?.stories) ? ctx.plan.stories.length : 0;
  const storiesFromBacklog = Array.isArray(ctx.backlog?.stories) ? ctx.backlog.stories.length : 0;
  return {
    features,
    stories: storiesFromPlan || storiesFromBacklog,
    kpis: ctx.solution?.spec?.pillars?.length || 0,
    metrics: {
      primary: ctx.solution?.kpis?.length || 0,
      leading: ctx.solution?.goals?.length || 0
    }
  };
}

function renderReleaseNotes(
  ctx: Awaited<ReturnType<typeof buildGtmContext>>,
  audience: 'Executive' | 'Engineering'
) {
  const stories = Array.isArray(ctx.plan?.stories) ? ctx.plan.stories : [];
  const highlights = stories.slice(0, 5).map(
    (story: any) =>
      `<li><strong>${story.title || 'Story'}</strong> — ${story.description || 'Details TBD'}${
        audience === 'Engineering' && story.tasks?.length
          ? `<br/><em>Tasks:</em> ${story.tasks.map((t: any) => t.title).join(', ')}`
          : ''
      }</li>`
  );
  const metrics =
    (ctx.solution?.kpis || [])
      .map((k: any) => `<tr><td>${k.name}</td><td>${k.target || '-'}</td><td>${k.unit || '-'}</td></tr>`)
      .join('') || '<tr><td colspan="3">Pending KPI targets</td></tr>';
  const engAppendix =
    audience === 'Engineering'
      ? `<h3>QA & Rollout</h3><p>${(ctx.plan?.qaChecklist || []).join(', ') || 'QA checklist pending.'}</p>`
      : '';

  return `<h2>${audience} Release Notes — ${ctx.product?.name || 'Product'}</h2>
  <p>${ctx.solution?.spec?.overview || 'Launch summary pending strategy solution.'}</p>
  <h3>Highlights</h3>
  <ul>${highlights.join('') || '<li>Backlog sync pending.</li>'}</ul>
  <h3>KPIs</h3>
  <table>
    <thead><tr><th>Name</th><th>Target</th><th>Unit</th></tr></thead>
    <tbody>${metrics}</tbody>
  </table>
  ${engAppendix}
  <p><em>Generated ${new Date().toLocaleString()}</em></p>`;
}

async function buildDeck(audience: Audience, ctx: Awaited<ReturnType<typeof buildGtmContext>>) {
  const pptx = new PptxGenJS();
  pptx.title = `${ctx.product?.name || 'Product'} ${audience} Launch`;
  let slideCount = 0;
  const addSlide = () => {
    slideCount += 1;
    return pptx.addSlide();
  };
  const stories = Array.isArray(ctx.plan?.stories) ? ctx.plan.stories : [];
  const tableRows = stories.slice(0, 5).map((story: any, idx: number) => [
    idx + 1,
    story.title || 'Story',
    story.tasks?.length || 0,
    story.acceptance?.length || 0
  ]);

  const intro = addSlide();
  intro.addText(`${ctx.product?.name || 'Product'} GTM`, { x: 0.5, y: 0.5, fontSize: 32, bold: true });
  intro.addText(`${audience} briefing`, { x: 0.5, y: 1.5, fontSize: 20 });
  intro.addText(ctx.solution?.spec?.overview || 'Strategy overview pending.', { x: 0.5, y: 2.2, w: 9, fontSize: 16 });

  const tableSlide = addSlide();
  tableSlide.addText('Story readiness', { x: 0.5, y: 0.5, fontSize: 20, bold: true });
  tableSlide.addTable(
    [['#', 'Story', 'Tasks', 'Acceptance'], ...tableRows],
    {
      x: 0.5,
      y: 1.1,
      w: 9,
      fontSize: 14,
      border: { type: 'solid', pt: 1, color: '666666' }
    }
  );

  const mermaidSlide = addSlide();
  mermaidSlide.addText('Rollout flow (Mermaid)', { x: 0.5, y: 0.4, fontSize: 20, bold: true });
  const mermaidText =
    ctx.solution?.spec?.rolloutPlan
      ?.map((phase: any, idx: number) => `Phase${idx}[${phase.phase || 'Phase'}]:::phase`)
      .join(' --> ') || 'graph LR; Idea-->Build; Build-->Launch;';
  mermaidSlide.addText(mermaidText, { x: 0.5, y: 1.1, w: 4.5, fontSize: 12, color: '555555' });
  mermaidSlide.addImage({
    data: `data:image/png;base64,${MERMAID_PLACEHOLDER}`,
    x: 5.2,
    y: 1.1,
    w: 4,
    h: 3
  });

  const close = addSlide();
  close.addText('Key asks', { x: 0.5, y: 0.5, fontSize: 20, bold: true });
  close.addText(
    [
      `Features ready: ${summarizeContext(ctx).features}`,
      `Stories in flight: ${summarizeContext(ctx).stories}`,
      `Primary KPIs: ${summarizeContext(ctx).metrics?.primary}`
    ].join('\n'),
    { x: 0.5, y: 1.1, fontSize: 16 }
  );

  const raw = await pptx.write({ outputType: 'base64' });
  let base64: string;
  if (typeof raw === 'string') {
    base64 = raw;
  } else if (raw instanceof Uint8Array) {
    base64 = Buffer.from(raw).toString('base64');
  } else {
    base64 = Buffer.from(new Uint8Array(raw as ArrayBuffer)).toString('base64');
  }
  const filePath = await persistDeckFile(ctx.slug, audience, base64);
  return {
    audience,
    filename: `${ctx.product?.code || ctx.product?.name || 'product'}-${audience.toLowerCase()}-gtm.pptx`
      .replace(/\s+/g, '-'),
    base64,
    slideCount,
    filePath
  };
}

function renderDeckSummaryHtml(
  ctx: Awaited<ReturnType<typeof buildGtmContext>>,
  decks: Array<{ audience: Audience; filename: string }>
) {
  const list = decks
    .map((deck) => `<li><strong>${deck.audience}</strong> — ${deck.filename}</li>`)
    .join('');
  return `<h2>${ctx.product?.name || 'Product'} Deck Bundle</h2><p>Exec, Eng, and General variants generated via PptxGenJS.</p><ul>${list}</ul>`;
}

async function persistDeckFile(slug: string, audience: Audience, base64: string) {
  const dir = path.join(os.tmpdir(), 'produh-gtm');
  await fs.mkdir(dir, { recursive: true });
  const safeSlug = slug || 'product';
  const filePath = path.join(dir, `${safeSlug}-${audience.toLowerCase()}-${Date.now()}.pptx`);
  await fs.writeFile(filePath, Buffer.from(base64, 'base64'));
  return filePath;
}

function parseJson(value: any, fallback: any) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

function canUseConfluence() {
  return Boolean(
    ENV.ATLASSIAN.BASE_URL &&
      ENV.ATLASSIAN.EMAIL &&
      ENV.ATLASSIAN.TOKEN &&
      process.env.ATLASSIAN_CONFLUENCE_SPACE_KEY
  );
}

function friendlyErr(err: any) {
  if (err?.response?.data?.message) return err.response.data.message;
  return err?.message || 'Unknown error';
}
