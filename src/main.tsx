import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { registerSW } from './registerServiceWorker';
import { setupClientMockApi } from './services/clientMockApi';
import './index.css';

// Initialize resilient API fallback for pure cloud/static deployments
setupClientMockApi();
registerSW();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
