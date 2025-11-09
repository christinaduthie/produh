import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, get } from '../api';

type ShippingItem = {
  title: string;
  owner: string;
  eta: string;
  status: string;
  jiraKey: string;
  summary: string;
};

type Readiness = {
  status: string;
  checklist: Array<{ label: string; status: 'Ready' | 'Pending' | 'Blocked'; owner?: string; notes?: string }>;
  blocking?: string[];
  gateId: string;
  updatedAt: string;
};

type Comms = {
  exec: string;
  eng: string;
  support: string;
  channelLink: string;
  emailSubject: string;
  emailBody: string;
};

type TraceItem = { label: string; link: string; type: string };

type Safety = {
  rollbackOwner: string;
  owner: string;
  steps: string[];
  incidents: string[];
  notes?: string;
};

type ReleaseDashboard = {
  product?: { name?: string };
  shipping: ShippingItem[];
  readiness: Readiness;
  comms: Comms;
  traceability: TraceItem[];
  safety: Safety;
  channel: { name: string; link: string };
};

export default function Release() {
  const { id } = useParams();
  const [dashboard, setDashboard] = useState<ReleaseDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [gateLoading, setGateLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [goDecisionColor, setGoDecisionColor] = useState<'neutral' | 'red' | 'green'>('neutral');

  useEffect(() => {
    if (id) {
      void load();
    }
  }, [id]);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await get<ReleaseDashboard>(`/release/dashboard?productId=${id}`);
      setDashboard(res);
    } catch (err) {
      setError('Unable to load release dashboard.');
    } finally {
      setLoading(false);
    }
  }

  async function runGate() {
    if (!id) return;
    setGateLoading(true);
    try {
      const readiness = await api<Readiness>('/release/gate', { productId: id });
      setDashboard((prev) => (prev ? { ...prev, readiness } : prev));
    } catch {
      setError('Failed to run readiness gate.');
    } finally {
      setGateLoading(false);
    }
  }

  async function postKickoff() {
    if (!id) return;
    setPosting(true);
    setPostResult(null);
    try {
      const res = await api<{ posted: boolean; message?: string; simulated?: boolean }>('/release/create-channel', {
        productId: id
      });
      setPostResult(res.message || (res.posted ? 'Teams kickoff posted.' : 'Kickoff simulated.'));
    } catch {
      setPostResult('Failed to post kickoff to Teams.');
    } finally {
      setPosting(false);
    }
  }

  const shipping = dashboard?.shipping || [];
  const readiness = dashboard?.readiness;
  const comms = dashboard?.comms;
  const safetySteps = dashboard?.safety?.steps || [];
  const safetyIncidents = dashboard?.safety?.incidents || [];

  const gateStatusColor = useMemo(() => {
    if (!readiness) return 'pill';
    return readiness.status === 'Ready to ship' ? 'pill success' : 'pill';
  }, [readiness]);

  if (!id) {
    return <p className="note">Select a product to manage releases.</p>;
  }

  if (loading) {
    return <p className="note">Loading release dashboard…</p>;
  }

  if (error) {
    return (
      <div>
        <p className="note" style={{ color: '#b91c1c' }}>
          {error}
        </p>
        <button className="btn" onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="panel-grid">
      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">Clarity</p>
            <h3 style={{ margin: 0 }}>What’s shipping</h3>
          </div>
          <span className="pill">{dashboard?.product?.name || 'Release'}</span>
        </header>
        {shipping.length === 0 ? (
          <p className="note">Draft a development plan to populate the release manifest.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Jira</th>
                <th>Story</th>
                <th>Owner</th>
                <th>Status</th>
                <th>ETA</th>
              </tr>
            </thead>
            <tbody>
              {shipping.map((item) => (
                <tr key={item.jiraKey}>
                  <td>{item.jiraKey}</td>
                  <td>
                    <strong>{item.title}</strong>
                    <p className="note" style={{ marginTop: 6 }}>
                      {item.summary}
                    </p>
                  </td>
                  <td>{item.owner}</td>
                  <td>
                    <span className="pill">{item.status}</span>
                  </td>
                  <td>{formatDate(item.eta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">Control</p>
            <h3 style={{ margin: 0 }}>Release readiness gate</h3>
          </div>
          <span className={gateStatusColor}>{readiness?.status}</span>
        </header>
        <p>One-click go/no-go across QA, docs, rollback, and approvals.</p>
        <button className="btn primary" onClick={runGate} disabled={gateLoading}>
          {gateLoading ? 'Evaluating…' : 'Run Readiness Check'}
        </button>
        {readiness && (
          <div className="idea-grid" style={{ marginTop: 16 }}>
            {readiness.checklist.map((item) => (
              <div
                key={item.label}
                className={buildDecisionClass(item.label === 'Go / No-Go', goDecisionColor)}
                onClick={() => {
                  if (item.label === 'Go / No-Go') {
                    setGoDecisionColor((prev) => (prev === 'red' ? 'green' : 'red'));
                  }
                }}
                role={item.label === 'Go / No-Go' ? 'button' : undefined}
                tabIndex={item.label === 'Go / No-Go' ? 0 : undefined}
                onKeyDown={(evt) => {
                  if (item.label === 'Go / No-Go' && (evt.key === 'Enter' || evt.key === ' ')) {
                    evt.preventDefault();
                    setGoDecisionColor((prev) => (prev === 'red' ? 'green' : 'red'));
                  }
                }}
              >
                <span className="idea-badge active">{item.status}</span>
                <h4>{item.label}</h4>
                <p>{item.owner || 'Unassigned'}</p>
                {item.notes && <small>{item.notes}</small>}
                {item.label === 'Go / No-Go' && (
                  <small style={{ display: 'block', marginTop: 8, fontStyle: 'italic' }}>
                    Click to toggle Go / No-Go color (red ↔ green)
                  </small>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">Comms</p>
            <h3 style={{ margin: 0 }}>Realease Preperation</h3>
          </div>
          <button className="btn" onClick={postKickoff} disabled={posting}>
            {posting ? 'Posting…' : 'Post Teams Kickoff'}
          </button>
        </header>
        {postResult && <p className="note">{postResult}</p>}
        <div className="chat-grid">
          {renderChatWindow('Exec Room', comms?.exec)}
          {renderChatWindow('Engineering Hangout', comms?.eng)}
          {renderChatWindow('Support Lounge', comms?.support)}
        </div>
        {comms && (
          <article className="statement-card" style={{ marginTop: 16 }}>
            <h4>Email Draft</h4>
            <p>
              <strong>{comms.emailSubject}</strong>
            </p>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{comms.emailBody}</pre>
          </article>
        )}
      </section>

      <section className="panel-grid panel-grid--two">
        <section className="panel">
          <header>
            <div>
              <p className="eyebrow">Traceability</p>
              <h3 style={{ margin: 0 }}>Linked artifacts</h3>
            </div>
            <span className="pill">{dashboard?.channel.name}</span>
          </header>
          <div className="action-grid trace-grid">
            {dashboard?.traceability.map((item) => (
              <div className="trace-card" key={item.type}>
                <span className="trace-icon">{getTraceIcon(item.type)}</span>
                <div className="trace-card__body">
                  <h4>{item.label}</h4>
                  <p>{item.type}</p>
                  <a className="btn" href={item.link} target="_blank" rel="noreferrer">
                    Open
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <header>
            <div>
              <p className="eyebrow">Safety</p>
              <h3 style={{ margin: 0 }}>Rollback + incident flow</h3>
            </div>
            <span className="pill">Owner · {dashboard?.safety.rollbackOwner}</span>
          </header>
          <div className="action-grid">
            <div className="action-card">
              <h4>Rollback path</h4>
              <ul>
                {safetySteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
            <div className="action-card">
              <h4>Incidents → Operate KPIs</h4>
              <ul>
                {safetyIncidents.map((incident) => (
                  <li key={incident}>{incident}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return 'TBD';
  return new Date(value).toLocaleDateString();
}

function buildDecisionClass(isDecision: boolean, color: 'neutral' | 'red' | 'green') {
  const classes = ['idea-card', 'active'];
  if (isDecision) {
    classes.push('idea-card--decision');
    if (color === 'red') classes.push('idea-card--decision-red');
    if (color === 'green') classes.push('idea-card--decision-green');
  }
  return classes.join(' ');
}

function renderChatWindow(title: string, body?: string) {
  const messages = body
    ? body.split('\n').filter(Boolean)
    : ['Draft your update here…', 'Audience-specific talking points will appear.'];
  return (
    <div className="chat-window" key={title}>
      <div className="chat-window__header">
        <span>{title}</span>
        <span className="pill" style={{ fontSize: 11 }}>
          Dummy space
        </span>
      </div>
      <div className="chat-window__body">
        {messages.map((msg, idx) => (
          <div className="chat-bubble" key={`${title}-${idx}`}>
            <p>{msg}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function getTraceIcon(type: string) {
  const map: Record<string, string> = {
    'Release Notes': '📄',
    'Change Log': '🧾',
    Jira: '🗂️',
    'Jira Board': '🗂️',
    Teams: '💬'
  };
  return map[type] || '🔗';
}
