import { q, SQL } from '../db/index.js';
import { geminiJSON } from '../ai/gemini.js';
import { ProblemBriefPrompt, StrategyGeneratePrompt } from '../ai/prompts.js';
import { strategyGate } from '../ai/loops.js';
import { v4 as uuid } from 'uuid';


export async function createBrief(productId: string, signals: any){
const brief = await geminiJSON(ProblemBriefPrompt, { signals });
const id = uuid();
await q(SQL.BRIEF_INSERT,
[id, productId, brief.summary, JSON.stringify(brief.pains), JSON.stringify(brief.personas), JSON.stringify(brief.kpiCandidates), brief.mermaid, JSON.stringify(brief.evidence)]);
return { id, brief };
}


export async function runStrategyGate(briefRow: any){
const res = await strategyGate(briefRow, 3);
const id = uuid();
await q(SQL.SOLUTION_INSERT,
[id, briefRow.product_id, JSON.stringify(res.proposal.solution), JSON.stringify(res.proposal.solution?.risks||[]), JSON.stringify(res.proposal.solution?.dependencies||[]), JSON.stringify(res.proposal.kpis||[]), JSON.stringify(res.proposal.goals||[]), JSON.stringify(res.eval||{}), !!res.eval?.pass]);
return { id, res };
}
