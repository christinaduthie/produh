import { Router } from 'express';


const r = Router();


r.post('/refresh', async (_req,res)=>{
res.json({ tiles: [
{ kpi: 'Weekly Active Teams', value: 54, target: 80 },
{ kpi: 'Incidents', value: 1, target: 0 },
{ kpi: 'Cycle Time (days)', value: 3.2, target: 2.5 }
]});
});


export default r;