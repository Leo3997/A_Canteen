import { useState } from 'react';
import Dashboard from './components/Dashboard';
import { LoginPage } from './components/LoginPage';
import { ClickSpark, FuzzyOverlay } from './components/ui/animated-components';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <>
      <ClickSpark />
      <FuzzyOverlay />
      {!isAuthenticated ? (
        <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />
      ) : (
        <Dashboard />
      )}
    </>
  );
}

export default App;
