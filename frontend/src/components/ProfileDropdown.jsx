// frontend/src/components/ProfileDropdown.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import { toast } from 'react-toastify';
import { Box, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

function ProfileDropdown() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      toast.success('Logged out successfully!');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  return (
    <Box>
      <IconButton onClick={handleClick} sx={{ color: 'var(--text)' }}>
        <AccountCircleIcon />
        {user && (
          <Typography sx={{ ml: 1, color: 'var(--text)' }}>
            {user.name}
          </Typography>
        )}
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={() => { handleClose(); navigate('/profile'); }}>
          Profile
        </MenuItem>
        <MenuItem onClick={() => { handleClose(); handleLogout(); }}>
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default ProfileDropdown;