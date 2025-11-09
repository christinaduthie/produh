import { Router } from 'express';
import { q, SQL } from '../db/index.js';
import { createBrief } from '../orchestrator/strategy.js';
import { confluenceCreatePage } from '../integrations/atlassian.js';
import fs from 'fs';
import path from 'path';

const r = Router();

// ---- NEW: serve Phase-1 artifacts (PRD + Evidence) ----
const ROOT = path.resolve(process.cwd());

r.get('/prd', (_req, res) => {
  const p = path.join(ROOT, 'out', 'prd_v0_draft.md');
  if (!fs.existsSync(p)) return res.status(404).json({ error: 'PRD not found. Run scripts/phase1_summarize.mjs' });
  res.type('text/markdown').send(fs.readFileSync(p, 'utf8'));
});

r.get('/evidence', (_req, res) => {
  const p = path.join(ROOT, 'out', 'evidence_matrix.json');
  if (!fs.existsSync(p)) return res.status(404).json({ error: 'Evidence not found. Run scripts/phase1_summarize.mjs' });
  res.json(JSON.parse(fs.readFileSync(p, 'utf8')));
});
// ------------------------------------------------------

// Existing: synthesize a problem brief and push to Confluence
r.post('/problem-brief', async (req, res) => {
  const { productId } = req.body;
  const signals = (await q(SQL.SIGNAL_SELECT_FOR_PRODUCT, [productId])).rows;

  const { id, brief } = await createBrief(productId, signals);

  const html = `<h2>Problem Brief</h2>
<p>${brief.summary}</p>
<h3>Pains</h3>
<ul>${brief.pains.map((p: any) => `<li>${p.text}</li>`).join('')}</ul>
<h3>Personas</h3>
<p>${brief.personas.join(', ')}</p>
<h3>KPIs (candidates)</h3>
<ul>${brief.kpiCandidates
    .map((k: any) => `<li><b>${k.name}</b> (${k.type}) — ${k.definition} [${k.unit}]</li>`)
    .join('')}</ul>`;

  const page = await confluenceCreatePage(
    process.env.ATLASSIAN_CONFLUENCE_SPACE_KEY!,
    'Problem Brief v1',
    html
  );

  await q(SQL.BRIEF_UPDATE_CONFLUENCE, [page.id, id]);
  res.json({ id, page });
});

export default r;
