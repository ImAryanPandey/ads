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
import RequestIcon from '@mui/icons-material/Assignment';

const socket = io(`${import.meta.env.VITE_SOCKET_URL}`, { withCredentials: true });

function Sidebar({ role, open, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/chat/unread`, {
          method: 'GET',
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };
    fetchUnreadCount();

    socket.on('newMessage', (data) => {
      if (data.recipientId) setUnreadCount((prev) => prev + 1);
    });

    return () => {
      socket.off('newMessage');
    };
  }, []);

  const menuItems = role === 'owner'
    ? [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
        { text: 'Add AdSpace', icon: <AddBoxIcon />, path: '/add-adSpace' },
        { text: 'Requests', icon: <RequestIcon />, path: '/requests' },
        { text: 'Messages', icon: <MessageIcon />, path: '/messages', badge: unreadCount },
        { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
      ]
    : [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
        { text: 'Browse AdSpaces', icon: <SearchIcon />, path: '/browse-adSpaces' },
        { text: 'Requests', icon: <RequestIcon />, path: '/requests' },
        { text: 'Messages', icon: <MessageIcon />, path: '/messages', badge: unreadCount },
      ];

  const drawerContent = (
    <Box
      className="sidebar"
      sx={{
        width: 250,
        height: '100%',
        background: 'linear-gradient(180deg, var(--container-light) 0%, var(--primary-light) 100%)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography
          variant="h6"
          sx={{
            color: 'var(--primary-color)',
            fontWeight: 700,
            letterSpacing: '1px',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          AdSphere
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{
            color: 'var(--text)',
            '&:hover': {
              color: 'var(--primary-color)',
              backgroundColor: 'var(--primary-light)',
              transform: 'rotate(90deg)',
              transition: 'all 0.3s ease',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider sx={{ backgroundColor: 'var(--text-light)', opacity: 0.3, mx: 2 }} />
      <List sx={{ pt: 1 }}>
        {menuItems.map((item) => (
          <ListItem
            key={item.text}
            onClick={() => {
              if (item.text === 'Messages') setUnreadCount(0);
              navigate(item.path);
              onClose();
            }}
            sx={{
              mx: 1,
              my: 0.5,
              borderRadius: '8px',
              backgroundColor: location.pathname === item.path ? 'var(--primary-color)' : 'transparent',
              '&:hover': {
                backgroundColor: 'var(--primary-color)',
                cursor: 'pointer',
                '& .MuiListItemIcon-root': { color: 'white' },
                '& .MuiListItemText-primary': { color: 'white' },
              },
              transition: 'all 0.3s ease',
            }}
          >
            <ListItemIcon
              sx={{
                color: location.pathname === item.path ? 'white' : 'var(--text)',
                backgroundColor: location.pathname === item.path ? 'var(--primary-dark)' : 'var(--container-light)',
                borderRadius: '50%',
                p: 1,
                minWidth: '40px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease',
              }}
            >
              {item.badge > 0 ? (
                <Badge badgeContent={item.badge} color="error">
                  {item.icon}
                </Badge>
              ) : (
                item.icon
              )}
            </ListItemIcon>
            <ListItemText
              primary={item.text}
              primaryTypographyProps={{
                color: location.pathname === item.path ? 'white' : 'var(--text)',
                fontWeight: 500,
                fontFamily: 'Inter, sans-serif',
                transition: 'color 0.3s ease',
              }}
            />
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
          boxShadow: 'var(--shadow)',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}

export default Sidebar;