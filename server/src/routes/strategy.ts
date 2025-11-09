import { Router } from 'express';
import { q, SQL } from '../db/index.js';
import { runStrategyGate } from '../orchestrator/strategy.js';
import { createUniqueConfluencePage } from '../utils/confluence.js';
import { generateStrategySolution, getLatestSolution, strategySolutionHtml } from '../services/strategySolution.js';

const r = Router();

r.post('/develop', async (req,res)=>{
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId required' });
  try {
    const result = await generateStrategySolution(productId);
    res.json({ solution: result.solution, metrics: result.metrics });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to generate solution' });
  }
});

r.get('/latest', async (req,res)=>{
  const { productId } = req.query as { productId?: string };
  if (!productId) return res.status(400).json({ error: 'productId required' });
  const row = await getLatestSolution(productId);
  if (!row) return res.json({ solution: null });
  res.json({
    solution: row.spec,
    metrics: {
      primary: row.kpis,
      leading: row.goals
    },
    createdAt: row.created_at
  });
});

r.post('/publish', async (req,res)=>{
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId required' });
  const row = await getLatestSolution(productId);
  if (!row) return res.status(400).json({ error: 'Generate a solution first' });
  const html = strategySolutionHtml(row.spec, { primary: row.kpis, leading: row.goals });
  const productRow = (await q('SELECT name FROM product WHERE id=$1', [productId])).rows[0];
  const productName = productRow?.name || 'product';
  const normalized = productName.toLowerCase().replace(/\s+/g, '_');
  const page = await createUniqueConfluencePage(process.env.ATLASSIAN_CONFLUENCE_SPACE_KEY!, `solution_${normalized}`, html);
  await q(SQL.SOLUTION_UPDATE_CONFLUENCE, [page.id, row.id]);
  res.json({ page });
});

r.post('/run', async (req,res)=>{
  const { productId } = req.body;
  const brief = (await q(SQL.BRIEF_SELECT_LATEST, [productId])).rows[0];
  if (!brief) return res.status(400).json({ error: 'No brief' });
  const { id, res: gate } = await runStrategyGate(brief);
  const kpis = gate.proposal?.kpis || [];
  const goals = gate.proposal?.goals || [];
  const sol = gate.proposal?.solution || {};
  const scores = gate.eval?.scores || {};
  const html = `<h2>Solution v${gate.eval?.pass ? '✅' : '❌'}</h2>
<p>${sol.overview||''}</p>
<h3>KPIs</h3>
<ul>${kpis.map((k:any)=>`<li><b>${k.name}</b> → target: ${k.target ?? '-'} (${k.unit||''})</li>`).join('')}</ul>
<h3>Goals</h3>
<ul>${goals.map((g:any)=>`<li>${g.statement} (${g.deadline||''})</li>`).join('')}</ul>
<h3>Scores</h3>
<pre>${JSON.stringify(scores,null,2)}</pre>`;
  const page = await createUniqueConfluencePage(process.env.ATLASSIAN_CONFLUENCE_SPACE_KEY!, 'solution_gate', html);
  await q(SQL.SOLUTION_UPDATE_CONFLUENCE, [page.id, id]);
  res.json({ id, pass: !!gate.eval?.pass, page });
});

export default r;
