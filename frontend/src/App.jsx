import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login.jsx';
import Register from './components/Register.jsx';
import VerifyEmail from './components/VerifyEmail.jsx';
import Onboarding from './components/Onboarding.jsx';
import Dashboard from './components/Dashboard.jsx';
import AddProperty from './components/AddProperty.jsx';
import BrowseProperties from './components/BrowseProperties.jsx';
import PropertyDetails from './components/PropertyDetails.jsx';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
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