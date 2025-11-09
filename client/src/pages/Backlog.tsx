import { useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { api, get } from '../api';

type TodoItem = {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  type: string;
  isSubtask: boolean;
  parentKey?: string;
  parentSummary?: string;
  updated?: string;
  details?: string;
};

type TodoResponse = {
  items: TodoItem[];
  source?: 'jira' | 'plan';
  syncedAt?: string;
};

export default function Backlog() {
  const { id } = useParams();
  const [generating, setGenerating] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [todosLoading, setTodosLoading] = useState(false);
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [todoError, setTodoError] = useState<string | null>(null);
  const [todoSource, setTodoSource] = useState<'jira' | 'plan' | null>(null);
  const [syncedAt, setSyncedAt] = useState<string | undefined>();

  useEffect(() => {
    if (id) {
      void fetchTodos(id);
    }
  }, [id]);

  async function fetchTodos(productId: string) {
    setTodosLoading(true);
    setTodoError(null);
    try {
      const res = await get<TodoResponse>(`/backlog/todos?productId=${productId}`);
      setTodoItems(res.items || []);
      setTodoSource(res.source ?? null);
      setSyncedAt(res.syncedAt);
    } catch {
      setTodoError('Unable to load To-Do work from Jira right now.');
    } finally {
      setTodosLoading(false);
    }
  }

  const insightCards = useMemo(() => {
    if (!todoItems.length) return [];
    const stories = todoItems.filter((item) => !item.isSubtask).length;
    const subtasks = todoItems.filter((item) => item.isSubtask).length;
    const total = todoItems.length;
    const grouped = todoItems
      .filter((item) => item.isSubtask && item.parentKey)
      .reduce<Record<string, { count: number; summary: string }>>((acc, item) => {
        const key = item.parentKey as string;
        acc[key] = acc[key] || { count: 0, summary: item.parentSummary || key };
        acc[key].count += 1;
        return acc;
      }, {});
    const heaviest = Object.values(grouped).sort((a, b) => b.count - a.count)[0];
    const cards = [
      { label: 'To-Do Stories', value: stories.toString() },
      { label: 'To-Do Subtasks', value: subtasks.toString() },
      { label: 'Total Items', value: total.toString() }
    ];
    if (heaviest) {
      cards.push({ label: 'Busiest Story', value: `${heaviest.summary} (${heaviest.count})` });
    }
    if (syncedAt) {
      cards.push({ label: 'Last Sync', value: new Date(syncedAt).toLocaleTimeString() });
    }
    return cards;
  }, [todoItems, syncedAt]);

  function formatUpdated(value?: string) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
  }

  return (
    <div>
      <div className="action-grid">
        <section className="action-card">
          <h4>Generate backlog hierarchy</h4>
          <p>LLM drafts Epic → Features → Stories → Subtasks with tagged KPIs and dependencies.</p>
          <button
            className="btn primary"
            onClick={async () => {
              if (!id) return;
              setGenerating(true);
              await api('/backlog/generate', { productId: id });
              setGenerating(false);
              alert('Backlog draft generated.');
            }}
          >
            {generating ? 'Drafting…' : 'Generate Backlog'}
          </button>
        </section>
        <section className="action-card">
          <h4>Push to Jira</h4>
          <p>Creates the Epic/Story hierarchy, adds acceptance criteria, and links dependencies.</p>
          <button
            className="btn"
            onClick={async () => {
              if (!id) return;
              setPushing(true);
              const r = await api('/backlog/push', { productId: id });
              setPushing(false);
              alert('Jira keys: ' + Object.values(r.keys).join(', '));
            }}
          >
            {pushing ? 'Syncing…' : 'Push to Jira'}
          </button>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 24 }}>
        <header>
          <div>
            <p className="eyebrow">Backlog intelligence</p>
            <h3 style={{ margin: 0 }}>To-Do work intake</h3>
          </div>
          <button className="btn" onClick={() => id && fetchTodos(id)} disabled={todosLoading}>
            {todosLoading ? 'Fetching…' : 'Refresh'}
          </button>
        </header>
        <p>
          Surface every Story and Sub-task still in <strong>To Do</strong> so you can review scope before sprint
          planning.
        </p>
        {todoSource && (
          <p className="note">
            {todoSource === 'jira'
              ? 'Live Jira data — only items currently in the To Do status.'
              : 'Showing generated plan tasks until Jira sync runs.'}
          </p>
        )}
        {todoError && (
          <p className="note" style={{ color: '#b91c1c' }}>
            {todoError}
          </p>
        )}
        {todosLoading && !todoItems.length && <p className="note">Loading to-do backlog…</p>}

        {!todosLoading && todoItems.length === 0 && !todoError && (
          <p className="note">No To-Do work found. Push Development tasks to Jira to populate this view.</p>
        )}

        {insightCards.length > 0 && (
          <div className="insights-grid">
            {insightCards.map((card) => (
              <div className="insight-card" key={card.label}>
                <h4>{card.label}</h4>
                <strong>{card.value}</strong>
              </div>
            ))}
          </div>
        )}

        {todoItems.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Work Items</th>
                <th>Status</th>
                <th>Type</th>
                <th>Parent</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {todoItems.map((item) => (
                <tr key={item.key}>
                  <td>
                    <strong>{item.summary}</strong>
                    <p className="note" style={{ marginTop: 6 }}>
                      {item.key}
                      {item.details ? ` · ${item.details}` : ''}
                    </p>
                  </td>
                  <td>
                    <span className="pill">{item.status}</span>
                  </td>
                  <td>{item.type}</td>
                  <td>{item.parentSummary ? `${item.parentSummary} (${item.parentKey})` : '—'}</td>
                  <td>{formatUpdated(item.updated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
