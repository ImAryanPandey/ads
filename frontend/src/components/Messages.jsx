import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Box, List, ListItem, ListItemText, Typography, Divider, CircularProgress, Avatar, Badge } from '@mui/material';
import io from 'socket.io-client';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import ChatComponent from './ChatComponent';

const socket = io('http://localhost:5000', { withCredentials: true });

function Messages() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [openChat, setOpenChat] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState(null);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '');
        const response = await fetch(`${baseUrl}/auth/me`, { method: 'GET', credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch user ID');
        const data = await response.json();
        setUserId(data._id);
      } catch (err) {
        toast.error('Failed to authenticate user');
        setError(err.message);
      }
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchConversations = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '');
        const response = await fetch(`${baseUrl}/chat/conversations`, {
          method: 'GET',
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch conversations');
        const conversationsData = await response.json();
        setConversations(conversationsData);
      } catch (err) {
        setError(err.message);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();

    socket.on('message', () => fetchConversations());

    return () => socket.off('message');
  }, [userId]);

  const handleOpenChat = (conversationId) => {
    setSelectedConversationId(conversationId);
    setOpenChat(true);
  };

  const handleCloseChat = () => {
    setOpenChat(false);
    setSelectedConversationId(null);
  };

  if (loading || !userId) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Typography color="var(--text-error)" sx={{ textAlign: 'center', mt: 4 }}>{error}</Typography>;
  }

  return (
    <Box sx={{ p: 3, mt: 8, backgroundColor: 'var(--background)', minHeight: 'calc(100vh - 64px)' }}>
      <Typography variant="h5" sx={{ mb: 2, color: 'var(--primary-color)' }}>Messages</Typography>
      <Box sx={{ maxWidth: '600px', mx: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--container-light)', boxShadow: 'var(--shadow)' }}>
        <List>
          {conversations.length === 0 ? (
            <Typography sx={{ p: 2, color: 'var(--text-light)' }}>No conversations yet.</Typography>
          ) : (
            conversations.map((conv) => (
              <React.Fragment key={conv._id}>
                <ListItem button onClick={() => handleOpenChat(conv._id)} sx={{ '&:hover': { backgroundColor: 'var(--hover-color)' }, p: 1 }}>
                  <Avatar sx={{ mr: 2, bgcolor: 'var(--primary-color)' }}>{conv.otherParticipant.name.charAt(0)}</Avatar>
                  <ListItemText
                    primary={
                      <Badge badgeContent={conv.unreadCount} color="error">
                        <Typography sx={{ fontWeight: conv.unreadCount > 0 ? 600 : 400, color: 'var(--text)' }}>
                          {conv.otherParticipant.name} - {conv.adSpace?.title || 'No AdSpace'}
                        </Typography>
                      </Badge>
                    }
                    secondary={conv.lastMessage?.content || 'No messages yet'}
                    secondaryTypographyProps={{ color: 'var(--text-light)', fontSize: '14px' }}
                  />
                </ListItem>
                <Divider sx={{ backgroundColor: 'var(--border-color)', opacity: 0.3 }} />
              </React.Fragment>
            ))
          )}
        </List>
      </Box>
      <Dialog open={openChat} onClose={handleCloseChat} maxWidth="md" fullWidth>
        <DialogTitle>
          {conversations.find(c => c._id === selectedConversationId)?.title || 'Chat'}
          <IconButton onClick={handleCloseChat} sx={{ position: 'absolute', top: 8, right: 8, color: 'var(--text)' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedConversationId && <ChatComponent conversationId={selectedConversationId} userId={userId} onClose={handleCloseChat} title={conversations.find(c => c._id === selectedConversationId)?.title} />}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default Messages;