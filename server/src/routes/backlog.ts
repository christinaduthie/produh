import { Router } from 'express';
import { q, SQL } from '../db/index.js';
import { generateBacklog } from '../orchestrator/backlog.js';
import { jiraCreateIssue, jiraLinkIssues, jiraSearch } from '../integrations/atlassian.js';
import { ENV } from '../config/env.js';


const r = Router();

type TodoItem = {
key: string;
summary: string;
status: string;
statusCategory: string;
type: string;
isSubtask: boolean;
parentKey?: string;
parentSummary?: string;
updated?: string;
details?: string;
};


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

r.get('/todos', async (req,res)=>{
const { productId } = req.query as { productId?: string };
if (!productId) return res.status(400).json({ error: 'productId required' });
const planRow = (await q(SQL.DEV_PLAN_SELECT_LATEST, [productId])).rows[0];
if (!planRow) return res.json({ items: [], source: 'plan', syncedAt: new Date().toISOString() });
const plan = parseJson(planRow.plan_json, {});
const jiraKeys = parseJson(planRow.jira_keys, {});
const storyKeys = Object.values(jiraKeys || {})
.map((key: any)=>typeof key === 'string' ? key : '')
.map((key)=>key.replace(/[^A-Za-z0-9\-]/g, ''))
.filter((key)=>!!key);
let items: TodoItem[] = [];
let source: 'plan'|'jira' = 'plan';

if (storyKeys.length && hasAtlCreds()){
try {
const keyList = storyKeys.join(',');
const result = await jiraSearch(
`statusCategory = "To Do" AND (issuekey in (${keyList}) OR parent in (${keyList}))`,
['summary','status','issuetype','parent','updated']
);
const mapped = (result?.issues || []).map(mapJiraIssue).filter(Boolean) as TodoItem[];
if (mapped.length){
items = mapped;
source = 'jira';
}
} catch (_err) {
items = [];
}
}

if (!items.length){
items = buildPlanTodos(plan);
}

res.json({ items, source, syncedAt: new Date().toISOString() });
});


export default r;


function hasAtlCreds(){
return Boolean(ENV.ATLASSIAN.BASE_URL && ENV.ATLASSIAN.EMAIL && ENV.ATLASSIAN.TOKEN);
}

function mapJiraIssue(issue: any): TodoItem | null {
if (!issue) return null;
const fields = issue.fields || {};
return {
key: issue.key,
summary: fields.summary || issue.key,
status: fields.status?.name || 'To Do',
statusCategory: fields.status?.statusCategory?.name || fields.status?.name || 'To Do',
type: fields.issuetype?.name || 'Task',
isSubtask: !!fields.issuetype?.subtask,
parentKey: fields.parent?.key,
parentSummary: fields.parent?.fields?.summary || fields.parent?.key,
updated: fields.updated
};
}

function buildPlanTodos(plan: any): TodoItem[] {
const stories = Array.isArray(plan?.stories) ? plan.stories : [];
const items: TodoItem[] = [];
stories.forEach((story: any, idx: number)=>{
const storyKey = story?.key || `PLAN-STORY-${idx + 1}`;
items.push({
key: storyKey,
summary: story?.title || `Story ${idx + 1}`,
status: 'To Do',
statusCategory: 'To Do',
type: 'Story',
isSubtask: false,
details: story?.description
});
const tasks = Array.isArray(story?.tasks) ? story.tasks : [];
tasks.forEach((task: any, tIdx: number)=>{
items.push({
key: `${storyKey}-TASK-${tIdx + 1}`,
summary: task?.title || `Task ${tIdx + 1}`,
status: 'To Do',
statusCategory: 'To Do',
type: 'Sub-task',
isSubtask: true,
parentKey: storyKey,
parentSummary: story?.title,
details: task?.notes
});
});
});
return items;
}

function parseJson(value: any, fallback: any){
if (value === null || value === undefined) return fallback;
if (typeof value === 'string'){
try {
return JSON.parse(value);
} catch {
return fallback;
}
}
return value;
}
