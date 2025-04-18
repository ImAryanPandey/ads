import React, { useEffect, useState, createContext } from 'react';
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
import Requests from './components/Requests';
import AddAdSpace from './components/AddAdSpace.jsx';
import BrowseAdSpaces from './components/BrowseAdSpaces.jsx';
import AdSpaceDetails from './components/AdSpaceDetails.jsx';
import AnalyticsDashboard from './components/AnalyticsDashboard.jsx';
import EditAdSpace from './components/EditAdSpace.jsx';
import Messages from './components/Messages.jsx';
import { Box, IconButton, CircularProgress } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

// Create a context for user data
export const UserContext = createContext();

const PrivateRoute = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
          method: 'GET',
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user || data); // Set the full user object
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Authentication check error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return user ? (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  ) : (
    <Navigate to="/login" />
  );
};

function AppContent() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const hideSidebar = location.pathname === '/login' || location.pathname === '/register';

  return (
    <Box sx={{ display: 'flex' }}>
      {!hideSidebar && (
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
          <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
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
          {!hideSidebar && <ProfileDropdown />}
          <ThemeToggle />
        </Box>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route
            path="/onboarding"
            element={
              <PrivateRoute>
                <Onboarding />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/requests"
            element={
              <PrivateRoute>
                <Requests mode="standalone" />
              </PrivateRoute>
            }
          />
          <Route
            path="/add-adSpace"
            element={
              <PrivateRoute>
                <AddAdSpace />
              </PrivateRoute>
            }
          />
          <Route
            path="/edit-adSpace/:id"
            element={
              <PrivateRoute>
                <EditAdSpace />
              </PrivateRoute>
            }
          />
          <Route
            path="/browse-adSpaces"
            element={
              <PrivateRoute>
                <BrowseAdSpaces />
              </PrivateRoute>
            }
          />
          <Route
            path="/adSpace/:id"
            element={
              <PrivateRoute>
                <AdSpaceDetails />
              </PrivateRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <PrivateRoute>
                <AnalyticsDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <PrivateRoute>
                <Messages />
              </PrivateRoute>
            }
          />
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