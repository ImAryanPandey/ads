import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, TextField, Button, List, ListItem, ListItemText, IconButton, CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import pako from 'pako';

function ChatComponent({ conversationId, userId, onClose, title }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [participantNames, setParticipantNames] = useState({});
  const messagesEndRef = useRef(null);
  const messagesListRef = useRef(null);
  const socketRef = useRef(null);
  const prevConversationIdRef = useRef(null);

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
    } catch (error) {
      console.error('Decompression failed:', error.message, 'for input:', content);
      toast.error('Failed to decode message. Contact support.');
      return content;
    }
  };

  const fetchParticipantNames = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/chat/conversations/${conversationId}/participants`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      console.log('Fetched participant names:', data);
      const namesMap = data.participants.reduce((acc, participant) => {
        acc[participant.userId] = participant.name || `User_${participant.userId.slice(-4)}`;
        return acc;
      }, {});
      setParticipantNames(namesMap);
    } catch (error) {
      console.error('Error fetching participant names:', error);
      toast.error('Failed to load participant names. Using fallback names.');
      setParticipantNames((prev) => ({
        ...prev,
        [userId]: 'You',
        ...messages.reduce((acc, msg) => {
          if (msg.sender && msg.sender.toString() !== userId && !acc[msg.sender]) {
            acc[msg.sender] = `User_${msg.sender.toString().slice(-4)}`;
          }
          return acc;
        }, {}),
      }));
    }
  };

  const fetchMessages = useCallback(async (skip = 0) => {
    if (!conversationId || loading) return;
    console.log('Fetching messages for conversationId:', conversationId, 'with skip:', skip);
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/chat/conversations/${conversationId}?skip=${skip}&limit=50`, {
        credentials: 'include',
      });
      console.log('Fetch response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to fetch messages: ${errorData.message || response.statusText}`);
      }
      const data = await response.json();
      console.log('Fetched messages data:', data);
      const newMessages = [...(data.messages || [])].map(msg => ({
        ...msg,
        content: decompressMessage(msg.content),
      })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      setMessages((prev) => (skip === 0 ? newMessages : [...prev, ...newMessages]));
      setHasMore(data.hasMore || false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages((prev) => [
        ...prev,
        { content: `Error: ${error.message}`, isSystem: true, timestamp: new Date().toISOString() },
      ]);
      toast.error(`Message load failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [conversationId, loading]);

  useEffect(() => {
    if (!conversationId || conversationId === prevConversationIdRef.current) return;
    console.log('Effect triggered for conversationId:', conversationId, 'with userId:', userId);
    prevConversationIdRef.current = conversationId;
    setMessages([]);
    setLoading(true);

    socketRef.current = io('http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      auth: { token: document.cookie.split('token=')[1]?.split(';')[0] || '' },
    });

    socketRef.current.on('connect', () => {
      console.log('Socket.IO connected for conversation:', conversationId);
      if (!messages.length) { // Only join and fetch if no messages yet
        socketRef.current.emit('joinRoom', conversationId, (response) => {
          console.log('Join room response:', response);
          if (response?.success) {
            fetchMessages(0);
            fetchParticipantNames();
          }
        });
      }
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err.message);
      toast.error('Chat server connection failed. Check backend.');
    });

    socketRef.current.on('message', (newMessage) => {
      console.log('Received new message via Socket.IO:', newMessage);
      const decompressedMessage = {
        ...newMessage,
        content: decompressMessage(newMessage.content || ''),
        sender: newMessage.sender || null,
        timestamp: newMessage.timestamp || new Date(),
      };
      setMessages((prev) => [...prev, decompressedMessage].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
    });

    socketRef.current.on('messageDeleted', (messageIndex) => {
      console.log('Message deleted at index:', messageIndex);
      setMessages((prev) => prev.filter((_, idx) => idx !== messageIndex));
    });

    socketRef.current.on('roomJoined', (data) => {
      console.log('Room joined:', data.message);
      toast.success(data.message);
      // Avoid re-fetching messages on room join if already loaded
    });

    socketRef.current.on('error', (error) => {
      console.log('Socket error:', error);
      toast.error(error.message);
    });

    fetchMessages(0);

    return () => {
      console.log('Cleaning up socket listeners for conversationId:', conversationId);
      if (socketRef.current) {
        socketRef.current.emit('leaveRoom', conversationId);
        setTimeout(() => {
          socketRef.current.off('connect');
          socketRef.current.off('connect_error');
          socketRef.current.off('message');
          socketRef.current.off('messageDeleted');
          socketRef.current.off('roomJoined');
          socketRef.current.off('error');
          socketRef.current.disconnect();
        }, 100);
      }
    };
  }, [conversationId, fetchMessages, userId]);

  const sendMessage = async () => {
    if (!message.trim() && !image) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('content', message);
      if (image) formData.append('image', image);

      const baseUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/chat/conversations/${conversationId}`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to send message: ${errorData.message || response.statusText}`);
      }
      const data = await response.json();
      console.log('Send message response:', data);
      // Force re-fetch to ensure message appears
      fetchMessages(0);
      setMessage('');
      setImage(null);
      toast.success('Message sent!');
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(`Failed to send: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      toast.success('Image selected!');
    } else {
      toast.error('Please select a valid image.');
      setImage(null);
    }
  };

  const deleteMessage = async (index) => {
    const msg = messages[index];
    if (msg.sender?.toString() === userId) {
      try {
        socketRef.current.emit('deleteMessage', { conversationId, messageIndex: index });
        if (msg.imageId) {
          const baseUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '');
          await fetch(`${baseUrl}/images/${msg.imageId}`, { method: 'DELETE', credentials: 'include' });
        }
        toast.success('Message deleted');
      } catch (error) {
        console.error('Error deleting:', error);
        toast.error('Delete failed');
      }
    } else {
      toast.error('Only delete your messages');
    }
  };

  const handleScroll = useCallback((e) => {
    if (e.target.scrollTop === 0 && hasMore && !loading) {
      const newSkip = messages.length;
      fetchMessages(newSkip);
    }
  }, [hasMore, loading, messages.length, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Box sx={{ p: 2, backgroundColor: 'var(--container-light)', borderRadius: '8px', boxShadow: 'var(--shadow)', maxHeight: '500px', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--primary-color)', color: 'white', p: 1, borderRadius: '8px 8px 0 0' }}>
        <Typography variant="h6" sx={{ ml: 2 }}>{title || 'Chat'}</Typography>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>
      {loading && messages.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '350px' }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <List
            ref={messagesListRef}
            sx={{ maxHeight: '350px', overflowY: 'auto', backgroundColor: 'var(--background)', p: 1, mb: 2, borderRadius: '0 0 8px 8px', flexGrow: 1 }}
            onScroll={handleScroll}
          >
            {messages.map((msg, index) => (
              <ListItem
                key={index}
                sx={{
                  justifyContent: msg.isSystem ? 'center' : (msg.sender?.toString() === userId ? 'flex-end' : 'flex-start'),
                  mb: 1,
                  maxWidth: '70%',
                }}
              >
                {msg.isSystem ? (
                  <ListItemText
                    primary={msg.content}
                    sx={{ color: 'var(--text-light)', textAlign: 'center', width: '100%', backgroundColor: '#e0e0e0', p: 0.5, borderRadius: '4px' }}
                  />
                ) : (
                  <Box
                    sx={{
                      backgroundColor: msg.sender?.toString() === userId ? 'var(--primary-light)' : 'var(--secondary-light)',
                      borderRadius: '8px',
                      p: 1,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.5,
                    }}
                  >
                    {msg.imageId && (
                      <img
                        src={`${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/images/${msg.imageId}`}
                        alt="Chat attachment"
                        style={{ maxWidth: '150px', maxHeight: '150px', borderRadius: '4px', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none'; toast.error('Image load failed'); }}
                      />
                    )}
                    <ListItemText
                      primary={`${msg.sender?.toString() === userId ? 'You' : participantNames[msg.sender] || 'Unknown User'}: ${msg.content}`}
                      secondary={new Date(msg.timestamp).toLocaleTimeString()}
                      primaryTypographyProps={{ color: 'var(--text)' }}
                      secondaryTypographyProps={{ color: 'var(--text-light)', fontSize: '12px' }}
                    />
                    {msg.sender?.toString() === userId && (
                      <IconButton onClick={() => deleteMessage(index)} sx={{ color: 'var(--text-light)', p: 0, alignSelf: 'flex-end' }}>
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                )}
              </ListItem>
            ))}
            <div ref={messagesEndRef} />
          </List>
          <Box sx={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--background)', p: 1, borderRadius: '0 0 8px 8px', boxShadow: '0 -1px 3px rgba(0,0,0,0.1)' }}>
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} id="file-upload" />
            <IconButton component="label" htmlFor="file-upload" sx={{ color: 'var(--primary-color)', mr: 1 }}>
              <AttachFileIcon />
            </IconButton>
            {image && <Typography sx={{ mr: 2, color: 'var(--text-light)', fontSize: '12px' }}>{image.name}</Typography>}
            <TextField
              fullWidth
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              variant="outlined"
              sx={{ mr: 1, '& .MuiOutlinedInput-root': { borderRadius: '20px', backgroundColor: 'var(--container-light)', p: '4px 12px' } }}
              disabled={loading}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            />
            <Button
              variant="contained"
              onClick={sendMessage}
              disabled={loading || (!message.trim() && !image)}
              sx={{ backgroundColor: 'var(--primary-color)', '&:hover': { backgroundColor: 'var(--primary-dark)' }, borderRadius: '20px', minWidth: '40px', p: '6px' }}
            >
              <SendIcon />
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}

export default ChatComponent;