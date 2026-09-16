import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ErrorBoundary} from './components/ErrorBoundary';
import './index.css';

// Register Service Worker for PWA support (HTTP/HTTPS only)
if (
  'serviceWorker' in navigator &&
  typeof window !== 'undefined' &&
  window.location.protocol.startsWith('http') &&
  process.env.NODE_ENV === 'production'
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.log('SW registration error:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="জীবন টেইলার্স চালু হতে সমস্যা হয়েছে">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
