import { Outlet, NavLink, useParams, useOutletContext } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { get } from '../api';

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
  { path: 'development', label: 'Development' },
  { path: 'backlog', label: 'Backlog' },
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
                <p className="eyebrow">Product</p>
                <h2 className="product-title">{product.name}</h2>
                <p style={{ color: '#94a3b8', margin: 0 }}>Code · {product.code}</p>
              </div>
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
            </div>
            <div className="product-meta">
              <span className="badge stage">{product.stage}</span>
              <span className="badge approval">{product.approval}</span>
              <span className="badge health">{product.health}</span>
              {product.next_milestone && <span className="pill">Next: {product.next_milestone}</span>}
              {Array.isArray(product.owners) && product.owners.length > 0 && (
                <span className="pill">
                  Owners: {product.owners.map((o) => o?.name || 'Unknown').join(', ')}
                </span>
              )}
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
    </div>
  );
}

export function useProductContext() {
  return useOutletContext<ProductContext>();
}
