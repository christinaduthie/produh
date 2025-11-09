import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, get } from '../api';
import { useProductContext } from './ProductLayout';
import { useToast } from '../components/ToastProvider';

type DevPlan = {
  stories?: Array<{
    title: string;
    description: string;
    acceptance?: string[];
    tasks?: Array<{ title: string; notes?: string }>;
  }>;
  qaChecklist?: string[];
};

type PlanResponse = {
  plan: DevPlan | null;
  jiraKeys?: Record<string,string>;
};

export default function Development() {
  const { id } = useParams();
  const { product } = useProductContext();
  const toast = useToast();
  const [plan, setPlan] = useState<DevPlan | null>(null);
  const [jiraKeys, setJiraKeys] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pushing, setPushing] = useState(false);

  async function loadPlan() {
    if (!id) return;
    setLoading(true);
    try {
      const res = await get<PlanResponse>(`/development/latest?productId=${id}`);
      setPlan(res.plan);
      setJiraKeys(res.jiraKeys || {});
    } catch {
      setPlan(null);
      setJiraKeys({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlan();
  }, [id]);

  async function generatePlan() {
    if (!id) return;
    setGenerating(true);
    try {
      const res = await api('/development/generate', { productId: id });
      setPlan(res.plan);
      setJiraKeys({});
      toast.show('Development tasks drafted');
    } catch (err) {
      toast.show('Failed to draft development plan', 'error');
    } finally {
      setGenerating(false);
    }
  }

  async function pushToJira() {
    if (!id) return;
    setPushing(true);
    try {
      const res = await api('/development/push', { productId: id });
      setJiraKeys(res.keys || {});
      toast.show('Stories created in Jira');
    } catch (err) {
      toast.show('Failed to create Jira stories', 'error');
    } finally {
      setPushing(false);
    }
  }

  return (
    <div className="panel-grid">
      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">Development Plan</p>
            <h3 style={{ margin: 0 }}>Tasks & Stories</h3>
          </div>
          <button className="btn" onClick={generatePlan} disabled={generating}>
            {generating ? 'Generating…' : 'Generate Tasks'}
          </button>
        </header>
        {loading ? (
          <p className="note">Loading plan…</p>
        ) : plan?.stories?.length ? (
          <div className="idea-grid">
            {plan.stories.map((story, idx) => (
              <div key={`${story.title}-${idx}`} className="idea-card active">
                <span className="idea-badge active">
                  Story {idx + 1}
                  {jiraKeys[`story_${idx}`] ? ` · ${jiraKeys[`story_${idx}`]}` : ''}
                </span>
                <h4>{story.title}</h4>
                <p>{story.description}</p>
                {!!story.acceptance?.length && (
                  <ul className="idea-risks">
                    {story.acceptance.map((a, aIdx) => (
                      <li key={`acc-${idx}-${aIdx}`}>{a}</li>
                    ))}
                  </ul>
                )}
                {!!story.tasks?.length && (
                  <div className="statement-card">
                    <h4>Tasks</h4>
                    <ul className="idea-risks">
                      {story.tasks.map((task, tIdx) => (
                        <li key={`task-${idx}-${tIdx}`}>
                          <strong>{task.title}</strong> — {task.notes}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="note">Generate to see story/task breakdown.</p>
        )}
        {!!plan?.qaChecklist?.length && (
          <div className="statement-card" style={{ marginTop: 16 }}>
            <h4>QA Checklist</h4>
            <ul className="idea-risks">
              {plan.qaChecklist.map((item, idx) => (
                <li key={`qa-${idx}`}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">Jira Automation</p>
            <h3 style={{ margin: 0 }}>Push Stories</h3>
          </div>
          <span className="pill">{product?.stage || 'Stage TBD'}</span>
        </header>
        <p>Create the drafted Stories + Sub-tasks in Jira.</p>
        <button className="btn primary" onClick={pushToJira} disabled={pushing || !plan?.stories?.length}>
          {pushing ? 'Creating…' : 'Create Jira Stories'}
        </button>
        {!!Object.keys(jiraKeys).length && (
          <p className="note">Latest Jira keys: {Object.values(jiraKeys).join(', ')}</p>
        )}
      </section>
    </div>
  );
}
