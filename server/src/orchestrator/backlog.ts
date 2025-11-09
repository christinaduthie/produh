import { q, SQL } from '../db/index.js';
import { geminiJSON } from '../ai/gemini.js';
import { BacklogPrompt } from '../ai/prompts.js';
import { v4 as uuid } from 'uuid';


export async function generateBacklog(productId: string, solution: any){
const out = await geminiJSON(BacklogPrompt, { solution });
const id = uuid();
await q(SQL.BACKLOG_INSERT, [id, productId, JSON.stringify(out)]);
return { id, out };
}
