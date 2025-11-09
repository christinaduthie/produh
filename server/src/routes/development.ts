import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { q, SQL } from '../db/index.js';
import { geminiJSON } from '../ai/gemini.js';
import { DevelopmentTasksPrompt } from '../ai/prompts.js';
import { jiraCreateIssue } from '../integrations/atlassian.js';
import axios from 'axios';
import { getLatestSolution } from '../services/strategySolution.js';

const r = Router();

const parseJson = (value: any, fallback: any) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return value;
};

const toAdf = (lines: string[]) => ({
  type: 'doc',
  version: 1,
  content: lines.map((line) => ({
    type: 'paragraph',
    content: line ? [{ type: 'text', text: line }] : []
  }))
});

async function getIssueTypes() {
  const baseUrl = process.env.ATLASSIAN_BASE_URL;
  const email = process.env.ATLASSIAN_EMAIL;
  const token = process.env.ATLASSIAN_API_TOKEN;
  if (!baseUrl || !email || !token) throw new Error('Atlassian credentials missing');
  const auth = {
    username: email,
    password: token
  };
  const { data } = await axios.get(`${baseUrl}/rest/api/3/issuetype`, { auth });
  const issueTypes = data || [];
  let storyType = 'Story';
  let subTaskType = 'Sub-task';
  const storyCandidate = issueTypes.find((it: any) => it.subtask === false && /story/i.test(it.name));
  if (storyCandidate) storyType = storyCandidate.name;
  const subTaskCandidate = issueTypes.find((it: any) => it.subtask === true);
  if (subTaskCandidate) subTaskType = subTaskCandidate.name;
  return { storyType, subTaskType };
}

r.post('/generate', async (req,res)=>{
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId required' });
  const solution = await getLatestSolution(productId);
  if (!solution) return res.status(400).json({ error: 'Develop a strategy solution first' });
  const payload = {
    solution: solution.spec,
    metrics: {
      primary: solution.kpis,
      leading: solution.goals
    }
  };
  const resp = await geminiJSON(DevelopmentTasksPrompt, payload);
  const plan = resp?.plan || {};
  const id = uuid();
  await q(SQL.DEV_PLAN_INSERT, [id, productId, JSON.stringify(plan)]);
  res.json({ id, plan });
});

r.get('/latest', async (req,res)=>{
  const { productId } = req.query as { productId?: string };
  if (!productId) return res.status(400).json({ error: 'productId required' });
  const row = (await q(SQL.DEV_PLAN_SELECT_LATEST, [productId])).rows[0];
  if (!row) return res.json({ plan: null });
  res.json({ plan: parseJson(row.plan_json, {}), jiraKeys: parseJson(row.jira_keys, {}) });
});

r.post('/push', async (req,res)=>{
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId required' });
  const row = (await q(SQL.DEV_PLAN_SELECT_LATEST, [productId])).rows[0];
  if (!row) return res.status(400).json({ error: 'Generate a development plan first' });
  const plan = parseJson(row.plan_json, {});
  const jiraProject = process.env.ATLASSIAN_JIRA_PROJECT_KEY;
  if (!jiraProject) return res.status(400).json({ error: 'Jira project key missing' });
  const issueTypes = await getIssueTypes();
  const storyType = issueTypes.storyType;
  const taskType = issueTypes.subTaskType;
  const keys: Record<string,string> = {};
  for (const [idx, story] of (plan.stories || []).entries()) {
    const storyIssue = await jiraCreateIssue({
      project: { key: jiraProject },
      issuetype: { name: storyType },
      summary: story.title,
      description: toAdf([story.description || '', ...(story.acceptance || [])])
    });
    const storyKey = storyIssue.key;
    keys[`story_${idx}`] = storyKey;
    for (const task of (story.tasks || [])) {
      await jiraCreateIssue({
        project: { key: jiraProject },
        issuetype: { name: taskType },
        summary: task.title,
        description: toAdf([task.notes || '']),
        parent: { key: storyKey }
      });
    }
  }
  await q(SQL.DEV_PLAN_UPDATE_JIRA, [JSON.stringify(keys), row.id]);
  res.json({ ok: true, keys });
});

export default r;
