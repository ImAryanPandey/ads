import React, { useEffect, useState, useMemo, useContext } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../App'; // Adjust the import path as needed
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  CircularProgress,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Avatar,
  Divider,
  Chip,
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import ChatComponent from './ChatComponent.jsx';

const Requests = ({ mode = 'standalone' }) => {
  const { user } = useContext(UserContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDateForm, setShowDateForm] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isApproving, setIsApproving] = useState(false);
  const [openChatDialog, setOpenChatDialog] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [role, setRole] = useState('');
  const navigate = useNavigate();

  const fetchRequests = async () => {
    try {
      const reqResponse = await fetch(`${import.meta.env.VITE_API_URL}/requests/my`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!reqResponse.ok) {
        const errorData = await reqResponse.json();
        console.error('Requests fetch failed:', reqResponse.status, errorData);
        throw new Error('Failed to fetch requests');
      }
      const requestsData = await reqResponse.json();
      console.log('Requests response:', requestsData);
      setRequests(requestsData || []);
    } catch (reqError) {
      console.error('Error fetching requests:', reqError);
      setRequests([]);
      toast.warn('Could not load requests, but component is still available');
    }
  };

  useEffect(() => {
    if (user) {
      setRole(user.role || '');
      setCurrentUserId(user._id?.toString() || null);
      fetchRequests();
    }
  }, [user]);

  const handleOpenDateForm = (requestId) => {
    setSelectedRequestId(requestId);
    const newStartDate = new Date();
    newStartDate.setHours(0, 0, 0, 0);
    const newEndDate = new Date(newStartDate);
    newEndDate.setDate(newStartDate.getDate() + 1);
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    setShowDateForm(true);
  };

  const handleApproveWithDates = async () => {
    if (!selectedRequestId) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const minEndDate = new Date(start);
    minEndDate.setDate(minEndDate.getDate() + 1);

    if (end < minEndDate) {
      toast.error('End date must be at least one day after start date');
      return;
    }

    setIsApproving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/requests/update/${selectedRequestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: 'Approved',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to approve request');
      }
      const updatedRequest = await response.json();
      setRequests((prev) => prev.map((req) => (req._id === selectedRequestId ? updatedRequest : req)));
      toast.success('Request approved successfully');
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error(error.message || 'Failed to approve request');
    } finally {
      setShowDateForm(false);
      setSelectedRequestId(null);
      setStartDate(new Date());
      setEndDate(new Date());
      setIsApproving(false);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/requests/update/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'Rejected' }),
      });
      if (!response.ok) throw new Error('Failed to update request');
      const updatedRequest = await response.json();
      setRequests((prev) => prev.map((req) => (req._id === requestId ? updatedRequest : req)));
      toast.success('Request rejected successfully');
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    }
  };

  const openChat = async (requestId, recipientId) => {
    if (!requestId || !recipientId || !currentUserId || openChatDialog) {
      toast.error('Chat already open or invalid data');
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/chat/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ requestId, recipientId, userId: currentUserId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to open chat');
      }
      const data = await response.json();
      if (data.conversationId) {
        setConversationId(data.conversationId);
        setOpenChatDialog(true);
        toast.success('Chat opened successfully');
      } else {
        throw new Error('No conversationId returned');
      }
    } catch (error) {
      console.error('Error opening chat:', error);
      toast.error(`Failed to open chat: ${error.message}`);
    }
  };

  const handleCloseChatDialog = () => {
    setOpenChatDialog(false);
    setConversationId(null);
  };

  const chatProps = useMemo(
    () => ({
      conversationId,
      userId: currentUserId || 'tempUserId',
      onClose: handleCloseChatDialog,
      title: requests.find((r) => r._id === selectedRequestId)?.adSpace?.title || 'Chat',
    }),
    [conversationId, currentUserId, selectedRequestId, requests]
  );

  const renderChatComponent = () => {
    if (conversationId) {
      return (
        <ChatComponent
          key={conversationId}
          conversationId={conversationId}
          userId={currentUserId || 'tempUserId'}
          onClose={handleCloseChatDialog}
          title={requests.find((r) => r._id === selectedRequestId)?.adSpace?.title || 'Chat'}
        />
      );
    }
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '350px' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading chat... Please wait or refresh.</Typography>
      </Box>
    );
  };

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3, backgroundColor: 'var(--background)', color: 'var(--text)' }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          {mode === 'standalone' ? 'My Requests' : 'Requests'}
        </Typography>
        {requests.length === 0 ? (
          <Typography sx={{ color: 'var(--text-light)' }}>
            {mode === 'standalone'
              ? 'No requests found.'
              : role === 'owner'
              ? 'No requests yet.'
              : 'No requests sent yet. Browse AdSpaces to get started.'}
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {requests.map((request) => {
              const recipientId = role === 'owner' ? request.sender?._id : request.owner?._id;
              const isOwner = role === 'owner';
              return (
                <Grid item xs={12} key={request._id}>
                  <Card
                    sx={{
                      backgroundColor: 'var(--container-light)',
                      boxShadow: 'var(--shadow)',
                      borderRadius: '12px',
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'scale(1.02)' },
                    }}
                  >
                    <CardHeader
                      avatar={
                        <Avatar sx={{ bgcolor: 'var(--primary-color)' }}>
                          {(isOwner ? request.sender?.name : request.owner?.name)?.charAt(0) || '?'}
                        </Avatar>
                      }
                      title={
                        <Typography variant="h6" sx={{ color: 'var(--text)' }}>
                          {mode === 'standalone'
                            ? isOwner
                              ? request.sender?.name || 'Unknown Sender'
                              : `AdSpace: ${request.adSpace?.title || 'Unknown AdSpace'}`
                            : isOwner
                            ? request.sender?.name || 'Unknown Sender'
                            : `AdSpace: ${request.adSpace?.title || 'Unknown AdSpace'}`}
                        </Typography>
                      }
                      subheader={
                        <Typography variant="body2" sx={{ color: 'var(--text-light)' }}>
                          {mode === 'standalone'
                            ? isOwner
                              ? `Business: ${request.sender?.businessName || 'N/A'}`
                              : `Owner: ${request.owner?.name || 'Unknown Owner'} (Location: ${request.adSpace?.address || 'N/A'})`
                            : isOwner
                            ? `Business: ${request.sender?.businessName || 'N/A'}`
                            : `Owner: ${request.owner?.name || 'Unknown Owner'}`}
                        </Typography>
                      }
                    />
                    <CardContent>
                      <Divider sx={{ mb: 2 }} />
                      <Typography sx={{ color: 'var(--text)', mb: 1 }}>
                        AdSpace: {request.adSpace?.title || 'Unknown AdSpace'}
                      </Typography>
                      <Typography sx={{ color: 'var(--text)', mb: 1 }}>
                        Duration: {request.duration?.value || 'N/A'} {request.duration?.type || 'N/A'}
                      </Typography>
                      {mode === 'standalone' && (
                        <>
                          <Typography sx={{ color: 'var(--text)', mb: 1 }}>
                            Requirements: {request.requirements || 'None specified'}
                          </Typography>
                          <Typography sx={{ color: 'var(--text)', mb: 1 }}>
                            Created At: {request.createdAt ? format(new Date(request.createdAt), 'PPP') : 'N/A'}
                          </Typography>
                          {request.rejectedAt && (
                            <Typography sx={{ color: 'var(--text)', mb: 1 }}>
                              Rejected At: {format(new Date(request.rejectedAt), 'PPP')}
                            </Typography>
                          )}
                        </>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography sx={{ color: 'var(--text)' }}>Status:</Typography>
                        <Chip
                          label={request.status === 'Approved' ? 'Booked' : request.status || 'Unknown'}
                          color={
                            request.status === 'Approved'
                              ? 'success'
                              : request.status === 'Pending'
                              ? 'warning'
                              : 'error'
                          }
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </Box>
                      {request.status === 'Pending' && isOwner && (
                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            color="success"
                            onClick={() => handleOpenDateForm(request._id)}
                            disabled={isApproving}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="contained"
                            color="error"
                            onClick={() => handleRejectRequest(request._id)}
                            disabled={isApproving}
                          >
                            Reject
                          </Button>
                        </Box>
                      )}
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" sx={{ color: 'var(--text-light)', mb: 1 }}>
                          Chat with {isOwner ? request.sender?.name || 'Requester' : request.owner?.name || 'Owner'}
                        </Typography>
                        <Button
                          variant="outlined"
                          onClick={() => openChat(request._id, recipientId)}
                          sx={{ borderRadius: '8px' }}
                          disabled={openChatDialog || !recipientId}
                        >
                          {openChatDialog ? 'Chat Opened' : 'Open Chat'}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        <Dialog open={showDateForm} onClose={() => setShowDateForm(false)}>
          <DialogTitle>Confirm Booking Dates</DialogTitle>
          <DialogContent>
            {isApproving ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Typography sx={{ mb: 2 }}>
                  Please enter the dates agreed with the requester.
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={(newValue) => {
                      if (newValue) {
                        const normalizedDate = new Date(newValue.setHours(0, 0, 0, 0));
                        setStartDate(normalizedDate);
                      }
                    }}
                    minDate={new Date()}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: { backgroundColor: 'var(--container-light)', borderRadius: '8px' },
                      },
                    }}
                  />
                </Box>
                <Box>
                  <DatePicker
                    label="End Date"
                    value={endDate}
                    onChange={(newValue) => {
                      if (newValue) {
                        const normalizedDate = new Date(newValue.setHours(0, 0, 0, 0));
                        setEndDate(normalizedDate);
                      }
                    }}
                    minDate={startDate || new Date()}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: { backgroundColor: 'var(--container-light)', borderRadius: '8px' },
                      },
                    }}
                  />
                </Box>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDateForm(false)} color="primary" disabled={isApproving}>
              Cancel
            </Button>
            <Button
              onClick={handleApproveWithDates}
              color="success"
              variant="contained"
              disabled={isApproving}
            >
              Confirm Approval
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openChatDialog} onClose={handleCloseChatDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            Chat with{' '}
            {requests.find((r) => r._id === selectedRequestId)?.sender?.name ||
              requests.find((r) => r._id === selectedRequestId)?.owner?.name ||
              'User'}
          </DialogTitle>
          <DialogContent>{renderChatComponent()}</DialogContent>
          <DialogActions>
            <Button onClick={handleCloseChatDialog} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default Requests;