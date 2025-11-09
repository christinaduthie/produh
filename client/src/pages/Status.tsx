import { useProductContext } from './ProductLayout';

export default function Status() {
  const { product, loading } = useProductContext();

  if (loading) {
    return <p className="note">Loading status…</p>;
  }
  if (!product) {
    return <p className="note">No product selected.</p>;
  }

  return (
    <div className="status-grid">
      <div className="stat-card">
        <span>Stage</span>
        <strong>{product.stage}</strong>
      </div>
      <div className="stat-card">
        <span>Approval</span>
        <strong>{product.approval}</strong>
      </div>
      <div className="stat-card">
        <span>Health</span>
        <strong>{product.health}</strong>
      </div>
      <div className="stat-card">
        <span>Next Milestone</span>
        <strong>{product.next_milestone || 'TBD'}</strong>
      </div>
    </div>
  );
}
