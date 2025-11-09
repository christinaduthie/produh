import { useEffect, useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import Products from './pages/Products';
import Integrations from './pages/Integrations';
import ProductLayout from './pages/ProductLayout';
import Status from './pages/Status';
import Discovery from './pages/Discovery';
import Strategy from './pages/Strategy';
import Development from './pages/Development';
import Backlog from './pages/Backlog';
import JiraEnhancements from './pages/JiraEnhancements';
import GTM from './pages/GTM';
import Release from './pages/Release';
import Operate from './pages/Operate';

const NAV = [
  { to: '/', label: 'Portfolio', emoji: '🧭' },
  { to: '/integrations', label: 'Integrations', emoji: '🔌' }
];

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="shell">
      <header className="shell-header">
        <div>
          <p className="eyebrow">ProDuh Command</p>
          <div className="brand">PM Lifecycle Control Center</div>
        </div>
        <div className="shell-meta">
          <span className="pill success">Live Data (Neon)</span>
          <span className="pill">Gemini Drafting</span>
          <span className="pill">Agentic Gates Enabled</span>
          <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>
      <div className="shell-body">
        <aside className="shell-sidebar">
          <nav className="shell-nav">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end>
                <span>{item.emoji}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="shell-main">
          <Routes>
            <Route path="/" element={<Products />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/product/:id" element={<ProductLayout />}>
              <Route index element={<Status />} />
              <Route path="discovery" element={<Discovery />} />
              <Route path="strategy" element={<Strategy />} />
              <Route path="development" element={<Development />} />
              <Route path="backlog" element={<Backlog />} />
              <Route path="jira" element={<JiraEnhancements />} />
              <Route path="gtm" element={<GTM />} />
              <Route path="release" element={<Release />} />
              <Route path="operate" element={<Operate />} />
            </Route>
          </Routes>
        </main>
      </div>
    </div>
  );
}
