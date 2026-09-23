import React from 'react';
import { OrchestrationProvider } from './context/OrchestrationContext';
import { AuthGateway } from './components/AuthGateway';
import { Dashboard } from './components/Dashboard';

export const App: React.FC = () => {
  return (
    <OrchestrationProvider>
      <AuthGateway>
        <Dashboard />
      </AuthGateway>
    </OrchestrationProvider>
  );
};

export default App;
