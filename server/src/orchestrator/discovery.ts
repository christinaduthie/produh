import { q, SQL } from '../db/index.js';
import { v4 as uuid } from 'uuid';


export async function saveSignals(productId: string, signals: any[]){
for (const s of signals){
await q(SQL.SIGNAL_INSERT,
[s.id || uuid(), productId, s.source, s.author, s.ts, s.text, s.link, JSON.stringify(s.tags||[]) ]);
}
}
