import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { Box, TextField, Button, Typography } from '@mui/material';

const socket = io('http://localhost:5000');

function ChatComponent({ requestId }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    socket.emit('joinRoom', requestId);
    socket.on('message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => socket.off('message');
  }, [requestId]);

  const sendMessage = () => {
    if (message.trim()) {
      const token = localStorage.getItem('token');
      const decoded = JSON.parse(atob(token.split('.')[1]));
      socket.emit('sendMessage', { room: requestId, message, sender: decoded.id });
      setMessage('');
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6">Chat</Typography>
      <Box sx={{ maxHeight: 200, overflowY: 'auto', mb: 2 }}>
        {messages.map((msg, index) => (
          <Typography key={index}>{msg.sender}: {msg.message} ({new Date(msg.timestamp).toLocaleTimeString()})</Typography>
        ))}
      </Box>
      <TextField
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        fullWidth
        label="Type a message"
      />
      <Button onClick={sendMessage} variant="contained" sx={{ mt: 1 }}>Send</Button>
    </Box>
  );
}

export default ChatComponent;