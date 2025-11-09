import { Router } from 'express';
import { q, SQL } from '../db/index.js';
import { createBrief } from '../orchestrator/strategy.js';
import { confluenceCreatePage } from '../integrations/atlassian.js';


const r = Router();


r.post('/problem-brief', async (req,res)=>{
const { productId } = req.body;
const signals = (await q(SQL.SIGNAL_SELECT_FOR_PRODUCT, [productId])).rows;
const { id, brief } = await createBrief(productId, signals);
const html = `<h2>Problem Brief</h2>
<p>${brief.summary}</p>
<h3>Pains</h3>
<ul>${brief.pains.map((p:any)=>`<li>${p.text}</li>`).join('')}</ul>
<h3>Personas</h3>
<p>${brief.personas.join(', ')}</p>
<h3>KPIs (candidates)</h3>
<ul>${brief.kpiCandidates.map((k:any)=>`<li><b>${k.name}</b> (${k.type}) — ${k.definition} [${k.unit}]</li>`).join('')}</ul>`;
const page = await confluenceCreatePage(process.env.ATLASSIAN_CONFLUENCE_SPACE_KEY!, 'Problem Brief v1', html);
await q(SQL.BRIEF_UPDATE_CONFLUENCE, [page.id, id]);
res.json({ id, page });
});


export default r;
