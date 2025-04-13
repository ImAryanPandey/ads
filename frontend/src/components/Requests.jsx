import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Link, useNavigate } from 'react-router-dom';
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

const Requests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDateForm, setShowDateForm] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isApproving, setIsApproving] = useState(false);
  const [renderError, setRenderError] = useState(null);
  const navigate = useNavigate();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/requests/my`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch requests');
      const data = await response.json();
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleOpenDateForm = (requestId) => {
    setSelectedRequestId(requestId);
    const newStartDate = new Date();
    newStartDate.setHours(0, 0, 0, 0);
    const newEndDate = new Date(newStartDate);
    newEndDate.setDate(newStartDate.getDate() + 1); // Default to one day later
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    setShowDateForm(true);
  };

  const handleApproveWithDates = async () => {
    if (!selectedRequestId) return;

    // Validate dates before sending
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
      console.log('Sending approval with dates:', { startDate, endDate }); // For debugging
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (renderError) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">
          An error occurred while rendering the requests: {renderError.message}
        </Typography>
        <Button onClick={() => window.location.reload()} variant="contained" sx={{ mt: 2 }}>
          Reload Page
        </Button>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3, backgroundColor: 'var(--background)', color: 'var(--text)' }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          My Requests
        </Typography>
        {requests.length === 0 ? (
          <Typography sx={{ color: 'var(--text-light)' }}>No requests found.</Typography>
        ) : (
          <Grid container spacing={2}>
            {requests.map((request) => {
              try {
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
                            {request.sender?.name?.charAt(0) || '?'}
                          </Avatar>
                        }
                        title={
                          <Typography variant="h6" sx={{ color: 'var(--text)' }}>
                            {request.sender?.name || 'Unknown Sender'}
                          </Typography>
                        }
                        subheader={
                          <Typography variant="body2" sx={{ color: 'var(--text-light)' }}>
                            Business: {request.sender?.businessName || 'N/A'}
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
                        <Typography sx={{ color: 'var(--text)', mb: 1 }}>
                          Status:{' '}
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
                          />
                        </Typography>
                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                          <Button
                            variant="outlined"
                            onClick={() => navigate(`/chat/${request._id}/${request.adSpace?._id || ''}`)}
                            sx={{ borderRadius: '8px' }}
                            disabled={isApproving || !request.adSpace?._id}
                          >
                            Open Chat
                          </Button>
                          {request.status === 'Pending' && (
                            <>
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
                            </>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              } catch (error) {
                console.error('Error rendering request:', request, error);
                setRenderError(error);
                return null;
              }
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
                  Please enter the dates you agreed on with the requester via chat.
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
                        InputLabelProps: { style: { color: 'var(--text-light)' } },
                        sx: {
                          input: {
                            color: (theme) =>
                              theme.palette.mode === 'dark' ? 'var(--input-text-dark)' : 'var(--input-text-light)',
                          },
                          backgroundColor: 'var(--container-light)',
                          borderRadius: '8px',
                        },
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
                        InputLabelProps: { style: { color: 'var(--text-light)' } },
                        sx: {
                          input: {
                            color: (theme) =>
                              theme.palette.mode === 'dark' ? 'var(--input-text-dark)' : 'var(--input-text-light)',
                          },
                          backgroundColor: 'var(--container-light)',
                          borderRadius: '8px',
                        },
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
      </Box>
    </LocalizationProvider>
  );
};

export default Requests;