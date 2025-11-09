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
  { to: '/', label: 'Projects', emoji: '🧭' },
  { to: '/integrations', label: 'Integrations', emoji: '🔌' }
];

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Z" />
    <path d="M18 16v-4a6 6 0 1 0-12 0v4l-1.8 2.7c-.3.45.01 1.05.56 1.05H19.3c.55 0 .86-.6.56-1.05Z" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="6" />
    <line x1="16" y1="16" x2="21" y2="21" />
  </svg>
);

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
          <p className="eyebrow">PM Lifecycle Management</p>
          <div className="brand">ProDuh! Command Control</div>
        </div>
        <div className="shell-meta">
          <input className="header-search" placeholder="Search projects, KPIs, people..." aria-label="Search" />
          <button className="icon-btn" aria-label="Notifications">🔔</button>
          <button className="icon-btn" aria-label="Settings">⚙️</button>
          <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button className="btn logout-btn header-logout" type="button">
            Logout
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
