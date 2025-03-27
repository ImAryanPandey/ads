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
    console.log('Fetching conversation with ID:', conversationId);
    const fetchConversation = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

        // Fetch messages
        const messagesResponse = await fetch(`${import.meta.env.VITE_API_URL}/chat/messages/conversation/${conversationId}`, {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal,
        });

        if (!messagesResponse.ok) {
          const errorText = await messagesResponse.text();
          throw new Error(`Failed to fetch messages: ${errorText}`);
        }
        const messagesData = await messagesResponse.json();

        // Fetch the request associated with the conversation
        const requestResponse = await fetch(`${import.meta.env.VITE_API_URL}/chat/conversation/${conversationId}/request`, {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal,
        });

        if (!requestResponse.ok) {
          const errorText = await requestResponse.text();
          throw new Error(`Failed to fetch request: ${errorText}`);
        }
        const requestData = await requestResponse.json();

        setConversation({
          conversationId,
          messages: messagesData.messages,
          totalPages: messagesData.totalPages,
          currentPage: messagesData.currentPage,
          request: requestData,
        });
      } catch (err) {
        console.error('Error fetching conversation:', err);
        if (err.name === 'AbortError') {
          setError('Request timed out. Please try again.');
          toast.error('Request timed out. Please try again.');
        } else {
          setError(err.message);
          toast.error(err.message);
        }
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchConversation();
  }, [conversationId, navigate]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error" sx={{ textAlign: 'center', mt: 4 }}>{error}</Typography>;

  return (
    <Box sx={{ p: 3, mt: 8, backgroundColor: 'var(--background)', minHeight: 'calc(100vh - 64px)' }}>
      <ChatComponent conversation={conversation} />
    </Box>
  );
}

export default ChatPage;