import { api } from '../api';
import { useState } from 'react';

type Tile = { kpi: string; value: number; target: number };

export default function Operate() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    const r = await api('/operate/refresh');
    setTiles(r.tiles || []);
    setLoading(false);
  }

  return (
    <section className="panel">
      <header>
        <div>
          <p className="eyebrow">Operate</p>
          <h3 style={{ margin: 0 }}>Health snapshots</h3>
        </div>
        <span className="pill">{tiles.length ? 'Last refresh loaded' : 'Awaiting refresh'}</span>
      </header>
      <p>Pull KPIs vs target, incidents, and cycle times. Great for weekly digests or real-time dashboards.</p>
      <button className="btn primary" onClick={refresh} disabled={loading}>
        {loading ? 'Refreshing…' : 'Refresh Health'}
      </button>
      {tiles.length > 0 && (
        <div className="insights-grid" style={{ marginTop: 20 }}>
          {tiles.map((tile) => (
            <div key={tile.kpi} className="insight-card">
              <h4>{tile.kpi}</h4>
              <strong>
                {tile.value} / {tile.target}
              </strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
