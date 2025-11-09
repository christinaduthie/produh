import { Outlet, NavLink, useParams, useOutletContext } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { get } from '../api';
import NotesModal from '../components/NotesModal';

type Product = {
  id: string;
  name: string;
  code: string;
  stage: string;
  approval: string;
  health: string;
  next_milestone?: string | null;
  owners?: { name?: string }[];
};

type ProductContext = {
  product?: Product;
  refresh: () => Promise<void>;
  loading: boolean;
};

const TABS = [
  { path: '', label: 'Status' },
  { path: 'discovery', label: 'Discovery' },
  { path: 'strategy', label: 'Strategy' },
  { path: 'backlog', label: 'Backlog' },
  { path: 'development', label: 'Development' },
  { path: 'jira', label: 'Jira+' },
  { path: 'gtm', label: 'GTM' },
  { path: 'release', label: 'Release' },
  { path: 'operate', label: 'Operate' }
];

const STATUSES = ['Not started', 'In progress', 'Completed'] as const;

export default function ProductLayout() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product>();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<typeof STATUSES[number]>('Not started');
  const [notesOpen, setNotesOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const rows = await get<Product[]>('/products');
    setProduct(rows.find((r) => r.id === id));
    setLoading(false);
  };

  useEffect(() => {
    if (id) void load();
  }, [id]);

  return (
    <div>
      <div className="product-header">
        {loading && <p className="note">Loading product…</p>}
        {!loading && !product && <p className="note">Product not found.</p>}
        {product && (
          <>
            <div className="product-title-row">
              <div>
                <p className="eyebrow">Project</p>
                <h2 className="product-title">Project: {product.name}</h2>
              </div>
              <div className="status-controls">
                <select
                  className="status-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as typeof STATUSES[number])}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button className="btn secondary" type="button" onClick={() => setNotesOpen(true)}>
                  My notes
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <nav className="sub-nav">
        {TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path ? `/product/${id}/${tab.path}` : `/product/${id}`}
            end={!tab.path}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet context={{ product, refresh: load, loading }} />
      <NotesModal open={notesOpen} onClose={() => setNotesOpen(false)} />
    </div>
  );
}

export function useProductContext() {
  return useOutletContext<ProductContext>();
}
