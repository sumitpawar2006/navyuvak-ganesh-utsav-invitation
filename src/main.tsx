import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Analytics} from '@vercel/analytics/react';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics
      beforeSend={(event) => {
        try {
          const url = new URL(event.url, window.location.origin);
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
