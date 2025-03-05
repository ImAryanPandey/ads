import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Box, Typography } from '@mui/material';

function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        await axios.get(`${import.meta.env.VITE_API_URL}/auth/verify-email/${token}`);
        toast.success('Email verified successfully!');
        navigate('/login');
      } catch (error) {
        toast.error(error.response?.data.message || 'Verification failed');
      }
    };
    verifyEmail();
  }, [token, navigate]);

  return (
    <Box sx={{ textAlign: 'center', mt: 5 }}>
      <Typography variant="h4">Verifying Email...</Typography>
    </Box>
  );
}

export default VerifyEmail;