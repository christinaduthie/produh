import { useProductContext } from './ProductLayout';

export default function Development() {
  const { product } = useProductContext();
  return (
    <section className="panel">
      <header>
        <div>
          <p className="eyebrow">Development</p>
          <h3 style={{ margin: 0 }}>Build &amp; QA</h3>
        </div>
        <span className="pill">{product?.name || 'Product'}</span>
      </header>
      <p className="note">Development workflow coming soon.</p>
    </section>
  );
}
