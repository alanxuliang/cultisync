import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SiteLayout from './website/SiteLayout.jsx';
import WebsiteHome from './website/WebsiteHome.jsx';
import BetaApp from './app/BetaApp.jsx';
import LegalPage from './website/LegalPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<WebsiteHome />} />
      </Route>
      <Route path="/app" element={<BetaApp />} />
      <Route path="/terms" element={<LegalPage kind="terms" />} />
      <Route path="/privacy" element={<LegalPage kind="privacy" />} />
      <Route path="/cookies" element={<LegalPage kind="cookies" />} />
      {/* Removed surfaces send old links to the homepage. */}
      <Route path="/demo/*" element={<Navigate to="/" replace />} />
      <Route path="/pricing/*" element={<Navigate to="/" replace />} />
      <Route path="/simulator/*" element={<Navigate to="/" replace />} />
      <Route path="*" element={<main className="beta-shell"><h1>Page not found</h1><a href="/">Return to CultiSync</a></main>} />
    </Routes>
  );
}
