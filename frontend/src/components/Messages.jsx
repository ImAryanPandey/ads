import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Box, List, ListItem, ListItemText, Typography, CircularProgress, Avatar, Badge, Dialog, DialogTitle, DialogContent, IconButton, Button, Divider } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { UserContext } from '../App';
import io from 'socket.io-client';
import pako from 'pako';
import ChatComponent from './ChatComponent';

const socket = io('http://localhost:5000', { withCredentials: true });

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error">Something went wrong: {this.state.error.message}</Typography>
          <Button variant="contained" color="primary" onClick={() => window.location.reload()} sx={{ mt: 2 }}>
            Reload
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

function Messages() {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openChat, setOpenChat] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState(null);

  useEffect(() => {
    if (!user?._id) {
      setLoading(false);
      toast.error('User not authenticated');
      navigate('/login');
      return;
    }

    const fetchConversations = async () => {
      try {
        setLoading(true);
        console.log('Fetching conversations for userId:', user._id);
        const baseUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '');
        const response = await fetch(`${baseUrl}/chat/conversations`, {
          method: 'GET',
          credentials: 'include',
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch conversations: ${response.status} - ${errorText}`);
        }
        const conversationsData = await response.json();
        console.log('Raw Conversations data:', conversationsData);
        const decompressedConversations = conversationsData.map(conv => ({
          ...conv,
          lastMessage: conv.lastMessage ? decompressMessage(conv.lastMessage.content) : null,
        }));
        setConversations(decompressedConversations || []);
      } catch (err) {
        console.error('Error fetching conversations:', err);
        setError(err.message);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    const decompressMessage = (content) => {
      try {
        if (!content || typeof content !== 'string') return content;
        if (content.match(/^[A-Za-z0-9+/=]+$/)) {
          const binaryString = atob(content);
          const byteArray = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            byteArray[i] = binaryString.charCodeAt(i);
          }
          const decompressed = pako.inflate(byteArray, { to: 'string' });
          return decompressed;
        }
        return content;
      } catch (e) {
        console.error('Decompression error:', e, 'for input:', content);
        toast.error('Failed to decode message. Contact support.');
        return content;
      }
    };

    fetchConversations();

    socket.on('connect', () => console.log('Socket connected'));
    socket.on('disconnect', () => console.log('Socket disconnected'));
    socket.on('newMessage', (data) => {
      if (data.recipientId === user._id) {
        console.log('New message received, refreshing conversations');
        fetchConversations();
      }
    });

    return () => {
      socket.off('newMessage');
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [user?._id, navigate]);

  const handleOpenChat = (conversationId) => {
    // Direct open, no backend call to avoid system message
    setSelectedConversationId(conversationId);
    setOpenChat(true);
  };

  const handleCloseChat = () => {
    setOpenChat(false);
    setSelectedConversationId(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
        <Button variant="contained" color="primary" onClick={() => navigate('/login')} sx={{ mt: 2 }}>
          Go to Login
        </Button>
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <Box sx={{ p: 3, mt: 8, backgroundColor: 'var(--background)', minHeight: 'calc(100vh - 64px)' }}>
        <Typography variant="h5" sx={{ mb: 2, color: 'var(--primary-color)' }}>
          Messages
        </Typography>
        <Box
          sx={{
            maxWidth: '600px',
            mx: 'auto',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            backgroundColor: 'var(--container-light)',
            boxShadow: 'var(--shadow)',
            overflow: 'hidden',
          }}
        >
          <List>
            {conversations.length === 0 ? (
              <Typography sx={{ p: 2, color: 'var(--text-light)' }}>No conversations yet.</Typography>
            ) : (
              conversations.map((conv) => (
                <React.Fragment key={conv._id}>
                  <ListItem
                    component="button" // Fixed warning by using component prop
                    onClick={() => handleOpenChat(conv._id)}
                    sx={{
                      '&:hover': { backgroundColor: 'var(--hover-color)' },
                      p: 1.5,
                      transition: 'background-color 0.3s ease',
                    }}
                  >
                    <Avatar
                      sx={{ mr: 2, bgcolor: 'var(--primary-color)' }}
                      src={conv.otherParticipant.profilePicture || undefined}
                    >
                      {conv.otherParticipant.name.charAt(0)}
                    </Avatar>
                    <ListItemText
                      primary={
                        <Badge badgeContent={conv.unreadCount} color="error" max={99}>
                          <Typography
                            sx={{
                              fontWeight: conv.unreadCount > 0 ? 600 : 400,
                              color: 'var(--text)',
                              fontSize: '16px',
                            }}
                          >
                            {conv.otherParticipant.name}
                          </Typography>
                        </Badge>
                      }
                      secondary={
                        conv.lastMessage ? (
                          <Typography
                            sx={{
                              color: 'var(--text-light)',
                              fontSize: '14px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '200px',
                            }}
                          >
                            {conv.lastMessage}
                          </Typography>
                        ) : (
                          <Typography sx={{ color: 'var(--text-light)', fontSize: '14px' }}>
                            No messages yet
                          </Typography>
                        )
                      }
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
            Chat with {conversations.find((c) => c._id === selectedConversationId)?.otherParticipant.name || 'Unknown'}
            <IconButton
              onClick={handleCloseChat}
              sx={{ position: 'absolute', top: 8, right: 8, color: 'var(--text)' }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {selectedConversationId && (
              <ChatComponent
                conversationId={selectedConversationId}
                userId={user._id}
                onClose={handleCloseChat}
                title={conversations.find((c) => c._id === selectedConversationId)?.otherParticipant.name || 'Chat'}
              />
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </ErrorBoundary>
  );
}

export default Messages;