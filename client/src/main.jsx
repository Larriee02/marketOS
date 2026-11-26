import React from 'react';
import ReactDOM from 'react-dom/client';
import { PrivacyPage } from './pages/PrivacyPage';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/^\/privacy\/?$/.test(window.location.pathname) ? <PrivacyPage /> : <App />}
  </React.StrictMode>
);
