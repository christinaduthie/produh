import { Router } from 'express';
import { q, SQL } from '../db/index.js';
import { createBrief } from '../orchestrator/strategy.js';
import { confluenceCreatePage, confluenceGetPage, confluenceUpdatePage } from '../integrations/atlassian.js';
import { ENV } from '../config/env.js';
import { geminiJSON } from '../ai/gemini.js';
import { DiscoveryIdeasPrompt, ProblemStatementPrompt } from '../ai/prompts.js';
import { v4 as uuid } from 'uuid';

const r = Router();

const parseJsonField = <T>(value: any, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
};

async function latestBrief(productId: string) {
  const row = (await q(SQL.BRIEF_SELECT_LATEST, [productId])).rows[0];
  if (!row) return null;
  return {
    ...row,
    pains: parseJsonField(row.pains, []),
    personas: parseJsonField(row.personas, []),
    kpi_candidates: parseJsonField(row.kpi_candidates, []),
    html: row.html || ''
  };
}

function renderBriefHtml(brief: any) {
  return `<h2>Problem Brief</h2>
<p>${brief.summary}</p>
<h3>Pains</h3>
<ul>${(brief.pains || []).map((p:any)=>`<li>${p.text || p}</li>`).join('')}</ul>
<h3>Personas</h3>
<p>${(brief.personas || []).join(', ')}</p>
<h3>KPIs (candidates)</h3>
<ul>${(brief.kpiCandidates || []).map((k:any)=>`<li><b>${k.name}</b> (${k.type}) — ${k.definition} [${k.unit}]</li>`).join('')}</ul>`;
}

r.post('/problem-brief', async (req,res)=>{
  const { productId } = req.body;
  const signals = (await q(SQL.SIGNAL_SELECT_FOR_PRODUCT, [productId])).rows;
  const { id, brief } = await createBrief(productId, signals);
  const html = renderBriefHtml(brief);
  await q(SQL.BRIEF_UPDATE_HTML, [html, id]);
  const page = await confluenceCreatePage(process.env.ATLASSIAN_CONFLUENCE_SPACE_KEY!, 'Problem Brief v1', html);
  await q(SQL.BRIEF_UPDATE_CONFLUENCE, [page.id, id]);
  res.json({ id, page });
});

r.get('/problem-brief/:productId', async (req,res)=>{
  const { productId } = req.params;
  const brief = await latestBrief(productId);
  if (!brief) return res.status(404).json({ error: 'No brief' });
  const storedHtml = brief.html || '';
  if (!brief.confluence_page_id) return res.json({ brief, html: storedHtml, confluence: null });
  try {
    const page = await confluenceGetPage(brief.confluence_page_id);
    const html = page?.body?.storage?.value || storedHtml;
    const link = `${ENV.ATLASSIAN.BASE_URL}/wiki${page?._links?.webui || ''}`;
    const version = page?.version?.number || 1;
    const title = page?.title || 'Problem Brief';
    return res.json({ brief, html, confluence: { id: brief.confluence_page_id, link, html, version, title } });
  } catch (err) {
    return res.json({ brief, html: storedHtml, confluence: null });
  }
});

r.put('/problem-brief/:productId', async (req,res)=>{
  const { productId } = req.params;
  const { html } = req.body as { html?: string };
  if (!html) return res.status(400).json({ error: 'Missing html payload' });
  const brief = await latestBrief(productId);
  if (!brief?.confluence_page_id) return res.status(404).json({ error: 'No Confluence page' });
  try {
    const page = await confluenceGetPage(brief.confluence_page_id);
    const title = page?.title || 'Problem Brief';
    const version = page?.version?.number || 1;
    const updated = await confluenceUpdatePage(brief.confluence_page_id, title, html, version);
    await q(SQL.BRIEF_UPDATE_HTML, [html, brief.id]);
    return res.json({ ok: true, page: updated });
  } catch (err) {
    return res.status(502).json({ error: 'Failed to update Confluence page' });
  }
});

r.post('/brainstorm', async (req,res)=>{
  const { productId, nIdeas: requested } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId required' });
  const brief = await latestBrief(productId);
  if (!brief) return res.status(400).json({ error: 'No brief found. Generate one first.' });
  const nIdeas = Math.min(Math.max(Number(requested) || 5, 1), 10);
  const resp = await geminiJSON(DiscoveryIdeasPrompt, {
    brief: briefToText(brief),
    nIdeas
  });
  res.json({ ideas: resp?.ideas || [] });
});

r.post('/problem-statement', async (req,res)=>{
  const { productId, ideas } = req.body;
  if (!productId || !Array.isArray(ideas) || ideas.length === 0) {
    return res.status(400).json({ error: 'productId and ideas[] required' });
  }
  const brief = await latestBrief(productId);
  if (!brief) return res.status(400).json({ error: 'No brief found. Generate one first.' });
  const productRow = (await q('SELECT name FROM product WHERE id=$1', [productId])).rows[0];
  const productName = productRow?.name || 'Product';
  const payload = {
    summary: brief.summary,
    selectedIdeas: ideas
  };
  const resp = await geminiJSON(ProblemStatementPrompt, payload);
  const statement = resp?.statement || '';
  if (!statement) return res.status(502).json({ error: 'LLM did not return a statement' });
  const html = `<h2>Problem Statement</h2><p>${statement}</p>`;
  const titleBase = `Problem statement_${productName}`;
  const title = `${titleBase}_${new Date().toISOString().split('T')[0]}`;
  let page = null;
  try {
    page = await confluenceCreatePage(process.env.ATLASSIAN_CONFLUENCE_SPACE_KEY!, title, html);
  } catch (err) {
    page = null;
  }
  const id = uuid();
  await q(SQL.PROBLEM_STATEMENT_INSERT, [id, productId, statement, html, page?.id || null]);
  res.json({ statement, page });
});

function briefToText(brief: any) {
  const pains = (brief.pains || []).map((p: any) => `- ${p.text || p}`).join('\n');
  const personas = (brief.personas || []).join(', ');
  const kpis = (brief.kpi_candidates || [])
    .map((k: any) => `- ${k.name || k.slug || ''}: ${k.definition || ''}`)
    .join('\n');
  return [
    `Summary: ${brief.summary || ''}`,
    pains ? `Pains:\n${pains}` : '',
    personas ? `Personas: ${personas}` : '',
    kpis ? `KPI candidates:\n${kpis}` : ''
  ].filter(Boolean).join('\n\n');
}

export default r;
