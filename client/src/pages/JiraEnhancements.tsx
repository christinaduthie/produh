import { useParams } from 'react-router-dom';
import { api } from '../api';

export default function JiraEnhancements() {
  const { id } = useParams();
  return (
    <section className="panel">
      <header>
        <div>
          <p className="eyebrow">Jira Assist</p>
          <h3 style={{ margin: 0 }}>Boost prioritization</h3>
        </div>
        <span className="pill">LLM powered</span>
      </header>
      <p>
        Use heuristics + tags to quickly score the backlog. Additional automations (dependencies, DoD, risk labels) can
        be plugged in next.
      </p>
      <button
        className="btn primary"
        onClick={async () => {
          if (!id) return;
          const r = await api('/jira/enhance/priority', { productId: id });
          alert(
            'Top story: ' +
              (r.ranked?.[0]?.title ?? 'n/a') +
              ' (score ' +
              (r.ranked?.[0]?.score ?? '-') +
              ')'
          );
        }}
      >
        Priority Suggestions
      </button>
    </section>
  );
}
