import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../api';
import { useProductContext } from './ProductLayout';

export default function Strategy() {
  const { id } = useParams();
  const { product } = useProductContext();
  const [busy, setBusy] = useState(false);

  async function runGate() {
    if (!id) return;
    setBusy(true);
    const r = await api('/strategy/run', { productId: id });
    setBusy(false);
    alert(`Strategy pass: ${r.pass}. Confluence: ${r.page.link}`);
  }

  return (
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
      <button className="btn primary" onClick={runGate} disabled={busy}>
        {busy ? 'Scoring…' : 'Run Strategy Gate'}
      </button>
      <p className="note">Upon pass, a Solution v✅ page is published back to Confluence.</p>
    </section>
  );
}
