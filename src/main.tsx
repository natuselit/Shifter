import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/app';
import { registerAppServiceWorker } from './app/pwa';
import './app/styles/global.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

registerAppServiceWorker();
