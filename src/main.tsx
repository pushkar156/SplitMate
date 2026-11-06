import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Register PWA Service Worker for native app installation
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('PWA ServiceWorker registered:', reg.scope))
      .catch((err) => console.warn('PWA ServiceWorker error:', err));
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
