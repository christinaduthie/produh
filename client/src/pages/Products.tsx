import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { get, api } from '../api';

type Product = {
  id: string;
  name: string;
  code: string;
  stage: string;
  approval: string;
  health: string;
  next_milestone?: string | null;
};

const STAGES = ['Discovery', 'Strategy', 'Backlog', 'GTM', 'Release', 'Operate'];

export default function Products() {
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState('');
  const [form, setForm] = useState({ name: 'Product Alpha', code: 'ALPHA' });

  async function load() {
    setLoading(true);
    const data = await get<Product[]>('/products');
    setRows(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createProduct() {
    if (!form.name.trim()) return;
    await api('/products', { name: form.name.trim(), code: form.code.trim() || form.name.slice(0, 4).toUpperCase() });
    setFlash('Product created and synced to Neon.');
    setForm({ name: '', code: '' });
    await load();
    setTimeout(() => setFlash(''), 3200);
  }

  const insights = useMemo(() => {
    return STAGES.map((stage) => ({
      stage,
      value: rows.filter((r) => r.stage === stage).length
    }));
  }, [rows]);

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Portfolio</p>
          <h2>Products Command Center</h2>
          <p>Monitor every lifecycle lane and launch new bets directly against Neon-backed data.</p>
        </div>
        <div className="shell-meta">
          <span className="pill">Total Products: {rows.length}</span>
          <span className="pill">In Motion: {rows.filter((r) => r.stage !== 'Discovery').length}</span>
        </div>
      </div>

      <div className="insights-grid">
        {insights.map((card) => (
          <div key={card.stage} className="insight-card">
            <h4>{card.stage}</h4>
            <strong>{card.value}</strong>
          </div>
        ))}
      </div>

      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">Create</p>
            <h3 style={{ margin: 0 }}>Launch a product workspace</h3>
          </div>
          <button className="btn primary" onClick={createProduct}>Create Product</button>
        </header>
        {flash && <div className="alert">{flash}</div>}
        <div className="form-grid" style={{ marginTop: 16 }}>
          <input
            placeholder="Product name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            placeholder="Code"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
          />
        </div>
        <p className="note">Products are stored in Neon immediately — no mock mode shortcuts.</p>
      </section>

      <section className="panel" style={{ marginTop: 24 }}>
        <header>
          <div>
            <p className="eyebrow">Portfolio</p>
            <h3 style={{ margin: 0 }}>Active products</h3>
          </div>
          <span className="pill">{loading ? 'Loading…' : 'Synced'}</span>
        </header>
        {rows.length === 0 && !loading ? (
          <p className="note">No products yet. Create one above to begin the lifecycle.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Stage</th>
                  <th>Approval</th>
                  <th>Health</th>
                  <th>Next milestone</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>Code · {r.code}</div>
                    </td>
                    <td><span className="badge stage">{r.stage}</span></td>
                    <td><span className="badge approval">{r.approval}</span></td>
                    <td><span className="badge health">{r.health}</span></td>
                    <td style={{ color: '#cbd5f5', fontSize: 14 }}>{r.next_milestone || '—'}</td>
                    <td>
                      <Link className="btn" to={`/product/${r.id}`}>
                        View Lifecycle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
