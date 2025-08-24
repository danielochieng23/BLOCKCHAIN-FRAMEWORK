import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, Container } from '@mui/material';

import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import IdentityPage from './pages/IdentityPage';
import CredentialsPage from './pages/CredentialsPage';
import VerificationPage from './pages/VerificationPage';
import ZKProofsPage from './pages/ZKProofsPage';
import LoginPage from './pages/LoginPage';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <div>Loading...</div>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Container maxWidth="xl" sx={{ flex: 1, py: 3 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/identity"
            element={
              isAuthenticated ? <IdentityPage /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/credentials"
            element={
              isAuthenticated ? <CredentialsPage /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/verification"
            element={
              isAuthenticated ? <VerificationPage /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/zkproofs"
            element={
              isAuthenticated ? <ZKProofsPage /> : <Navigate to="/login" />
            }
          />
        </Routes>
      </Container>
    </Box>
  );
}

export default App;