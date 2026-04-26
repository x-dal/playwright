import React, { useEffect } from 'react';
import { useStore } from './store/useStore';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TestBuilder from './components/TestBuilder';
import RunResults from './components/RunResults';

export default function App() {
  const { activeView, fetchSuites, activeSuiteId } = useStore();

  useEffect(() => { fetchSuites(); }, []);

  return (
    <Layout>
      {activeView === 'dashboard' && <Dashboard />}
      {(activeView === 'builder' || activeView === 'code') && activeSuiteId && <TestBuilder key={activeSuiteId} />}
      {activeView === 'runs' && <RunResults />}
    </Layout>
  );
}
