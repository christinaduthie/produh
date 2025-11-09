import { geminiJSON } from './gemini.js';
import { StrategyGeneratePrompt, StrategyEvaluatePrompt } from './prompts.js';


export async function strategyGate(brief: any, maxIters = 3) {
let attempt = 0;
let last = await geminiJSON(StrategyGeneratePrompt, { brief });
while (attempt < maxIters) {
const evalRes = await geminiJSON(StrategyEvaluatePrompt, { brief, proposal: last });
if (evalRes.pass) return { proposal: last, eval: evalRes, iters: attempt + 1 };
attempt++;
last = await geminiJSON(StrategyGeneratePrompt, { brief, hints: evalRes.revise });
}
return { proposal: last, eval: { pass: false }, iters: attempt };
}