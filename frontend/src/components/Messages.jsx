import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Typography,
  Divider,
  CircularProgress,
  Badge,
} from '@mui/material';
import io from 'socket.io-client';
import { toast } from 'react-toastify';

const socket = io('http://localhost:5000', { withCredentials: true });

function Messages() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });
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
        const convResponse = await fetch(`${import.meta.env.VITE_API_URL}/chat/conversations/my`, {
          method: 'GET',
          credentials: 'include',
        });
        if (!convResponse.ok) throw new Error('Failed to fetch conversations');
        const conversationsData = await convResponse.json();

        const convs = await Promise.all(
          conversationsData.map(async (conv) => {
            const msgResponse = await fetch(
              `${import.meta.env.VITE_API_URL}/chat/messages/conversation/${conv._id}?page=1`,
              {
                method: 'GET',
                credentials: 'include',
              }
            );
            if (!msgResponse.ok) return null;
            const msgData = await msgResponse.json();
            const lastMessage = msgData.messages[msgData.messages.length - 1];

            const unreadResponse = await fetch(
              `${import.meta.env.VITE_API_URL}/chat/unread/${conv._id}`,
              {
                method: 'GET',
                credentials: 'include',
              }
            );
            const unreadData = await unreadResponse.json();

            const otherParticipant = conv.participants.find(p => p._id.toString() !== userId);
            const adSpace = conv.adSpaces[0]; // First adSpace for simplicity

            return {
              conversationId: conv._id,
              otherParticipant,
              adSpace,
              lastMessage,
              unreadCount: unreadData.unreadCount || 0,
            };
          })
        );
        setConversations(convs.filter(conv => conv && conv.lastMessage));
      } catch (err) {
        setError(err.message);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();

    socket.on('message', () => {
      fetchConversations();
    });

    return () => {
      socket.off('message');
    };
  }, [userId]);

  if (loading || !userId) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" sx={{ textAlign: 'center', mt: 4 }}>
        {error}
      </Typography>
    );
  }

  return (
    <Box sx={{ p: 3, mt: 8, backgroundColor: 'var(--background)', minHeight: 'calc(100vh - 64px)' }}>
      <Typography variant="h5" sx={{ mb: 2, color: 'var(--primary-color)' }}>
        Messages
      </Typography>
      <Box sx={{ maxWidth: '800px', mx: 'auto', border: '1px solid var(--text-light)', borderRadius: '12px', backgroundColor: 'var(--container-light)', boxShadow: 'var(--shadow)' }}>
        <List>
          {conversations.length === 0 ? (
            <Typography sx={{ p: 2, color: 'var(--text-light)' }}>
              No conversations yet.
            </Typography>
          ) : (
            conversations.map((conv) => (
              <React.Fragment key={conv.conversationId}>
                <ListItem
                  button
                  onClick={() => navigate(`/chat/${conv.conversationId}`)}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'var(--primary-light)',
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Badge badgeContent={conv.unreadCount} color="error">
                        <Typography sx={{ fontWeight: conv.unreadCount > 0 ? 600 : 400 }}>
                          {conv.otherParticipant.name} - {conv.adSpace?.title || 'No AdSpace'}
                        </Typography>
                      </Badge>
                    }
                    secondary={conv.lastMessage?.content || 'No messages yet'}
                    primaryTypographyProps={{ color: 'var(--text)' }}
                    secondaryTypographyProps={{ color: 'var(--text-light)' }}
                  />
                </ListItem>
                <Divider />
              </React.Fragment>
            ))
          )}
        </List>
      </Box>
    </Box>
  );
}

export default Messages;