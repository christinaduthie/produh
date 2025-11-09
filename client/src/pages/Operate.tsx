import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

type Metric = { kpi: string; value: number; target: number; unit?: string };
type TimelinePoint = { label: string; uptime: number; bugs: number; complaints: number };
type Incident = { id: string; type: string; owner: string; status: string };
type Bug = { id: string; summary: string; severity: string; owner: string };
type Complaint = { channel: string; summary: string; count: number };

type OperatePayload = {
  metrics: Metric[];
  timeline: TimelinePoint[];
  incidents: Incident[];
  bugs: Bug[];
  complaints: Complaint[];
  summary: { status: string; owner: string; updatedAt: string };
};

export default function Operate() {
  const [data, setData] = useState<OperatePayload | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const r = await api<OperatePayload>('/operate/refresh');
      setData(r);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const uptimeAverage = useMemo(() => {
    if (!data?.timeline?.length) return 0;
    return data.timeline.reduce((sum, item) => sum + item.uptime, 0) / data.timeline.length;
  }, [data?.timeline]);

  return (
    <div className="panel-grid">
      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">Operate</p>
            <h3 style={{ margin: 0 }}>Real-time health</h3>
          </div>
          <span className="pill">
            {data ? `Status: ${data.summary.status}` : 'Awaiting refresh'} · Owner: {data?.summary.owner || '–'}
          </span>
        </header>
        <p>
          Monitor adoption, bugs, and complaints across the lifecycle. Keep a constant pulse on uptime and incidents so
          the product behaves the way you promise customers.
        </p>
        <button className="btn primary" onClick={refresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh Health'}
        </button>
        {data && (
          <p className="note" style={{ marginTop: 8 }}>
            Last update: {new Date(data.summary.updatedAt).toLocaleString()}
          </p>
        )}
        {data?.metrics?.length && (
          <div className="insights-grid" style={{ marginTop: 20 }}>
            {data.metrics.map((metric) => (
              <div key={metric.kpi} className="insight-card">
                <h4>{metric.kpi}</h4>
                <strong>
                  {metric.value} / {metric.target} {metric.unit}
                </strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel panel-grow">
        <header>
          <div>
            <p className="eyebrow">Observation</p>
            <h3 style={{ margin: 0 }}>Uptime & noise (7d)</h3>
          </div>
          <span className="pill">Avg uptime: {uptimeAverage.toFixed(2)}%</span>
        </header>
        <div className="health-chart">
          {data?.timeline.map((point) => (
            <div key={point.label} className="health-chart__row">
              <div className="health-chart__label">{point.label}</div>
              <div className="health-chart__bars">
                <div className="health-chart__bar health-chart__bar--uptime" style={{ width: `${point.uptime}%` }}>
                  {point.uptime.toFixed(1)}%
                </div>
                <div className="health-chart__bar health-chart__bar--bugs" style={{ width: `${point.bugs * 10}%` }}>
                  Bugs: {point.bugs}
                </div>
                <div
                  className="health-chart__bar health-chart__bar--complaints"
                  style={{ width: `${point.complaints * 15}%` }}
                >
                  Complaints: {point.complaints}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">Incidents</p>
            <h3 style={{ margin: 0 }}>Live tracking</h3>
          </div>
        </header>
        <ul className="list">
          {data?.incidents.map((incident) => (
            <li key={incident.id}>
              <strong>{incident.id}</strong> – {incident.type}{' '}
              <span className="pill">{incident.status}</span> · {incident.owner}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">Bugs</p>
            <h3 style={{ margin: 0 }}>Top issues</h3>
          </div>
        </header>
        <ul className="list">
          {data?.bugs.map((bug) => (
            <li key={bug.id}>
              <strong>{bug.id}</strong> – {bug.summary}{' '}
              <span className="pill">{bug.severity}</span> · {bug.owner}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">Complaints</p>
            <h3 style={{ margin: 0 }}>User signals</h3>
          </div>
        </header>
        <ul className="list">
          {data?.complaints.map((item) => (
            <li key={item.summary}>
              <strong>{item.channel}</strong> – {item.summary} ({item.count})
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
