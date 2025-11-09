import { Router } from 'express';
import { teamsPostMessage } from '../integrations/msgraph.js';
import { ENV } from '../config/env.js';


const r = Router();


r.post('/create-channel', async (_req,res)=>{
// For hackathon demo, just post a message to existing channel
const msg = await teamsPostMessage(ENV.MS.TEAM_ID, ENV.MS.CHANNEL_ID, 'Release R-001 kickoff posted by ProDuh!');
res.json({ posted: !!msg?.id });
});


export default r;