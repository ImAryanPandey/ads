// frontend/src/components/ChatComponent.jsx
import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { toast } from 'react-toastify';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import LoadingSpinner from './LoadingSpinner.jsx';

const socket = io('http://localhost:5000', { withCredentials: true });

function ChatComponent({ requestId, adSpaceId }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Fetch current user
    const fetchUser = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch user');
        const data = await response.json();
        setUser(data);
      } catch (error) {
        console.error('Error fetching user:', error);
        toast.error('Failed to load user data');
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    // Fetch historical messages
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `http://localhost:5000/api/chat/messages/request/${requestId}`,
          {
            method: 'GET',
            credentials: 'include',
          }
        );
        if (!response.ok) throw new Error('Failed to fetch messages');
        const data = await response.json();
        setMessages(data);

        // Mark messages as read
        const unreadMessages = data.filter(
          (msg) => msg.recipient._id === user?._id && !msg.read
        );
        if (unreadMessages.length > 0) {
          await fetch(`http://localhost:5000/api/chat/mark-read/${requestId}`, {
            method: 'POST',
            credentials: 'include',
          });
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchMessages();

    // Join the room for this request
    socket.emit('joinRoom', requestId);

    // Listen for new messages
    socket.on('message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off('message');
    };
  }, [requestId, user]);

  const sendMessage = () => {
    if (!message.trim() || !user) return;

    const recipient = user.role === 'owner' ? 'advertiser' : 'owner';
    socket.emit('sendMessage', {
      room: requestId,
      message,
      sender: user._id,
      adSpaceId,
      recipient,
    });
    setMessage('');
  };

  if (loading) return <LoadingSpinner message="Loading chat..." />;

  // Group messages by AdSpace and date
  const groupedMessages = messages.reduce((acc, msg) => {
    const date = new Date(msg.timestamp).toLocaleDateString();
    const key = `${msg.adSpaceId._id}_${date}`;
    if (!acc[key]) {
      acc[key] = {
        adSpace: msg.adSpaceId.title,
        date,
        messages: [],
      };
    }
    acc[key].messages.push(msg);
    return acc;
  }, {});

  return (
    <Box
      sx={{
        mt: 2,
        p: 2,
        backgroundColor: 'var(--container-light)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow)',
        maxHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography variant="h6" sx={{ color: 'var(--text)', mb: 2 }}>
        Chat
      </Typography>
      <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2 }}>
        {Object.values(groupedMessages).map((group, index) => (
          <Box key={index} sx={{ mb: 2 }}>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                textAlign: 'center',
                color: 'var(--text-light)',
                mb: 1,
                bgcolor: 'var(--background)',
                p: 1,
                borderRadius: '8px',
              }}
            >
              {group.adSpace} - {group.date}
            </Typography>
            <List>
              {group.messages.map((msg, msgIndex) => (
                <ListItem
                  key={msgIndex}
                  sx={{
                    justifyContent:
                      msg.sender._id === user?._id ? 'flex-end' : 'flex-start',
                    p: 0.5,
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '70%',
                      bgcolor:
                        msg.sender._id === user?._id
                          ? 'var(--primary-color)'
                          : 'var(--background)',
                      color:
                        msg.sender._id === user?._id ? 'white' : 'var(--text)',
                      p: 1,
                      borderRadius: '12px',
                      boxShadow: 'var(--shadow)',
                    }}
                  >
                    <ListItemText
                      primary={msg.content}
                      secondary={
                        msg.sender._id === user?._id ? 'You' : msg.sender.name
                      }
                      primaryTypographyProps={{
                        fontSize: '0.9rem',
                      }}
                      secondaryTypographyProps={{
                        fontSize: '0.7rem',
                        color:
                          msg.sender._id === user?._id
                            ? 'rgba(255,255,255,0.7)'
                            : 'var(--text-light)',
                      }}
                    />
                  </Box>
                </ListItem>
              ))}
            </List>
            {index < Object.values(groupedMessages).length - 1 && (
              <Divider sx={{ my: 1 }} />
            )}
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          fullWidth
          size="small"
          sx={{
            backgroundColor: 'var(--background)',
            borderRadius: '8px',
            '& .MuiInputBase-input': { color: 'var(--text)' },
          }}
        />
        <Button
          variant="contained"
          onClick={sendMessage}
          disabled={!message.trim()}
          sx={{
            backgroundColor: 'var(--primary-color)',
            '&:hover': { backgroundColor: 'var(--primary-dark)' },
            borderRadius: '8px',
          }}
        >
          Send
        </Button>
      </Box>
    </Box>
  );
}

export default ChatComponent;