import { Analytics } from '@vercel/analytics/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  prepareAnalyticsEvent,
  shouldEnableWebAnalytics,
} from './analytics.js';
import App from './App.jsx';
import './index.css';

const webAnalyticsEnabled = shouldEnableWebAnalytics(window.location.hostname);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    {webAnalyticsEnabled && (
      <Analytics
        beforeSend={prepareAnalyticsEvent}
        mode={import.meta.env.PROD ? 'production' : 'development'}
      />
    )}
  </StrictMode>
);
