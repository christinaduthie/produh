import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../api';

type ReleaseNoteVariant = {
  html: string;
  page?: { id?: string; link?: string; error?: string };
};

type ReleaseNotesResponse = {
  notes: {
    executive: ReleaseNoteVariant;
    engineering: ReleaseNoteVariant;
  };
  summary?: Summary;
  communications?: {
    teams?: {
      channel?: string;
      message?: string;
      simulated?: boolean;
    };
  };
};

type CommsResponse = {
  teamsMessage: string;
  outlookEmail: { subject: string; body: string; simulated?: boolean };
  summary?: Summary;
};

type Summary = {
  features: number;
  stories: number;
  metrics?: {
    primary: number;
    leading: number;
  };
};

export default function GTM() {
  const { id } = useParams();
  const [notes, setNotes] = useState<ReleaseNotesResponse | null>(null);
  const [comms, setComms] = useState<CommsResponse | null>(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [commsLoading, setCommsLoading] = useState(false);
  const [runAllLoading, setRunAllLoading] = useState(false);

  async function generateReleaseNotes() {
    if (!id) return;
    setNotesLoading(true);
    try {
      const res = await api('/gtm/release-notes', { productId: id });
      setNotes(res);
    } catch (err) {
      alert('Failed to generate release notes.');
    } finally {
      setNotesLoading(false);
    }
  }

  async function composeComms() {
    if (!id) return;
    setCommsLoading(true);
    try {
      const releaseLink = notes?.notes?.executive?.page?.link;
      const res = await api('/gtm/comms', {
        productId: id,
        links: {
          release: releaseLink,
          decks: undefined
        }
      });
      setComms(res);
    } catch (err) {
      alert('Failed to compose comms.');
    } finally {
      setCommsLoading(false);
    }
  }

  async function runFullLaunch() {
    if (!id) return;
    setRunAllLoading(true);
    try {
      const notesRes = await api('/gtm/release-notes', { productId: id });
      setNotes(notesRes);
      const commsRes = await api('/gtm/comms', {
        productId: id,
        links: {
          release: notesRes?.notes?.executive?.page?.link,
          decks: undefined
        }
      });
      setComms(commsRes);
    } catch (err) {
      alert('Failed to run GTM automation.');
    } finally {
      setRunAllLoading(false);
    }
  }

  function renderSummaryCards(summary?: Summary) {
    if (!summary) return null;
    return (
      <div className="insights-grid">
        <div className="insight-card">
          <h4>Features</h4>
          <strong>{summary.features || 0}</strong>
        </div>
        <div className="insight-card">
          <h4>Stories</h4>
          <strong>{summary.stories || 0}</strong>
        </div>
        <div className="insight-card">
          <h4>Primary KPIs</h4>
          <strong>{summary.metrics?.primary || 0}</strong>
        </div>
        <div className="insight-card">
          <h4>Leading KPIs</h4>
          <strong>{summary.metrics?.leading || 0}</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-grid">
      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">Go-to-Market</p>
            <h3 style={{ margin: 0 }}>One-click launch kit</h3>
          </div>
          <button className="btn primary" onClick={runFullLaunch} disabled={runAllLoading || !id}>
            {runAllLoading ? 'Preparing…' : 'Prep GTM Package'}
          </button>
        </header>
        <p>Generate release notes and comms for Exec + Eng audiences with a single workflow.</p>
      </section>

      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">Release Notes</p>
            <h3 style={{ margin: 0 }}>Exec + Eng variants</h3>
          </div>
          <button className="btn" onClick={generateReleaseNotes} disabled={notesLoading || !id}>
            {notesLoading ? 'Generating…' : 'Generate Release Notes'}
          </button>
        </header>
        <p>Summaries tailored for executives and engineering leads, published back to Confluence when available.</p>
        {renderSummaryCards(notes?.summary)}
        {notes?.communications?.teams?.message && (
          <p className="note">{notes.communications.teams.message}</p>
        )}
        <div className="panel-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {notes?.notes?.executive && (
            <article className="statement-card" style={{ marginTop: 16 }}>
              <h4>Executive</h4>
              <div dangerouslySetInnerHTML={{ __html: notes.notes.executive.html }} />
              {notes.notes.executive.page?.link && (
                <p className="note">
                  Confluence: <a href={notes.notes.executive.page.link}>{notes.notes.executive.page.link}</a>
                </p>
              )}
              {notes.notes.executive.page?.error && (
                <p className="note" style={{ color: '#b91c1c' }}>
                  {notes.notes.executive.page.error}
                </p>
              )}
            </article>
          )}
          {notes?.notes?.engineering && (
            <article className="statement-card" style={{ marginTop: 16 }}>
              <h4>Engineering</h4>
              <div dangerouslySetInnerHTML={{ __html: notes.notes.engineering.html }} />
              {notes.notes.engineering.page?.link && (
                <p className="note">
                  Confluence: <a href={notes.notes.engineering.page.link}>{notes.notes.engineering.page.link}</a>
                </p>
              )}
              {notes.notes.engineering.page?.error && (
                <p className="note" style={{ color: '#b91c1c' }}>
                  {notes.notes.engineering.page.error}
                </p>
              )}
            </article>
          )}
        </div>
      </section>

      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">Comms Composer</p>
            <h3 style={{ margin: 0 }}>Teams + Outlook drafts</h3>
          </div>
          <button className="btn" onClick={composeComms} disabled={commsLoading || !id}>
            {commsLoading ? 'Drafting…' : 'Compose Messages'}
          </button>
        </header>
        <p>Simulated Teams + Outlook outputs referencing the latest release notes.</p>
        {comms && (
          <div className="panel-grid" style={{ marginTop: 16 }}>
            <div className="statement-card">
              <h4>Teams Kickoff</h4>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{comms.teamsMessage}</pre>
              <p className="note">Simulated posting – copy/paste into Teams.</p>
            </div>
            <div className="statement-card">
              <h4>Outlook Draft</h4>
              <p>
                <strong>{comms.outlookEmail.subject}</strong>
              </p>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{comms.outlookEmail.body}</pre>
              <p className="note">Simulated email – paste into Outlook compose.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
