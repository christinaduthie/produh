import { Router } from 'express';
import { q, SQL } from '../db/index.js';


const r = Router();


r.post('/enhance/priority', async (req,res)=>{
const { productId } = req.body;
const backlog = (await q(SQL.BACKLOG_SELECT_LATEST, [productId])).rows[0];
// Simple prioritization: stories tagged with leading KPI get higher score
const stories = backlog.json.stories || [];
const ranked = stories.map((s:any)=>({ s, score: (s.tags||[]).some((t:string)=>t.startsWith('kpi:')) ? 5 : 3 }))
.sort((a:any,b:any)=>b.score-a.score);
res.json({ ranked: ranked.map((r:any)=>({ title: r.s.title, score: r.score })) });
});


export default r;
