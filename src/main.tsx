import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

if (
  import.meta.env.PROD &&
  typeof window !== 'undefined' &&
  typeof window.console?.log === 'function'
) {
  if ((window as any).DEBUG_LOGS !== true) {
    ['log', 'info', 'debug'].forEach(method => {
      try {
        (console as any)[method] = () => { };
      } catch {
        // ignore
      }
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
