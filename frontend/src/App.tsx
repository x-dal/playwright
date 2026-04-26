import React, { useEffect } from 'react';
import { useStore } from './store/useStore';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TestBuilder from './components/TestBuilder';
import RunResults from './components/RunResults';
import BugTracker from './components/BugTracker';
import TestPlans from './components/TestPlans';
import ApiTester from './components/ApiTester';
import Requirements from './components/Requirements';
import ProjectsDashboard from './components/ProjectsDashboard';

export default function App() {
  const { activeProjectId, activeView, activeSuiteId, fetchSuites, fetchIssues, fetchTestPlans, fetchTestStrategies, fetchApiCollections, fetchRequirements } = useStore();

  // Whenever the active project changes, re-fetch all project-scoped data
  useEffect(() => {
    if (activeProjectId) {
      fetchSuites();
      fetchIssues();
      fetchTestPlans();
      fetchTestStrategies();
      fetchApiCollections();
      fetchRequirements();
    }
  }, [activeProjectId]);

  // No project selected → show the projects landing page (full screen, no sidebar)
  if (!activeProjectId) {
    return <ProjectsDashboard />;
  }

  return (
    <Layout>
      {activeView === 'dashboard'   && <Dashboard />}
      {(activeView === 'builder' || activeView === 'code') && activeSuiteId && <TestBuilder key={activeSuiteId} />}
      {activeView === 'runs'        && <RunResults />}
      {activeView === 'bugs'        && <BugTracker />}
      {activeView === 'plans'       && <TestPlans />}
      {activeView === 'api-tester'  && <ApiTester />}
      {activeView === 'requirements' && <Requirements />}
    </Layout>
  );
}
