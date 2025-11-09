import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { ToastProvider } from './components/ToastProvider';


createRoot(document.getElementById('root')!).render(
<BrowserRouter>
<ToastProvider>
<App />
</ToastProvider>
</BrowserRouter>
);
