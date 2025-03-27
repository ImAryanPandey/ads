import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import {
  Box,
  TextField,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Avatar,
  IconButton,
  CircularProgress,
  InputAdornment,
  CardMedia,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { toast } from 'react-toastify';

const socket = io('http://localhost:5000', { withCredentials: true });

function ChatComponent({ conversation }) {
  const [messages, setMessages] = useState(conversation?.messages || []);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(conversation?.totalPages || 1);
  const [typingUser, setTypingUser] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch userId from cookies
  const [userId, setUserId] = useState(null);
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setUserId(data._id);
        } else {
          throw new Error('Failed to fetch user ID');
        }
      } catch (err) {
        toast.error('Failed to authenticate user');
        setError(err.message);
      }
    };
    fetchUserId();
  }, []);

  // Calculate otherParticipant after userId is fetched
  const otherParticipant = userId && conversation?.request
    ? userId === conversation.request.sender?._id
      ? conversation.request.owner
      : conversation.request.sender
    : null;

  // Update messages when conversation prop changes
  useEffect(() => {
    if (conversation?.messages) {
      setMessages(conversation.messages);
      setTotalPages(conversation.totalPages || 1);
      setPage(conversation.currentPage || 1);
    }
  }, [conversation]);

  // Socket setup
  useEffect(() => {
    if (!userId || !conversation?.conversationId) return;

    socket.emit('joinRoom', conversation.conversationId);

    socket.on('message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('messageDeleted', (messageId) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? { ...msg, deleted: true } : msg))
      );
    });

    socket.on('typing', (typingUserId) => {
      if (typingUserId !== userId) {
        setTypingUser(otherParticipant?.name || 'Someone');
      }
    });

    socket.on('stopTyping', (typingUserId) => {
      if (typingUserId !== userId) {
        setTypingUser(null);
      }
    });

    // Mark messages as read
    const markMessagesAsRead = async () => {
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/chat/mark-read/${conversation.conversationId}`, {
          method: 'POST',
          credentials: 'include',
        });
      } catch (err) {
        console.error('Error marking messages as read:', err);
      }
    };
    markMessagesAsRead();

    return () => {
      socket.off('message');
      socket.off('messageDeleted');
      socket.off('typing');
      socket.off('stopTyping');
    };
  }, [conversation?.conversationId, userId, otherParticipant]);

  // Scroll to the bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLoadMore = async () => {
    if (page >= totalPages) return;
    setLoadingMore(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/chat/messages/conversation/${conversation.conversationId}?page=${page + 1}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw new Error('Failed to load more messages');
      }
      const data = await response.json();
      setMessages((prev) => [...data.messages, ...prev]);
      setPage(page + 1);
      setTotalPages(data.totalPages);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          conversationId: conversation.conversationId,
          content: newMessage,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }
      setNewMessage('');
      socket.emit('stopTyping', { conversationId: conversation.conversationId, userId });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('attachment', file);

    try {
      const uploadResponse = await fetch(`${import.meta.env.VITE_API_URL}/chat/upload-attachment`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload attachment');
      }
      const attachment = await uploadResponse.json();

      const sendResponse = await fetch(`${import.meta.env.VITE_API_URL}/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          conversationId: conversation.conversationId,
          content: '',
          attachment: {
            type: attachment.type,
            fileId: attachment.fileId,
            filename: attachment.filename,
          },
        }),
      });
      if (!sendResponse.ok) {
        throw new Error('Failed to send attachment');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/chat/message/${messageId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to delete message');
      }
      socket.emit('deleteMessage', conversation.conversationId, messageId);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSearchMessages = async () => {
    if (!searchQuery.trim()) {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/chat/messages/conversation/${conversation.conversationId}?page=1`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );
      const data = await response.json();
      setMessages(data.messages);
      setPage(1);
      setTotalPages(data.totalPages);
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/chat/messages/conversation/${conversation.conversationId}/search?q=${searchQuery}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw new Error('Failed to search messages');
      }
      const data = await response.json();
      setMessages(data);
      setPage(1);
      setTotalPages(1);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleTyping = () => {
    socket.emit('typing', { conversationId: conversation.conversationId, userId });
    setTimeout(() => {
      socket.emit('stopTyping', { conversationId: conversation.conversationId, userId });
    }, 3000);
  };

  if (!userId) {
    return <Typography>Loading user...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  if (!otherParticipant) {
    return <Typography>Error: Unable to determine chat participant.</Typography>;
  }

  const groupedMessages = messages.reduce((acc, msg) => {
    const date = new Date(msg.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(msg);
    return acc;
  }, {});

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', maxWidth: '800px', mx: 'auto', border: '1px solid var(--text-light)', borderRadius: '12px', backgroundColor: 'var(--container-light)', boxShadow: 'var(--shadow)' }}>
      {/* Chat Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid var(--text-light)', display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: 'var(--primary-color)' }}>
          {otherParticipant.name?.charAt(0) || '?'}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ color: 'var(--primary-color)' }}>
            Chat with {otherParticipant.name}
          </Typography>
          {conversation.request && (
            <Typography variant="body2" sx={{ color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: 1 }}>
              AdSpace: {conversation.request.adSpace?.title || 'Unknown AdSpace'}
              {conversation.request.adSpace?.images?.length > 0 && (
                <CardMedia
                  component="img"
                  image={`${import.meta.env.VITE_API_URL}/images/${conversation.request.adSpace.images[0].imageId}`}
                  alt={conversation.request.adSpace.title}
                  sx={{ width: 40, height: 40, borderRadius: '4px', ml: 1 }}
                />
              )}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Search Bar */}
      <Box sx={{ p: 2, borderBottom: '1px solid var(--text-light)' }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearchMessages()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'var(--text-light)' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              backgroundColor: 'var(--background)',
              borderRadius: '8px',
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'var(--text-light)' },
                '&:hover fieldset': { borderColor: 'var(--primary-color)' },
              },
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearchMessages}
            sx={{ borderRadius: '8px', backgroundColor: 'var(--primary-color)', '&:hover': { backgroundColor: 'var(--primary-dark)' } }}
          >
            Search
          </Button>
        </Box>
      </Box>

      {/* Messages List */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, minHeight: '400px', maxHeight: '60vh' }}>
        {page < totalPages && (
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Button onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? <CircularProgress size={20} /> : 'Load More Messages'}
            </Button>
          </Box>
        )}
        <List>
          {Object.keys(groupedMessages).map((date, index) => (
            <Box key={index}>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  textAlign: 'center',
                  color: 'var(--text-light)',
                  bgcolor: 'var(--background)',
                  p: 1,
                  borderRadius: '8px',
                  mb: 2,
                }}
              >
                {date}
              </Typography>
              {groupedMessages[date].map((msg, msgIndex) => (
                <ListItem
                  key={msg._id}
                  sx={{
                    justifyContent: msg.type === 'system' ? 'center' : (msg.sender._id === userId ? 'flex-end' : 'flex-start'),
                    mb: 1,
                    p: 0,
                  }}
                >
                  {msg.type === 'system' ? (
                    <Typography
                      sx={{
                        fontStyle: 'italic',
                        color: 'var(--text-light)',
                        bgcolor: 'var(--background)',
                        p: 1,
                        borderRadius: '8px',
                        textAlign: 'center',
                      }}
                    >
                      {msg.content}
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'flex-end', maxWidth: '70%', gap: 1 }}>
                      {msg.sender._id !== userId && (
                        <Avatar sx={{ bgcolor: 'var(--primary-color)', width: 30, height: 30 }}>
                          {msg.sender.name?.charAt(0) || '?'}
                        </Avatar>
                      )}
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: '12px',
                          backgroundColor: msg.sender._id === userId ? 'var(--primary-color)' : 'var(--background)',
                          color: msg.sender._id === userId ? 'white' : 'var(--text)',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                          position: 'relative',
                        }}
                      >
                        {msg.deleted ? (
                          <Typography sx={{ fontStyle: 'italic', color: 'var(--text-light)' }}>
                            This message was deleted
                          </Typography>
                        ) : (
                          <>
                            {msg.content && (
                              <ListItemText
                                primary={msg.content}
                                secondary={new Date(msg.timestamp).toLocaleTimeString()}
                                primaryTypographyProps={{ fontSize: '1rem' }}
                                secondaryTypographyProps={{ fontSize: '0.8rem', color: 'inherit' }}
                              />
                            )}
                            {msg.attachment && (
                              <Box sx={{ mt: 1 }}>
                                {msg.attachment.type === 'image' ? (
                                  <CardMedia
                                    component="img"
                                    image={`${import.meta.env.VITE_API_URL}/images/${msg.attachment.fileId}`}
                                    alt={msg.attachment.filename}
                                    sx={{ maxWidth: '200px', borderRadius: '8px' }}
                                  />
                                ) : (
                                  <a
                                    href={`${import.meta.env.VITE_API_URL}/images/${msg.attachment.fileId}`}
                                    download={msg.attachment.filename}
                                    style={{ color: 'var(--primary-color)' }}
                                  >
                                    Download {msg.attachment.filename}
                                  </a>
                                )}
                              </Box>
                            )}
                            {msg.sender._id === userId && (
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteMessage(msg._id)}
                                sx={{ position: 'absolute', top: 0, right: 0, color: 'var(--secondary-color)' }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                            {msg.read && msg.sender._id === userId && (
                              <Typography sx={{ fontSize: '0.7rem', color: 'var(--text-light)', mt: 0.5 }}>
                                Read
                              </Typography>
                            )}
                          </>
                        )}
                      </Box>
                      {msg.sender._id === userId && (
                        <Avatar sx={{ bgcolor: 'var(--primary-color)', width: 30, height: 30 }}>
                          {msg.sender.name?.charAt(0) || '?'}
                        </Avatar>
                      )}
                    </Box>
                  )}
                </ListItem>
              ))}
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </List>
        {typingUser && (
          <Typography sx={{ color: 'var(--text-light)', fontStyle: 'italic', mt: 1 }}>
            {typingUser} is typing...
          </Typography>
        )}
      </Box>

      {/* Message Input */}
      <Box sx={{ p: 2, borderTop: '1px solid var(--text-light)' }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            onInput={handleTyping}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconButton onClick={() => fileInputRef.current.click()}>
                    <AttachFileIcon sx={{ color: 'var(--text-light)' }} />
                  </IconButton>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                </InputAdornment>
              ),
            }}
            sx={{
              backgroundColor: 'var(--background)',
              borderRadius: '8px',
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'var(--text-light)' },
                '&:hover fieldset': { borderColor: 'var(--primary-color)' },
              },
            }}
          />
          <Button
            variant="contained"
            color="primary"
            endIcon={<SendIcon />}
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            sx={{ borderRadius: '8px' }}
          >
            Send
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export default ChatComponent;