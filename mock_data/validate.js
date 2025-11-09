// Run: node mock_data/validate.js
const fs = require('fs');
const p = f => JSON.parse(fs.readFileSync(`mock_data/${f}`, 'utf8'));
const exists = (set, id) => set.has(id);

const people = p('people.json');
const products = p('products.json');
const emails = p('emails.json');
const chats = p('chats.json');
const meetings = p('meeting_transcripts.json');
const confs = p('confluence_pages.json');
const notes = p('discovery_notes.json');

const idset = (arr, key) => new Set(arr.map(x => x[key]));

const emailIds = idset(emails, 'messageId');
const chatThreadIds = idset(chats, 'threadId');
const meetingIds = idset(meetings, 'meetingId');
const confIds = idset(confs, 'pageId');

let errors = [];

// emails -> mentions
for (const e of emails) {
  const m = e.mentions || {};
  for (const id of (m.confluenceIds||[])) if (!exists(confIds, id)) errors.push(`email ${e.messageId}: missing CONF ${id}`);
  for (const id of (m.meetingIds||[]))    if (!exists(meetingIds, id)) errors.push(`email ${e.messageId}: missing MTG ${id}`);
}

// chats -> references
for (const t of chats) {
  for (const msg of t.messages) {
    const r = msg.references || {};
    for (const id of (r.emailMessageIds||[])) if (!exists(emailIds, id)) errors.push(`chat ${t.threadId}/${msg.msgId}: missing email ${id}`);
    for (const id of (r.meetingIds||[]))      if (!exists(meetingIds, id)) errors.push(`chat ${t.threadId}/${msg.msgId}: missing MTG ${id}`);
    for (const id of (r.confluenceIds||[]))   if (!exists(confIds, id)) errors.push(`chat ${t.threadId}/${msg.msgId}: missing CONF ${id}`);
  }
}

// notes -> evidenceLinks
for (const n of notes) {
  const ev = n.evidenceLinks || {};
  for (const id of (ev.emailMessageIds||[])) if (!exists(emailIds, id)) errors.push(`note ${n.id}: missing email ${id}`);
  for (const id of (ev.chatThreadIds||[]))   if (!exists(chatThreadIds, id)) errors.push(`note ${n.id}: missing chat ${id}`);
  for (const id of (ev.meetingIds||[]))      if (!exists(meetingIds, id)) errors.push(`note ${n.id}: missing MTG ${id}`);
  for (const id of (ev.confluenceIds||[]))   if (!exists(confIds, id)) errors.push(`note ${n.id}: missing CONF ${id}`);
}

if (errors.length) {
  console.error(`❌ ${errors.length} issues:\n- ` + errors.join('\n- '));
  process.exit(1);
} else {
  console.log('✅ Mock integrity looks good.');
}
