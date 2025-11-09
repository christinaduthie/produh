import { Router } from 'express';
import { ENV } from '../config/env.js';


const r = Router();


r.post('/test', async (req,res)=>{
const { integration } = req.body as { integration: string };
// For hackathon: just report env presence; in real life, call a WhoAmI endpoint.
const ok = (()=>{
switch(integration){
case 'jira': return !!ENV.ATLASSIAN.TOKEN;
case 'confluence': return !!ENV.ATLASSIAN.TOKEN;
case 'graph': return !!(ENV.MS.CLIENT_ID && ENV.MS.CLIENT_SECRET);
default: return false;
}
})();
res.json({ integration, ok });
});


export default r;