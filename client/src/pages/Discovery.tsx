import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { useProductContext } from './ProductLayout';

type EvidenceItem = {
  id: string;
  date: string;
  tags: string[];
  summary: string;
};

export default function Discovery() {
  const { product } = useProductContext();
  const { id } = useParams();
  const [busy, setBusy] = useState(false);

  const [prd, setPrd] = useState<string>('');
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loadErr, setLoadErr] = useState<string>('');

  async function refreshArtifacts() {
    try {
      setLoadErr('');
      const prdText = await fetch('/api/discover/prd').then(r => (r.ok ? r.text() : Promise.reject(r.statusText)));
      const evJson = await fetch('/api/discover/evidence').then(r => (r.ok ? r.json() : Promise.reject(r.statusText)));
      setPrd(prdText);
      setEvidence(evJson);
    } catch (e: any) {
      setLoadErr(String(e));
    }
  }

  useEffect(() => {
    // load once on mount
    refreshArtifacts();
  }, []);

  async function generateBrief() {
    if (!id) return;
    setBusy(true);
    try {
      // your existing ingest step
      await api('/ingest/teams', { productId: id });
      const r = await api('/discover/problem-brief', { productId: id });
      alert('Problem Brief created at Confluence: ' + r.page.link);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <header className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Discovery Loop</p>
          <h3 style={{ margin: 0 }}>Evidence → PRD v0 → Brief</h3>
        </div>
        <span className="pill">{product?.name || 'Product'}</span>
      </header>

      <p className="note">
        View the Phase-1 artifacts below (PRD v0 draft + Evidence Matrix). You can also synthesize a Problem Brief and
        push it to Confluence when ready.
      </p>

      <div className="flex gap-2 mb-4">
        <button className="btn" onClick={refreshArtifacts}>Refresh PRD & Evidence</button>
        <button className="btn primary" onClick={generateBrief} disabled={busy}>
          {busy ? 'Working…' : 'Generate Problem Brief → Confluence'}
        </button>
      </div>

      {loadErr && <div className="text-red-500 mb-4">Error loading artifacts: {loadErr}</div>}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-neutral-900/40 rounded-xl p-4">
          <h4 className="text-lg font-semibold mb-2">PRD v0 Draft</h4>
          {prd ? (
            <pre className="whitespace-pre-wrap text-sm leading-relaxed">{prd}</pre>
          ) : (
            <p className="text-sm opacity-70">
              No PRD yet. From the repo root, run: <code>node scripts/phase1_summarize.mjs</code>
            </p>
          )}
        </div>

        <div className="bg-neutral-900/40 rounded-xl p-4">
          <h4 className="text-lg font-semibold mb-2">Evidence Matrix</h4>
          {evidence?.length ? (
            <div className="space-y-3">
              {evidence.map(n => (
                <div key={n.id} className="border border-neutral-800 rounded-lg p-3">
                  <div className="text-xs text-neutral-400">{n.id} • {new Date(n.date).toLocaleString()}</div>
                  <div className="font-medium text-sm">{n.summary}</div>
                  <div className="text-xs mt-1 opacity-80">tags: {n.tags.join(', ')}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm opacity-70">
              No evidence found. Run: <code>node scripts/phase1_summarize.mjs</code>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
