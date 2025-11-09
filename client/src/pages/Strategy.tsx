import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api, get } from '../api';
import { useProductContext } from './ProductLayout';
import { useToast } from '../components/ToastProvider';

type SolutionResp = {
  solution: {
    overview?: string;
    pillars?: { title: string; description: string; owner?: string }[];
    rolloutPlan?: { phase: string; focus: string; duration?: string }[];
  } | null;
  metrics?: {
    primary?: { name: string; target: string; timeline?: string }[];
    leading?: { name: string; target: string }[];
  };
  createdAt?: string;
};

export default function Strategy() {
  const { id } = useParams();
  const { product } = useProductContext();
  const toast = useToast();
  const [solutionData, setSolutionData] = useState<SolutionResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [gateBusy, setGateBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    get<SolutionResp>(`/strategy/latest?productId=${id}`)
      .then((data) => setSolutionData(data))
      .catch(() => setSolutionData(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function runGate() {
    if (!id) return;
    setGateBusy(true);
    try {
      const r = await api('/strategy/run', { productId: id });
      toast.show(`Strategy gate ${r.pass ? 'passed' : 'failed'} — see Confluence`);
    } catch (err) {
      toast.show('Failed to run strategy gate', 'error');
    } finally {
      setGateBusy(false);
    }
  }

  const solution = solutionData?.solution || {};
  const metrics = solutionData?.metrics || {};

  return (
    <div className="panel-grid">
      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">Strategy</p>
            <h3 style={{ margin: 0 }}>LLM Solution Blueprint</h3>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" disabled>
              Edit (coming soon)
            </button>
            <button className="btn primary" onClick={publishSolution} disabled={publishing || !solutionData?.solution}>
              {publishing ? 'Publishing…' : 'Add to Confluence'}
            </button>
          </div>
        </header>
        {loading ? (
          <p className="note">Loading existing solution…</p>
        ) : solutionData?.solution ? (
          <>
            <p>{solution.overview}</p>
            {!!solution.pillars?.length && (
              <div className="idea-grid">
                {solution.pillars.map((pillar, idx) => (
                  <div key={`${pillar.title}-${idx}`} className="idea-card active">
                    <span className="idea-badge active">Pillar</span>
                    <h4>{pillar.title}</h4>
                    <p>{pillar.description}</p>
                    {pillar.owner && <small>Owner: {pillar.owner}</small>}
                  </div>
                ))}
              </div>
            )}
            {!!solution.rolloutPlan?.length && (
              <div className="rollout-grid">
                {solution.rolloutPlan.map((phase, idx) => (
                  <div key={`${phase.phase}-${idx}`} className="rollout-card">
                    <h4>{phase.phase}</h4>
                    <p>{phase.focus}</p>
                    {phase.duration && <small>{phase.duration}</small>}
                  </div>
                ))}
              </div>
            )}
            {!!metrics.primary?.length && (
              <div className="metrics-block">
                <h4>Primary Metrics</h4>
                <ul>
                  {metrics.primary.map((m, idx) => (
                    <li key={`primary-${idx}`}>
                      <strong>{m.name}</strong> — target {m.target}
                      {m.timeline ? ` (${m.timeline})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!!metrics.leading?.length && (
              <div className="metrics-block">
                <h4>Leading Indicators</h4>
                <ul>
                  {metrics.leading.map((m, idx) => (
                    <li key={`leading-${idx}`}>
                      <strong>{m.name}</strong> — {m.target}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="note">Once a problem statement is published, the solution blueprint will appear here.</p>
        )}
      </section>

      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">Strategy Gate</p>
            <h3 style={{ margin: 0 }}>Generate + Evaluate</h3>
          </div>
          <span className="pill">{product?.stage || 'Stage TBD'}</span>
        </header>
        <p>
          Gemini drafts a solution, KPIs, and goals; the agentic gate scores it against Strategic Fit, Value, TTV,
          Financial Impact, Compliance, and KPI readiness. Up to three drafts run until the rubric passes.
        </p>
        <button className="btn primary" onClick={runGate} disabled={gateBusy}>
          {gateBusy ? 'Scoring…' : 'Run Strategy Gate'}
        </button>
        <p className="note">Upon pass, a Solution v✅ page is published back to Confluence.</p>
      </section>
    </div>
  );
}
  async function publishSolution() {
    if (!id) return;
    setPublishing(true);
    try {
      await api('/strategy/publish', { productId: id });
      toast.show('Solution published to Confluence');
    } catch (err) {
      toast.show('Failed to publish solution', 'error');
    } finally {
      setPublishing(false);
    }
  }
