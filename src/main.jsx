import { Analytics } from '@vercel/analytics/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  prepareAnalyticsEvent,
  shouldEnableWebAnalytics,
} from './analytics.js';
import App from './App.jsx';
import DomainMigration from './components/DomainMigration.jsx';
import './index.css';
import { LEGACY_HOSTNAME } from './siteDomain.js';

const webAnalyticsEnabled = shouldEnableWebAnalytics(window.location.hostname);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {window.location.hostname === LEGACY_HOSTNAME ? (
      <DomainMigration />
    ) : (
      <App />
    )}
    {webAnalyticsEnabled && (
      <Analytics
        beforeSend={prepareAnalyticsEvent}
        mode={import.meta.env.PROD ? 'production' : 'development'}
      />
    )}
  </StrictMode>
);
