import { Router } from 'express';
import { q, SQL } from '../db/index.js';
import { runStrategyGate } from '../orchestrator/strategy.js';
import { confluenceCreatePage } from '../integrations/atlassian.js';


const r = Router();


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
const page = await confluenceCreatePage(process.env.ATLASSIAN_CONFLUENCE_SPACE_KEY!, 'Solution v✅', html);
await q(SQL.SOLUTION_UPDATE_CONFLUENCE, [page.id, id]);
res.json({ id, pass: !!gate.eval?.pass, page });
});


export default r;
