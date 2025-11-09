import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../api';

export default function Backlog() {
  const { id } = useParams();
  const [generating, setGenerating] = useState(false);
  const [pushing, setPushing] = useState(false);

  return (
    <div className="action-grid">
      <section className="action-card">
        <h4>Generate backlog hierarchy</h4>
        <p>LLM drafts Epic → Features → Stories → Subtasks with tagged KPIs and dependencies.</p>
        <button
          className="btn primary"
          onClick={async () => {
            if (!id) return;
            setGenerating(true);
            await api('/backlog/generate', { productId: id });
            setGenerating(false);
            alert('Backlog draft generated.');
          }}
        >
          {generating ? 'Drafting…' : 'Generate Backlog'}
        </button>
      </section>
      <section className="action-card">
        <h4>Push to Jira</h4>
        <p>Creates the Epic/Story hierarchy, adds acceptance criteria, and links dependencies.</p>
        <button
          className="btn"
          onClick={async () => {
            if (!id) return;
            setPushing(true);
            const r = await api('/backlog/push', { productId: id });
            setPushing(false);
            alert('Jira keys: ' + Object.values(r.keys).join(', '));
          }}
        >
          {pushing ? 'Syncing…' : 'Push to Jira'}
        </button>
      </section>
    </div>
  );
}
