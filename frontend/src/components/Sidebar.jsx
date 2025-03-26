// frontend/src/components/Sidebar.jsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, List, ListItem, ListItemIcon, ListItemText, Divider, Typography } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AddBoxIcon from '@mui/icons-material/AddBox';
import SearchIcon from '@mui/icons-material/Search';
import MessageIcon from '@mui/icons-material/Message';
import AnalyticsIcon from '@mui/icons-material/Analytics';

function Sidebar({ role }) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = role === 'owner' ? [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Add AdSpace', icon: <AddBoxIcon />, path: '/add-adSpace' },
    { text: 'Messages', icon: <MessageIcon />, path: '/messages' },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
  ] : [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Browse AdSpaces', icon: <SearchIcon />, path: '/browse-adSpaces' },
    { text: 'Messages', icon: <MessageIcon />, path: '/messages' },
  ];

  return (
    <Box
      sx={{
        width: 250,
        height: '100vh',
        backgroundColor: 'var(--container-light)',
        boxShadow: 'var(--shadow)',
        position: 'fixed',
        top: 0,
        left: 0,
        overflowY: 'auto',
      }}
    >
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: 'var(--primary-color)', fontWeight: 600 }}>
          AdSpace Platform
        </Typography>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => navigate(item.path)}
            sx={{
              backgroundColor: location.pathname === item.path ? 'var(--primary-light)' : 'transparent',
              '&:hover': { backgroundColor: 'var(--primary-light)' },
            }}
          >
            <ListItemIcon sx={{ color: 'var(--text)' }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} primaryTypographyProps={{ color: 'var(--text)' }} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

export default Sidebar;