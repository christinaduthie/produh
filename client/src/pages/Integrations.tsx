import { useState } from 'react';
import { api } from '../api';

const INTEGRATIONS = [
  {
    type: 'jira',
    title: 'Jira Software',
    desc: 'Create, link, and enhance issues with stage-aware automations.'
  },
  {
    type: 'confluence',
    title: 'Confluence',
    desc: 'Publish briefs, strategy docs, and backlog mirrors as storage pages.'
  },
  {
    type: 'graph',
    title: 'Microsoft Teams',
    desc: 'Read channels for signals and post launch updates with webhooks.'
  }
];

export default function Integrations() {
  const [status, setStatus] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState<string | null>(null);

  async function test(type: string) {
    setTesting(type);
    const r = await api('/integrations/test', { integration: type });
    setStatus((prev) => ({ ...prev, [type]: r.ok ? 'Connected' : 'Missing env / token' }));
    setTesting(null);
  }

  return (
    <section className="panel">
      <header>
        <div>
          <p className="eyebrow">Integrations</p>
          <h3 style={{ margin: 0 }}>Connect canonical systems</h3>
        </div>
        <span className="pill">OAuth / PAT supported</span>
      </header>
      <div className="action-grid">
        {INTEGRATIONS.map((integration) => (
          <div key={integration.type} className="action-card">
            <h4>{integration.title}</h4>
            <p>{integration.desc}</p>
            <button className="btn" onClick={() => test(integration.type)} disabled={testing === integration.type}>
              {testing === integration.type ? 'Testing…' : 'Test Connection'}
            </button>
            {status[integration.type] && <span className="note">{status[integration.type]}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
