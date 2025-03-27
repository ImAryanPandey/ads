// frontend/src/components/Requests.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const Requests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDateForm, setShowDateForm] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isApproving, setIsApproving] = useState(false); // Added for loading state
  const [renderError, setRenderError] = useState(null); // Added to catch rendering errors

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
    setStartDate(new Date());
    setEndDate(new Date());
    setShowDateForm(true);
  };

  const handleApproveWithDates = async () => {
    if (!selectedRequestId) return;

    setIsApproving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/requests/update/${selectedRequestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: 'Approved',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to approve request');
      }
      await response.json();
      toast.success('Request approved successfully');
      await fetchRequests(); // Refetch to ensure state consistency
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
      await response.json();
      toast.success('Request rejected successfully');
      await fetchRequests(); // Refetch to ensure state consistency
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    }
  };

  if (loading) return <div>Loading...</div>;

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
      <div>
        <h2>My Requests</h2>
        {requests.length === 0 ? (
          <p>No requests found.</p>
        ) : (
          <ul>
            {requests.map((request) => {
              try {
                return (
                  <li key={request._id}>
                    <p>AdSpace: {request.adSpace?.title || 'Unknown AdSpace'}</p>
                    <p>Sender: {request.sender?.name || 'Unknown Sender'}</p>
                    <p>Status: {request.status || 'Unknown'}</p>
                    {request.status === 'Pending' && (
                      <div>
                        <Link to={`/chat/${request._id}/${request.adSpace?._id || ''}`}>
                          <Button variant="outlined" disabled={isApproving || !request.adSpace?._id}>
                            Chat with Requester
                          </Button>
                        </Link>
                        <Button
                          variant="contained"
                          color="success"
                          onClick={() => handleOpenDateForm(request._id)}
                          sx={{ ml: 1 }}
                          disabled={isApproving}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          onClick={() => handleRejectRequest(request._id)}
                          sx={{ ml: 1 }}
                          disabled={isApproving}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </li>
                );
              } catch (error) {
                console.error('Error rendering request:', request, error);
                setRenderError(error);
                return null;
              }
            })}
          </ul>
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
                    onChange={(newValue) => setStartDate(newValue)}
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
                    onChange={(newValue) => setEndDate(newValue)}
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
      </div>
    </LocalizationProvider>
  );
};

export default Requests;