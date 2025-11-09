import { useEffect, useMemo, useState } from 'react';

type SprintItem = {
  title: string;
  type: string;
  status: 'To Do' | 'In Progress' | 'Done';
  label: string;
  owner: string;
  eta: string;
  effortHours: number;
  bugs: number;
  errors: number;
};

type SprintResponse = {
  items: SprintItem[];
  statusSummary: { todo: number; inProgress: number; done: number };
  issueSummary: { bugs: number; errors: number };
  timeline: Array<{ label: string; planned: number; actual: number }>;
  utilization: { hoursCommitted: number; hoursUsed: number };
};

export default function Development() {
  const [sprint, setSprint] = useState<SprintResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const totalStatus = useMemo(() => {
    if (!sprint) return 0;
    return sprint.statusSummary.todo + sprint.statusSummary.inProgress + sprint.statusSummary.done;
  }, [sprint]);

  const utilizationPct = useMemo(() => {
    if (!sprint) return 0;
    const { hoursCommitted, hoursUsed } = sprint.utilization;
    if (!hoursCommitted) return 0;
    return Math.min(100, Math.round((hoursUsed / hoursCommitted) * 100));
  }, [sprint]);

  function loadSprint() {
    setLoading(true);
    setTimeout(() => {
      setSprint(DUMMY_SPRINT);
      setLoading(false);
    }, 400);
  }

  useEffect(() => {
    loadSprint();
  }, []);

  const statusPie = createStatusPie(sprint?.statusSummary);
  const issuePie = createIssuePie(sprint?.issueSummary);

  return (
    <div className="panel-grid">
      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">Development Ops</p>
            <h3 style={{ margin: 0 }}>Sprint cockpit</h3>
          </div>
          <button className="btn" onClick={loadSprint} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh Sprint'}
          </button>
        </header>
        <p>
          Shows every work item labeled <strong>current-sprint</strong>, giving PMs instant clarity into scope, issues,
          and schedule health.
        </p>
        <div className="summary-grid">
          <div className="stat-card">
            <span>Stories</span>
            <strong>{totalStatus}</strong>
          </div>
          <div className="stat-card">
            <span>Utilization</span>
            <strong>{utilizationPct}%</strong>
            {sprint && (
              <small>
                {sprint.utilization.hoursUsed}h / {sprint.utilization.hoursCommitted}h
              </small>
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">At a glance</p>
            <h3 style={{ margin: 0 }}>Status + Issues</h3>
          </div>
        </header>
        <div className="pie-grid">
          <div className="pie-card">
            <h4>Status split</h4>
            <div className="pie-chart" style={{ background: statusPie }} />
            <ul>
              <li>To Do: {sprint?.statusSummary.todo || 0}</li>
              <li>In Progress: {sprint?.statusSummary.inProgress || 0}</li>
              <li>Done: {sprint?.statusSummary.done || 0}</li>
            </ul>
          </div>
          <div className="pie-card">
            <h4>Bugs vs Errors</h4>
            <div className="pie-chart" style={{ background: issuePie }} />
            <ul>
              <li>Bugs: {sprint?.issueSummary.bugs || 0}</li>
              <li>Errors: {sprint?.issueSummary.errors || 0}</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">Stories + Features</p>
            <h3 style={{ margin: 0 }}>Current Sprint</h3>
          </div>
        </header>
        {sprint?.items.length ? (
          <div className="board-grid">
            {sprint.items.map((item) => (
              <div key={`${item.title}-${item.owner}`} className="sprint-card">
                <div className="sprint-card__header">
                  <span className="pill">{item.status}</span>
                  <span className="pill">{item.type}</span>
                </div>
                <h4>{item.title}</h4>
                <p>Owner: {item.owner}</p>
                <div className="sprint-meta">
                  <span>ETA: {new Date(item.eta).toLocaleDateString()}</span>
                  <span>Effort: {item.effortHours}h</span>
                  <span>Bugs: {item.bugs}</span>
                  <span>Errors: {item.errors}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="note">Refresh to bring in labeled current-sprint stories.</p>
        )}
      </section>

      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">Schedule</p>
            <h3 style={{ margin: 0 }}>Timeline & time tracking</h3>
          </div>
        </header>
        {sprint?.timeline.map((entry) => (
          <div key={entry.label} className="timeline-row">
            <strong>{entry.label}</strong>
            <div className="timeline-bars">
              <div className="timeline-bar timeline-bar--planned" style={{ width: `${entry.planned * 2}%` }}>
                Planned {entry.planned}h
              </div>
              <div className="timeline-bar timeline-bar--actual" style={{ width: `${entry.actual * 2}%` }}>
                Actual {entry.actual}h
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

const DUMMY_SPRINT: SprintResponse = {
  items: [
    {
      title: 'Feature flag rollout',
      type: 'Feature',
      status: 'In Progress',
      label: 'current-sprint',
      owner: 'ENG',
      eta: new Date(Date.now() + 3 * 86400000).toISOString(),
      effortHours: 18,
      bugs: 1,
      errors: 0
    },
    {
      title: 'Audit logging hardening',
      type: 'Story',
      status: 'To Do',
      label: 'current-sprint',
      owner: 'PM',
      eta: new Date(Date.now() + 5 * 86400000).toISOString(),
      effortHours: 12,
      bugs: 0,
      errors: 1
    },
    {
      title: 'Mobile crash fix spike',
      type: 'Story',
      status: 'Done',
      label: 'current-sprint',
      owner: 'QA',
      eta: new Date(Date.now() + 1 * 86400000).toISOString(),
      effortHours: 10,
      bugs: 0,
      errors: 0
    }
  ],
  statusSummary: { todo: 1, inProgress: 1, done: 1 },
  issueSummary: { bugs: 1, errors: 1 },
  timeline: [
    { label: 'Sprint -1', planned: 40, actual: 42 },
    { label: 'Sprint 0', planned: 40, actual: 38 },
    { label: 'Sprint 1', planned: 40, actual: 46 }
  ],
  utilization: { hoursCommitted: 40, hoursUsed: 34 }
};

function createStatusPie(summary?: { todo: number; inProgress: number; done: number }) {
  if (!summary) return 'var(--panel-bg)';
  const total = summary.todo + summary.inProgress + summary.done || 1;
  const todoPct = (summary.todo / total) * 100;
  const progressPct = (summary.inProgress / total) * 100;
  const donePct = 100 - todoPct - progressPct;
  return `conic-gradient(#eab308 0 ${todoPct}%, #3b82f6 ${todoPct}% ${todoPct + progressPct}%, #22c55e ${todoPct + progressPct}% 100%)`;
}

function createIssuePie(summary?: { bugs: number; errors: number }) {
  if (!summary) return 'var(--panel-bg)';
  const total = summary.bugs + summary.errors || 1;
  const bugsPct = (summary.bugs / total) * 100;
  return `conic-gradient(#ef4444 0 ${bugsPct}%, #f97316 ${bugsPct}% 100%)`;
}
