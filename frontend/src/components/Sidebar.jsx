// frontend/src/components/Sidebar.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Badge,
  IconButton,
  Drawer,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AddBoxIcon from '@mui/icons-material/AddBox';
import SearchIcon from '@mui/icons-material/Search';
import MessageIcon from '@mui/icons-material/Message';
import AnalyticsIcon from '@mui/icons-material/Analytics';

const socket = io('http://localhost:5000', { withCredentials: true });

function Sidebar({ role, open, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/chat/unread', {
          method: 'GET',
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.unreadCount);
        }
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };
    fetchUnreadCount();

    socket.on('message', () => {
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      socket.off('message');
    };
  }, []);

  const menuItems = role === 'owner' ? [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Add AdSpace', icon: <AddBoxIcon />, path: '/add-adSpace' },
    { text: 'Messages', icon: <MessageIcon />, path: '/messages', badge: unreadCount },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
  ] : [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Browse AdSpaces', icon: <SearchIcon />, path: '/browse-adSpaces' },
    { text: 'Messages', icon: <MessageIcon />, path: '/messages', badge: unreadCount },
  ];

  const drawerContent = (
    <Box
      sx={{
        width: 250,
        height: '100%',
        backgroundColor: 'var(--container-light)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <Box sx={{ p: 2, textAlign: 'center', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ color: 'var(--primary-color)', fontWeight: 600 }}>
          AdSphere
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon sx={{ color: 'var(--text)' }} />
        </IconButton>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => {
              if (item.text === 'Messages') setUnreadCount(0);
              navigate(item.path);
              onClose();
            }}
            sx={{
              backgroundColor: location.pathname === item.path ? 'var(--primary-light)' : 'transparent',
              '&:hover': {
                backgroundColor: 'var(--primary-light)',
                cursor: 'pointer', // Hand cursor on hover
              },
              transition: 'background-color 0.3s ease', // Smooth hover transition
            }}
          >
            <ListItemIcon sx={{ color: 'var(--text)' }}>
              {item.badge ? (
                <Badge badgeContent={item.badge} color="error">
                  {item.icon}
                </Badge>
              ) : (
                item.icon
              )}
            </ListItemIcon>
            <ListItemText primary={item.text} primaryTypographyProps={{ color: 'var(--text)' }} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          boxSizing: 'border-box',
          width: 250,
          backgroundColor: 'var(--container-light)',
          boxShadow: 'var(--shadow)',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}

export default Sidebar;