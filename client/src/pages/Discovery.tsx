import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../api';
import { useProductContext } from './ProductLayout';

export default function Discovery() {
  const { product } = useProductContext();
  const { id } = useParams();
  const [busy, setBusy] = useState(false);

  async function generateBrief() {
    if (!id) return;
    setBusy(true);
    await api('/ingest/teams', { productId: id });
    const r = await api('/discover/problem-brief', { productId: id });
    setBusy(false);
    alert('Problem Brief created at Confluence: ' + r.page.link);
  }

  return (
    <section className="panel">
      <header>
        <div>
          <p className="eyebrow">Discovery Loop</p>
          <h3 style={{ margin: 0 }}>Evidence to Brief</h3>
        </div>
        <span className="pill">{product?.name || 'Product'}</span>
      </header>
      <p>
        Pull the last Teams conversations, normalize them into signals, and have Gemini synthesize a brief with
        evidence anchors and a Mermaid journey map.
      </p>
      <button className="btn primary" onClick={generateBrief} disabled={busy}>
        {busy ? 'Working…' : 'Generate Problem Brief'}
      </button>
      <p className="note">Outputs are written to Confluence automatically, with a link back to every signal.</p>
    </section>
  );
}
