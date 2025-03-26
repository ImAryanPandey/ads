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
import AddAdSpace from './components/AddAdSpace';
import BrowseAdSpaces from './components/BrowseAdSpaces';
import AdSpaceDetails from './components/AdSpaceDetails';
import { Box } from '@mui/material';

const PrivateRoute = ({ children }) => {
  return children; // Trust server-side auth
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
        <Route path="/add-adSpace" element={<PrivateRoute><AddAdSpace /></PrivateRoute>} />
        <Route path="/browse-adSpaces" element={<PrivateRoute><BrowseAdSpaces /></PrivateRoute>} />
        <Route path="/adSpace/:id" element={<PrivateRoute><AdSpaceDetails /></PrivateRoute>} />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;