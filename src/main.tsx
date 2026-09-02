import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Analytics} from '@vercel/analytics/react';
import App from './App.tsx';
import AdminDashboard from './AdminDashboard.tsx';
import './index.css';

const isAdmin = window.location.pathname.replace(/\/+$/, '') === '/admin';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdmin ? <AdminDashboard /> : <App />}
    <Analytics
      beforeSend={(event) => {
        try {
          const url = new URL(event.url, window.location.origin);
          if (url.pathname.replace(/\/+$/, '') === '/admin') return null;
          url.search = '';
          url.hash = '';
          return { ...event, url: url.toString() };
        } catch {
          return null;
        }
      }}
    />
  </StrictMode>,
);
