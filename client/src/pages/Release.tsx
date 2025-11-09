import { api } from '../api';
import { useState } from 'react';

export default function Release() {
  const [result, setResult] = useState('');

  return (
    <section className="panel">
      <header>
        <div>
          <p className="eyebrow">Release Ops</p>
          <h3 style={{ margin: 0 }}>Channels + rituals</h3>
        </div>
        <span className="pill">Teams Automation</span>
      </header>
      <p>Create a launch channel or simply post the release checklist into the existing war-room.</p>
      <button
        className="btn primary"
        onClick={async () => {
          const r = await api('/release/create-channel');
          setResult(r.posted ? 'Kickoff posted to Teams.' : 'Unable to post kickoff.');
          alert('Posted kickoff: ' + r.posted);
        }}
      >
        Create / Notify
      </button>
      {result && <p className="note">{result}</p>}
    </section>
  );
}
