import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Welcome from './pages/Welcome';
import Backup from './pages/Backup';
import Preferences from './pages/Preferences';
import Storage from './pages/Storage';
import System from './pages/System';
import Maintenance from './pages/Maintenance';
import Connections from './pages/Connections';
import Network from './pages/Network';
import Hardware from './pages/Hardware';
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
          <Route path="/" element={<Welcome />} />
          <Route path="/backup" element={<Backup />} />
          <Route path="/view" element={<View />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/integrations" element={<Connections />} />
          <Route path="/hardware" element={<Hardware />} />
          <Route path="/storage" element={<Storage />} />
          <Route path="/network" element={<Network />} />
          <Route path="/system" element={<System />} />
          <Route path="/preferences" element={<Preferences />} />
          <Route path="/scrape" element={<ScrapedUI />} />
        </Routes>
      </Layout>
      <MockControls />
    </>
  );
}

export default App;
