import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button, TextField, Box, Typography } from '@mui/material';

function VerifyOTP() {
  const [otp, setOtp] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate('/register');
    }
  }, [email, navigate]);
  
  const handleVerify = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/verify-otp`,
        { email, otp: otp.toString() },
        { withCredentials: true }
      );
      toast.success('Email verified successfully! Redirecting to onboarding.');
      navigate('/onboarding');
    } catch (error) {
      toast.error(error.response?.data.message || 'OTP verification failed');
    }
  };

  const handleResendOTP = async () => {
    try {
      setResending(true);
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/resend-otp`, { email });
      toast.success('New OTP sent to your email');
      setResending(false);
    } catch (error) {
      toast.error(error.response?.data.message || 'Failed to resend OTP');
      setResending(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 5 }}>
      <Typography variant="h5" gutterBottom>Verify Your Email</Typography>
      <TextField
        label="Enter OTP"
        fullWidth
        margin="normal"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
      />
      <Button
        variant="contained"
        fullWidth
        sx={{ mt: 2, bgcolor: 'var(--primary-color)' }}
        onClick={handleVerify}
        disabled={!otp}
      >
        Verify OTP
      </Button>
      <Button
        variant="outlined"
        fullWidth
        sx={{ mt: 2 }}
        onClick={handleResendOTP}
        disabled={resending}
      >
        {resending ? 'Resending...' : 'Resend OTP'}
      </Button>
    </Box>
  );
}

export default VerifyOTP;
