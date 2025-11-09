import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api, get } from '../api';
import { useProductContext } from './ProductLayout';
import { useToast } from '../components/ToastProvider';

type SolutionResp = {
  solution: {
    overview?: string;
    pillars?: { title: string; description: string; owner?: string }[];
    rolloutPlan?: { phase: string; focus: string; duration?: string }[];
  } | null;
  metrics?: {
    primary?: { name: string; target: string; timeline?: string }[];
    leading?: { name: string; target: string }[];
  };
  createdAt?: string;
};

type DeckInfo = {
  audience: string;
  filename: string;
  base64: string;
  slideCount: number;
  file?: string;
  confluencePage?: { id?: string; link?: string; error?: string };
};

type DeckResponse = {
  decks: DeckInfo[];
};

const DECK_VARIANTS = [
  { audience: 'Stakeholders', description: 'Business framing, KPIs, and rollout story.' },
  { audience: 'Engineers', description: 'Technical scope, dependencies, and readiness gates.' },
  { audience: 'General', description: 'Narrative you can share with cross-functional teams.' }
];

export default function Strategy() {
  const { id } = useParams();
  const { product } = useProductContext();
  const toast = useToast();
  const [solutionData, setSolutionData] = useState<SolutionResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [gateBusy, setGateBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deckLoading, setDeckLoading] = useState(false);
  const [decks, setDecks] = useState<DeckResponse | null>(null);
  const [autoDeckRequested, setAutoDeckRequested] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    get<SolutionResp>(`/strategy/latest?productId=${id}`)
      .then((data) => setSolutionData(data))
      .catch(() => setSolutionData(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!autoDeckRequested && solutionData?.solution && id && !decks?.decks?.length) {
      setAutoDeckRequested(true);
      void generateDecks();
    }
  }, [solutionData?.solution, id, autoDeckRequested, decks?.decks]);

  async function runGate() {
    if (!id) return;
    setGateBusy(true);
    try {
      const r = await api('/strategy/run', { productId: id });
      toast.show(`Strategy gate ${r.pass ? 'passed' : 'failed'} — see Confluence`);
    } catch (err) {
      toast.show('Failed to run strategy gate', 'error');
    } finally {
      setGateBusy(false);
    }
  }

  async function generateDecks() {
    if (!id) return;
    setDeckLoading(true);
    try {
      const res = await api('/gtm/decks', { productId: id });
      setDecks(res);
      toast.show('Strategy decks generated');
    } catch (err) {
      toast.show('Failed to create decks', 'error');
    } finally {
      setDeckLoading(false);
    }
  }

  function downloadDeck(deck: DeckInfo) {
    if (!deck.base64) return;
    const byteCharacters = atob(deck.base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i += 1) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = deck.filename || 'strategy-deck.pptx';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  const solution = solutionData?.solution || {};
  const metrics = solutionData?.metrics || {};

  const deckCards: Array<{ audience: string; description: string; deck?: DeckInfo }> = decks?.decks?.length
    ? decks.decks.map((deck) => ({
        audience: deck.audience,
        description: `${deck.slideCount} slides`,
        deck
      }))
    : DECK_VARIANTS.map((variant) => ({
        audience: variant.audience,
        description: variant.description
      }));

  const deckSection = (
    <div className="statement-card" style={{ marginTop: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="eyebrow">Deck Studio</p>
          <h4 style={{ margin: 0 }}>Stakeholder-ready PPTs</h4>
        </div>
        <button className="btn" onClick={generateDecks} disabled={deckLoading || !id}>
          {deckLoading ? 'Rendering…' : 'Generate Decks'}
        </button>
      </header>
      <p className="note">
        Auto-builds three variants tailored for stakeholders, engineers, and general audiences so you can share the
        strategy consistently.
      </p>
      <div className="idea-grid">
        {deckCards.map((card) => {
          const deck = 'deck' in card ? card.deck : undefined;
          return (
            <div key={card.audience} className="idea-card active">
              <span className="idea-badge active">{card.audience}</span>
              <h4>{deck?.filename || `${card.audience} deck`}</h4>
              <p>{card.description}</p>
              {deck ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn primary" type="button" onClick={() => downloadDeck(deck as DeckInfo)}>
                    Download
                  </button>
                  {deck.confluencePage?.link && (
                    <a className="btn" href={deck.confluencePage.link} target="_blank" rel="noreferrer">
                      View
                    </a>
                  )}
                </div>
              ) : (
                <small>Generate decks to download fresh PPTs.</small>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="panel-grid">
      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">Strategy</p>
            <h3 style={{ margin: 0 }}>LLM Solution Blueprint</h3>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" disabled>
              Edit (coming soon)
            </button>
            <button className="btn primary" onClick={publishSolution} disabled={publishing || !solutionData?.solution}>
              {publishing ? 'Publishing…' : 'Add to Confluence'}
            </button>
          </div>
        </header>
        {loading ? (
          <p className="note">Loading existing solution…</p>
        ) : solutionData?.solution ? (
          <>
            <p>{solution.overview}</p>
            {!!solution.pillars?.length && (
              <div className="idea-grid">
                {solution.pillars.map((pillar, idx) => (
                  <div key={`${pillar.title}-${idx}`} className="idea-card active">
                    <span className="idea-badge active">Pillar</span>
                    <h4>{pillar.title}</h4>
                    <p>{pillar.description}</p>
                    {pillar.owner && <small>Owner: {pillar.owner}</small>}
                  </div>
                ))}
              </div>
            )}
            {!!solution.rolloutPlan?.length && (
              <div className="rollout-grid">
                {solution.rolloutPlan.map((phase, idx) => (
                  <div key={`${phase.phase}-${idx}`} className="rollout-card">
                    <h4>{phase.phase}</h4>
                    <p>{phase.focus}</p>
                    {phase.duration && <small>{phase.duration}</small>}
                  </div>
                ))}
              </div>
            )}
            {!!metrics.primary?.length && (
              <div className="metrics-block">
                <h4>Primary Metrics</h4>
                <ul>
                  {metrics.primary.map((m, idx) => (
                    <li key={`primary-${idx}`}>
                      <strong>{m.name}</strong> — target {m.target}
                      {m.timeline ? ` (${m.timeline})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!!metrics.leading?.length && (
              <div className="metrics-block">
                <h4>Leading Indicators</h4>
                <ul>
                  {metrics.leading.map((m, idx) => (
                    <li key={`leading-${idx}`}>
                      <strong>{m.name}</strong> — {m.target}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="statement-card" style={{ marginTop: 16 }}>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="eyebrow">Deck Studio</p>
                  <h4 style={{ margin: 0 }}>Stakeholder-ready PPTs</h4>
                </div>
                <button className="btn" onClick={generateDecks} disabled={deckLoading || !id}>
                  {deckLoading ? 'Rendering…' : 'Generate Decks'}
                </button>
              </header>
              <p className="note">
                Auto-builds three variants tailored for stakeholders, engineers, and general audiences so you can tell
                the strategy story consistently.
              </p>
              <div className="idea-grid">
                {(decks?.decks || []).map((deck) => (
                  <div key={deck.audience} className="idea-card active">
                    <span className="idea-badge active">{deck.audience}</span>
                    <h4>{deck.filename}</h4>
                    <p>{deck.slideCount} slides</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn primary" type="button" onClick={() => downloadDeck(deck)}>
                        Download
                      </button>
                      {deck.confluencePage?.link && (
                        <a className="btn" href={deck.confluencePage.link} target="_blank" rel="noreferrer">
                          View
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {!decks?.decks?.length && <p className="note">Generate decks to see PPT bundles.</p>}
              </div>
            </div>
            {deckSection}
          </>
        ) : (
          <>
            <p className="note">Once a problem statement is published, the solution blueprint will appear here.</p>
            {deckSection}
          </>
        )}
      </section>

      <section className="panel">
        <header>
          <div>
            <p className="eyebrow">Strategy Gate</p>
            <h3 style={{ margin: 0 }}>Generate + Evaluate</h3>
          </div>
          <span className="pill">{product?.stage || 'Stage TBD'}</span>
        </header>
        <p>
          Gemini drafts a solution, KPIs, and goals; the agentic gate scores it against Strategic Fit, Value, TTV,
          Financial Impact, Compliance, and KPI readiness. Up to three drafts run until the rubric passes.
        </p>
        <button className="btn primary" onClick={runGate} disabled={gateBusy}>
          {gateBusy ? 'Scoring…' : 'Run Strategy Gate'}
        </button>
        <p className="note">Upon pass, a Solution v✅ page is published back to Confluence.</p>
      </section>
    </div>
  );
}
function renderDeckPlaceholder(decks: DeckResponse | null, deckLoading: boolean, downloadDeck: (d: DeckInfo) => void, generateDecks: () => Promise<void> | void) {
  const deckList = decks?.decks?.length ? decks.decks : null;
  return (
    <div className="statement-card" style={{ marginTop: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="eyebrow">Deck Studio</p>
          <h4 style={{ margin: 0 }}>Stakeholder-ready PPTs</h4>
        </div>
        <button className="btn" onClick={generateDecks} disabled={deckLoading}>
          {deckLoading ? 'Rendering…' : 'Generate Decks'}
        </button>
      </header>
      <p className="note">
        Auto-builds three variants tailored for stakeholders, engineers, and general audiences so you can share the
        strategy consistently.
      </p>
      <div className="idea-grid">
        {(deckList || DECK_VARIANTS).map((variant, idx) => {
          const deck = deckList?.[idx];
          return (
            <div key={variant.audience} className="idea-card active">
              <span className="idea-badge active">{variant.audience}</span>
              <h4>{deck?.filename || `${variant.audience} deck`}</h4>
              <p>{variant.description}</p>
              {deck ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn primary" type="button" onClick={() => downloadDeck(deck)}>
                    Download
                  </button>
                  {deck.confluencePage?.link && (
                    <a className="btn" href={deck.confluencePage.link} target="_blank" rel="noreferrer">
                      View
                    </a>
                  )}
                </div>
              ) : (
                <small>Generate decks to download fresh PPTs.</small>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
  async function publishSolution() {
    if (!id) return;
    setPublishing(true);
    try {
      await api('/strategy/publish', { productId: id });
      toast.show('Solution published to Confluence');
    } catch (err) {
      toast.show('Failed to publish solution', 'error');
    } finally {
      setPublishing(false);
    }
  }
