import { api } from '../api';
import { useState } from 'react';

export default function GTM() {
  const [noteLink, setNoteLink] = useState('');
  const [deckLink, setDeckLink] = useState('');

  return (
    <section className="panel">
      <header>
        <div>
          <p className="eyebrow">Go-To-Market</p>
          <h3 style={{ margin: 0 }}>Prep comms + decks</h3>
        </div>
        <span className="pill">Exec + Eng ready</span>
      </header>
      <div className="action-grid">
        <div className="action-card">
          <h4>Generate Release Notes</h4>
          <p>Summaries bucketed by type with evidence links and KPI callouts.</p>
          <button
            className="btn primary"
            onClick={async () => {
              const r = await api('/gtm/release-notes');
              setNoteLink(r.html || 'Generated');
              alert('Release notes ready and sent back to the UI.');
            }}
          >
            Release Notes
          </button>
          {noteLink && <span className="note">HTML snippet created.</span>}
        </div>
        <div className="action-card">
          <h4>Generate Decks</h4>
          <p>Exec + Eng decks via PptxGenJS; ready to attach to Confluence.</p>
          <button
            className="btn"
            onClick={async () => {
              const r = await api('/gtm/decks');
              setDeckLink(r.file);
              alert('Deck file stored at: ' + r.file);
            }}
          >
            Deck Studio
          </button>
          {deckLink && <span className="note">File: {deckLink}</span>}
        </div>
      </div>
    </section>
  );
}
