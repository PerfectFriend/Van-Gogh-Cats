import '@vitejs/plugin-react/preamble';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeStyleProvider } from './context/ThemeStyleContext';

// Register Service Worker for PWA Android support and offline caching
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
  try {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('Van Gogh Cats Gallery: New update ready.');
      },
      onOfflineReady() {
        console.log('Van Gogh Cats Gallery: Offline ready.');
      },
    });
  } catch (err) {
    console.debug('Service Worker registration skipped:', err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <ThemeStyleProvider>
        <App />
      </ThemeStyleProvider>
    </LanguageProvider>
  </StrictMode>,
);
