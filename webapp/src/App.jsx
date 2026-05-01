import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Backup from './pages/Backup';
import Preferences from './pages/Preferences';
import Storage from './pages/Storage';
import System from './pages/System';
import Maintenance from './pages/Maintenance';
import ServiceConnections from './pages/ServiceConnections';
import Network from './pages/Network';
import Devices from './pages/Devices';
import ScrapedUI from './pages/ScrapedUI';
import MockControls from './components/MockControls';
import View from './pages/View';

function RedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const redirect = params.get('redirect');
    if (redirect) {
      params.delete('redirect');
      const newSearch = params.toString();
      navigate(redirect + (newSearch ? '?' + newSearch : ''), { replace: true });
    }
  }, [location.search, navigate]);

  return null;
}

function App() {
  return (
    <>
      <Layout>
        <RedirectHandler />
        <Routes>
          <Route path="/" element={<Backup />} />
          <Route path="/view" element={<View />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/integrations" element={<ServiceConnections />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/storage" element={<Storage />} />
          <Route path="/network" element={<Network />} />
          <Route path="/system" element={<System />} />
          <Route path="/preferences" element={<Preferences />} />
          <Route path="/scrape" element={<ScrapedUI />} />

          {/* Legacy redirects — keep for one release after the rename so external
              links and bookmarks resolve. Remove in a follow-up change. */}
          <Route path="/setup" element={<Navigate to="/preferences" replace />} />
          <Route path="/tools" element={<Navigate to="/storage" replace />} />
          <Route path="/sysinfo" element={<Navigate to="/system" replace />} />
        </Routes>
      </Layout>
      <MockControls />
    </>
  );
}

export default App;
