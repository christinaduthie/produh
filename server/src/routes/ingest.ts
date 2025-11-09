import { Router } from 'express';
import { ENV } from '../config/env.js';
import { teamsListMessages } from '../integrations/msgraph.js';
import { saveSignals } from '../orchestrator/discovery.js';


const r = Router();


r.post('/teams', async (req,res)=>{
const { productId } = req.body;
const useMock = ENV.MOCK_DISCOVERY || ENV.MOCK_MODE;
let messages: any[] = [];
if (!useMock) {
messages = await teamsListMessages(ENV.MS.TEAM_ID, ENV.MS.CHANNEL_ID);
} else {
messages = [
{ id: 'm1', summary: 'User confusion on onboarding', from: { user: { displayName: 'Chad' }}, createdDateTime: new Date().toISOString(), body: { content: 'Onboarding takes too long' }, webUrl: 'https://teams.microsoft.com/...' }
];
}
const signals = messages.map((m:any)=>({
id: m.id,
source: 'teams',
author: m.from?.user?.displayName || 'Unknown',
ts: m.createdDateTime,
text: (m.body?.content || m.summary || '').replace(/<[^>]+>/g,''),
link: m.webUrl || '',
tags: []
}));
await saveSignals(productId, signals);
res.json({ count: signals.length, mock: useMock });
});


export default r;
