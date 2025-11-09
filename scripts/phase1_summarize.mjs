// Run: node scripts/phase1_summarize.mjs
import fs from 'fs';
import path from 'path';

const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const outdir = 'out';
fs.mkdirSync(outdir, { recursive: true });

// Load inputs
const emails = read('mock_data/emails.json');
const chats = read('mock_data/chats.json');
const meetings = read('mock_data/meeting_transcripts.json');
const confs = read('mock_data/confluence_pages.json');
const notes = read('mock_data/discovery_notes.json');

// Basic helpers
const byId = (arr, key='id') => Object.fromEntries(arr.map(x => [x[key] || x.messageId || x.pageId || x.meetingId, x]));
const emailById = byId(emails, 'messageId');
const chatById  = byId(chats, 'threadId');
const mtgById   = byId(meetings, 'meetingId');
const confById  = byId(confs, 'pageId');

// Derive core narrative from CONF-001 + MTG-002 + anchor emails
const prd = confById['CONF-001'] || {};
const mtg = mtgById['MTG-002'] || {};
const anchorEmails = ['EMSG-1001','EMSG-1002','EMSG-1003','EMSG-1004','EMSG-1005'].map(id => emailById[id]).filter(Boolean);

// Collate KPIs (from meeting decisions + notes)
const kpiFromDecisions = (mtg.decisions||[]).filter(d =>
  /KPI|goal|freshness|cycle time|tickets linked/i.test(d)
);
const kpiFromNotes = notes.filter(n => n.tags.includes('kpis') || n.tags.includes('kpi-design')).map(n => n.summary);

// Draft PRD v0 markdown
const md = `# ProDuh! — PRD v0 (Draft)

## Problem Statement
${(prd.problemStatements||[]).map(s=>`- ${s}`).join('\n')}

## Target User
- PM / Tech Lead pair

## MVP Scope
- Evidence intake → Goals/KPIs draft → Traceability view → Weekly narrative
- Read-only integrations for v1 (Confluence/Jira)

## Decision Principles
- If a feature doesn’t clarify the “why” or the next step, it’s out for v1.

## KPIs (v1)
${kpiFromDecisions.map(k=>`- ${k}`).join('\n') || '- % of tickets linked to a goal\n- Narrative freshness (days)\n- Cycle time (discovery→delivery)'}

## Jobs To Be Done
${(prd.jobsToBeDone||[]).map(s=>`- ${s}`).join('\n')}

## Evidence (Pointers)
- Emails: ${anchorEmails.map(e=>e?.messageId).filter(Boolean).join(', ')}
- Chat threads: CHAT-1001
- Workshop: MTG-002
- Confluence: CONF-001

## Open Questions (Seeded)
${(confById['CONF-002']?.openQuestions||[]).map(q=>`- ${q.id}: ${q.text}`).join('\n') || '- TBD'}

## Next Steps
1. Lock minimal data model for Goals, KPIs, Narratives.
2. Design traceability view (goal ↔ work) and weekly narrative template.
3. Validate CSV baseline workflow with 1–2 design partners.
`;

// Evidence matrix
const evidence = notes.map(n => ({
  id: n.id,
  date: n.date,
  tags: n.tags,
  summary: n.summary,
  links: n.evidenceLinks
}));

fs.writeFileSync(path.join(outdir,'prd_v0_draft.md'), md, 'utf8');
fs.writeFileSync(path.join(outdir,'evidence_matrix.json'), JSON.stringify(evidence, null, 2), 'utf8');

console.log('✅ Wrote out/prd_v0_draft.md and out/evidence_matrix.json');
