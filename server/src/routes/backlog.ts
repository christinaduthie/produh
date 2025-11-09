import { Router } from 'express';
import { q, SQL } from '../db/index.js';
import { generateBacklog } from '../orchestrator/backlog.js';
import { jiraCreateIssue, jiraLinkIssues } from '../integrations/atlassian.js';


const r = Router();


r.post('/generate', async (req,res)=>{
const { productId } = req.body;
const solution = (await q(SQL.SOLUTION_SELECT_LATEST, [productId])).rows[0];
const { id, out } = await generateBacklog(productId, solution);
res.json({ id, backlog: out });
});


r.post('/push', async (req,res)=>{
const { productId } = req.body;
const row = (await q(SQL.BACKLOG_SELECT_LATEST, [productId])).rows[0];
const data = row.json;


// Create Epic
const epic = await jiraCreateIssue({
project: { key: process.env.ATLASSIAN_JIRA_PROJECT_KEY },
issuetype: { name: 'Epic' },
summary: data.epic.title,
description: data.epic.description
});
const keys: Record<string,string> = { EPIC: epic.key };


// Create Features as Stories with label feature
for (const [i,f] of (data.features||[]).entries()){
const feat = await jiraCreateIssue({
project: { key: process.env.ATLASSIAN_JIRA_PROJECT_KEY },
issuetype: { name: 'Story' },
summary: `[Feature] ${f.title}`,
description: f.description,
parent: { key: epic.key },
labels: ['feature']
});
keys[`FEATURE_${i}`] = feat.key;
}


// Create Stories
for (const [i,s] of (data.stories||[]).entries()){
const body = [s.description, '\n\nAcceptance Criteria:', ...s.acceptanceCriteria.map((a:string)=>`- ${a}`)].join('\n');
const st = await jiraCreateIssue({
project: { key: process.env.ATLASSIAN_JIRA_PROJECT_KEY },
issuetype: { name: 'Story' },
summary: s.title,
description: body,
labels: s.tags || []
});
keys[`STORY_${i}`] = st.key;
for (const sub of (s.subtasks||[])){
await jiraCreateIssue({
project: { key: process.env.ATLASSIAN_JIRA_PROJECT_KEY },
issuetype: { name: 'Sub-task' },
summary: sub.title,
description: sub.description,
parent: { key: st.key }
});
}
}


// Links
for (const l of (data.links||[])){
const from = keys[l.from] || keys.EPIC;
const to = keys[l.to] || keys.EPIC;
if (from && to && from !== to){
await jiraLinkIssues(from, to, l.type === 'blocks' ? 'Blocks' : 'Relates');
}
}


await q(SQL.BACKLOG_UPDATE_KEYS, [JSON.stringify(keys), row.id]);
res.json({ ok: true, keys });
});


export default r;
