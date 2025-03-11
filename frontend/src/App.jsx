import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import GlobalStyles from './GlobalStyles';
import ThemeToggle from './ThemeToggle';
import Login from './components/Login';
import Register from './components/Register';
import VerifyEmail from './components/VerifyEmail';
import VerifyOTP from './components/VerifyOTP';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import AddProperty from './components/AddProperty';
import BrowseProperties from './components/BrowseProperties';
import PropertyDetails from './components/PropertyDetails';
import { Box } from '@mui/material';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <GlobalStyles />
      <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 1000 }}>
        <ThemeToggle />
      </Box>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/verify-otp" element={<VerifyOTP />} /> 
        <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/add-property" element={<PrivateRoute><AddProperty /></PrivateRoute>} />
        <Route path="/browse-properties" element={<PrivateRoute><BrowseProperties /></PrivateRoute>} />
        <Route path="/property/:id" element={<PrivateRoute><PropertyDetails /></PrivateRoute>} />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;