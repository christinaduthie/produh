import { v4 as uuid } from 'uuid';
import { q, SQL } from '../db/index.js';
import { geminiJSON } from '../ai/gemini.js';
import { StrategySolutionPrompt } from '../ai/prompts.js';

const parseJson = (value: any, fallback: any) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return value;
};

async function fetchBrief(productId: string) {
  const row = (await q(SQL.BRIEF_SELECT_LATEST, [productId])).rows[0];
  if (!row) return null;
  return {
    ...row,
    pains: parseJson(row.pains, []),
    personas: parseJson(row.personas, []),
    kpi_candidates: parseJson(row.kpi_candidates, [])
  };
}

async function fetchProblemStatement(productId: string) {
  const row = (await q(SQL.PROBLEM_STATEMENT_SELECT_LATEST, [productId])).rows[0];
  return row || null;
}

function briefContext(brief: any) {
  return {
    summary: brief.summary,
    pains: (brief.pains || []).map((p: any) => p.text || p),
    personas: brief.personas || [],
    kpiCandidates: brief.kpi_candidates || []
  };
}

export async function generateStrategySolution(productId: string) {
  const brief = await fetchBrief(productId);
  if (!brief) throw new Error('No brief available');
  const statement = await fetchProblemStatement(productId);
  if (!statement) throw new Error('No problem statement available');
  const payload = {
    problemStatement: statement.statement,
    brief: briefContext(brief)
  };
  const resp = await geminiJSON(StrategySolutionPrompt, payload);
  const solution = resp?.solution || {};
  const metrics = resp?.metrics || {};
  const id = uuid();
  await q(SQL.SOLUTION_INSERT, [
    id,
    productId,
    JSON.stringify(solution),
    JSON.stringify(solution.risks || []),
    JSON.stringify(solution.dependencies || []),
    JSON.stringify(metrics.primary || []),
    JSON.stringify(metrics.leading || []),
    JSON.stringify({}),
    true
  ]);
  return { id, solution, metrics };
}

export async function getLatestSolution(productId: string) {
  const row = (await q(SQL.SOLUTION_SELECT_LATEST, [productId])).rows[0];
  if (!row) return null;
  return {
    ...row,
    spec: parseJson(row.spec, {}),
    kpis: parseJson(row.kpis, []),
    goals: parseJson(row.goals, [])
  };
}

export function strategySolutionHtml(solution: any, metrics: any) {
  const pillars = (solution?.pillars || [])
    .map((p: any) => `<li><b>${p.title}</b> — ${p.description || ''}</li>`)
    .join('');
  const phases = (solution?.rolloutPlan || [])
    .map((p: any) => `<li><b>${p.phase}</b>: ${p.focus || ''} (${p.duration || 'TBD'})</li>`)
    .join('');
  const primary = (metrics?.primary || [])
    .map((m: any) => `<li><b>${m.name}</b> → ${m.target || ''} (${m.timeline || 'TBD'})</li>`)
    .join('');
  const leading = (metrics?.leading || [])
    .map((m: any) => `<li><b>${m.name}</b> → ${m.target || ''}</li>`)
    .join('');
  return `<h2>Solution Overview</h2>
<p>${solution?.overview || ''}</p>
<h3>Pillars</h3>
<ul>${pillars}</ul>
<h3>Rollout Plan</h3>
<ul>${phases}</ul>
<h3>Primary Metrics</h3>
<ul>${primary}</ul>
<h3>Leading Indicators</h3>
<ul>${leading}</ul>`;
}
