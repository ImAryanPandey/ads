// frontend/src/components/ChatPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Box, Typography, CircularProgress } from '@mui/material';
import ChatComponent from './ChatComponent';

function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchConversation = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/requests/my`, {
          method: 'GET',
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error('Failed to fetch requests');
        }
        const requests = await response.json();
        const request = requests.find((req) => req._id === conversationId);
        if (!request) {
          // If conversationId is not a requestId, try fetching the conversation directly
          const convResponse = await fetch(`${import.meta.env.VITE_API_URL}/chat/conversation/request/${conversationId}`, {
            method: 'GET',
            credentials: 'include',
          });
          if (!convResponse.ok) {
            throw new Error('Failed to fetch conversation');
          }
          const convData = await convResponse.json();
          setConversation({ ...convData, request });
        } else {
          const convResponse = await fetch(`${import.meta.env.VITE_API_URL}/chat/conversation/request/${conversationId}`, {
            method: 'GET',
            credentials: 'include',
          });
          if (!convResponse.ok) {
            throw new Error('Failed to fetch conversation');
          }
          const convData = await convResponse.json();
          setConversation({ ...convData, request });
        }
      } catch (err) {
        setError(err.message);
        toast.error(err.message);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchConversation();
  }, [conversationId, navigate]);

  if (loading) {
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
      <ChatComponent conversation={conversation} />
    </Box>
  );
}

export default ChatPage;