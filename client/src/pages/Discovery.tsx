import { useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { api, get } from '../api';
import { useProductContext } from './ProductLayout';
import { useToast } from '../components/ToastProvider';

type EmbedState = {
  id?: string;
  link?: string | null;
  html: string;
} | null;

type Idea = {
  name: string;
  one_liner: string;
  target_users?: string[];
  key_value?: string;
  key_risks?: string[];
};

export default function Discovery() {
  const { product } = useProductContext();
  const { id } = useParams();
  const toast = useToast();

  const [busy, setBusy] = useState(false);
  const [embed, setEmbed] = useState<EmbedState>(null);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [statementLoading, setStatementLoading] = useState(false);
  const [statement, setStatement] = useState('');

  async function loadEmbed() {
    if (!id) return;
    setEmbedLoading(true);
    try {
      const res = await get<{ confluence: EmbedState | null; html?: string }>(`/discover/problem-brief/${id}`);
      const html = res.confluence?.html || res.html || '';
      if (!html) {
        setEmbed(null);
      } else {
        setEmbed({
          id: res.confluence?.id,
          link: res.confluence?.link,
          html
        });
      }
    } catch {
      setEmbed(null);
    } finally {
      setEmbedLoading(false);
    }
  }

  useEffect(() => {
    loadEmbed();
  }, [id]);

  useEffect(() => {
    setEditorContent(embed?.html || '');
  }, [embed?.html]);

  useEffect(() => {
    if (isEditing && editorRef.current) {
      editorRef.current.innerHTML = editorContent || embed?.html || '';
    }
  }, [isEditing, editorContent, embed]);

  async function generateBrief() {
    if (!id) return;
    setBusy(true);
    await api('/ingest/teams', { productId: id });
    await api('/discover/problem-brief', { productId: id });
    setBusy(false);
    toast.show('Problem Brief published to Confluence');
    loadEmbed();
  }

  async function brainstormIdeas() {
    if (!id) return;
    setIdeasLoading(true);
    setStatement('');
    try {
      const res = await api('/discover/brainstorm', { productId: id });
      setIdeas(res.ideas || []);
      setSelected(new Set());
      toast.show('Brainstormed fresh ideas');
    } catch (err) {
      toast.show('Failed to brainstorm ideas', 'error');
    } finally {
      setIdeasLoading(false);
    }
  }

  function toggleIdea(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  async function generateStatement() {
    if (!id) return;
    const chosen = Array.from(selected).map((idx) => ideas[idx]);
    if (!chosen.length) return;
    setStatementLoading(true);
    try {
      const res = await api('/discover/problem-statement', { productId: id, ideas: chosen });
      setStatement(res.statement || '');
      toast.show('Problem statement drafted');
    } catch (err) {
      toast.show('Failed to create statement', 'error');
    } finally {
      setStatementLoading(false);
    }
  }

  async function saveEdits() {
    if (!id) return;
    setSaving(true);
    try {
      await api(`/discover/problem-brief/${id}`, { html: editorRef.current?.innerHTML || editorContent }, 'PUT');
      setIsEditing(false);
      await loadEmbed();
      toast.show('Problem Brief saved to Confluence');
    } catch (err) {
      toast.show('Failed to save to Confluence', 'error');
    } finally {
      setSaving(false);
    }
  }

  const selectedCount = selected.size;

  return (
    <>
      <div className="panel-grid panel-grid--two">
        <section className="panel panel--stretch">
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

        <section className="panel panel--stretch">
          <header>
            <div>
              <p className="eyebrow">Confluence Embed</p>
              <h3 style={{ margin: 0 }}>Problem Brief Preview</h3>
            </div>
            {embed?.link && (
              <a className="pill link-pill" href={embed.link} target="_blank" rel="noreferrer">
                Open in Confluence
              </a>
            )}
          </header>
          <div className="embed-actions">
            {embed?.html && (
              <div className="embed-buttons">
                {!isEditing && (
                  <button className="btn" onClick={() => setIsEditing(true)}>
                    Edit
                  </button>
                )}
                {isEditing && (
                  <>
                    <button className="btn" onClick={() => { setIsEditing(false); setEditorContent(embed.html); }}>
                      Cancel
                    </button>
                    <button className="btn primary" onClick={saveEdits} disabled={saving}>
                      {saving ? 'Saving…' : 'Save to Confluence'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="panel-grow">
            {embedLoading ? (
              <p className="note">Loading Confluence doc…</p>
            ) : embed?.html ? (
              <div className="confluence-embed">
                {isEditing ? (
                  <div
                    ref={editorRef}
                    className="confluence-embed__body editable"
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e) => setEditorContent(e.currentTarget.innerHTML)}
                  />
                ) : (
                  <div
                    className="confluence-embed__body"
                    dangerouslySetInnerHTML={{ __html: embed.html }}
                  />
                )}
              </div>
            ) : (
              <p className="note">Generate a Problem Brief to see it embedded here.</p>
            )}
          </div>
        </section>
      </div>

      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">Brainstorm</p>
            <h3 style={{ margin: 0 }}>Idea Radar</h3>
          </div>
          <button className="btn" onClick={brainstormIdeas} disabled={ideasLoading || !embed}>
            {ideasLoading ? 'Thinking…' : 'Brainstorm Ideas'}
          </button>
        </header>
        {ideasLoading ? (
          <p className="note">Calling Gemini for fresh ideas…</p>
        ) : ideas.length ? (
          <>
            <div className="idea-grid">
              {ideas.map((idea, idx) => {
                const active = selected.has(idx);
                return (
                  <button
                    type="button"
                    key={`${idx}-${idea.name}`}
                    className={`idea-card ${active ? 'active' : ''}`}
                    onClick={() => toggleIdea(idx)}
                  >
                    <span className={`idea-badge ${active ? 'active' : ''}`}>
                      {active ? 'Selected' : 'Tap to select'}
                    </span>
                    <h4>{idea.name}</h4>
                    <p>{idea.one_liner}</p>
                    {!!idea.target_users?.length && (
                      <div className="idea-targets">
                        {idea.target_users.map((user, tIdx) => (
                          <span key={`${idx}-target-${tIdx}`}>{user}</span>
                        ))}
                      </div>
                    )}
                    {idea.key_value && <small>{idea.key_value}</small>}
                    {!!idea.key_risks?.length && (
                      <ul className="idea-risks">
                        {idea.key_risks.map((risk, idx2) => (
                          <li key={`${idx}-risk-${idx2}`}>{risk}</li>
                        ))}
                      </ul>
                    )}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
              <button
                className="btn primary"
                onClick={generateStatement}
                disabled={!selectedCount || statementLoading}
              >
                {statementLoading ? 'Drafting…' : `Generate Problem Statement (${selectedCount})`}
              </button>
            </div>
            {statement && (
              <div className="statement-card">
                <h4>Problem Statement</h4>
                <p>{statement}</p>
              </div>
            )}
          </>
        ) : (
          <p className="note">Brainstorm to see curated ideas that expand your brief.</p>
        )}
      </section>
    </>
  );
}
