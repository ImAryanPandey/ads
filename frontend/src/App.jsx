// frontend/src/App.jsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import GlobalStyles from './GlobalStyles';
import ThemeToggle from './ThemeToggle';
import Sidebar from './components/Sidebar.jsx';
import ProfileDropdown from './components/ProfileDropdown.jsx';
import Login from './components/Login.jsx';
import Register from './components/Register.jsx';
import VerifyEmail from './components/VerifyEmail.jsx';
import VerifyOTP from './components/VerifyOTP.jsx';
import Onboarding from './components/Onboarding.jsx';
import Dashboard from './components/Dashboard.jsx';
import AddAdSpace from './components/AddAdSpace.jsx';
import BrowseAdSpaces from './components/BrowseAdSpaces.jsx';
import AdSpaceDetails from './components/AdSpaceDetails.jsx';
import AnalyticsDashboard from './components/AnalyticsDashboard.jsx';
import EditAdSpace from './components/EditAdSpace.jsx'; // Import EditAdSpace
import ChatPage from './components/ChatPage.jsx'; // Import ChatPage
import { Box, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

const PrivateRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) return null;

  return isAuthenticated ? children : <Navigate to="/login" />;
};

function AppContent() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  const hideSidebar = location.pathname === '/login' || location.pathname === '/register';

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setRole(data.role);
        } else {
          setRole(null);
        }
      } catch (error) {
        setRole(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUserRole();
  }, []);

  if (loading) return null;

  return (
    <Box sx={{ display: 'flex' }}>
      {!hideSidebar && role && (
        <>
          <IconButton
            onClick={() => setDrawerOpen(true)}
            sx={{
              position: 'fixed',
              top: 16,
              left: 16,
              zIndex: 1200,
              color: 'var(--text)',
            }}
          >
            <MenuIcon />
          </IconButton>
          <Sidebar
            role={role}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
          />
        </>
      )}
      <Box
        sx={{
          flexGrow: 1,
          p: hideSidebar ? 0 : 3,
        }}
      >
        <Box
          sx={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 1000,
            display: 'flex',
            gap: 2,
            alignItems: 'center',
          }}
        >
          {role && !hideSidebar && <ProfileDropdown />}
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
          <Route path="/edit-adSpace/:id" element={<PrivateRoute><EditAdSpace /></PrivateRoute>} /> {/* Added EditAdSpace route */}
          <Route path="/browse-adSpaces" element={<PrivateRoute><BrowseAdSpaces /></PrivateRoute>} />
          <Route path="/adSpace/:id" element={<PrivateRoute><AdSpaceDetails /></PrivateRoute>} />
          <Route path="/analytics" element={<PrivateRoute><AnalyticsDashboard /></PrivateRoute>} />
          <Route path="/chat/:requestId/:adSpaceId" element={<PrivateRoute><ChatPage /></PrivateRoute>} /> {/* Added ChatPage route */}
          <Route path="/messages" element={<PrivateRoute><div>Messages Page (To be implemented)</div></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <Router>
      <GlobalStyles />
      <AppContent />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </Router>
  );
}

export default App;