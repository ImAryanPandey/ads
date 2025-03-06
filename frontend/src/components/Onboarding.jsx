import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button, TextField, Box, Typography, MenuItem } from '@mui/material';

function Onboarding() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) localStorage.setItem('token', token);
  }, [searchParams]);

  const onSubmit = async (data) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/onboarding`, data, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      toast.success('Profile completed!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data.message || 'Onboarding failed');
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 5 }}>
      <Typography variant="h4" gutterBottom>Complete Your Profile</Typography>
      <form onSubmit={handleSubmit(onSubmit)}>
        <TextField
          label="Phone"
          fullWidth
          margin="normal"
          {...register('phone', { required: 'Phone is required' })}
          error={!!errors.phone}
          helperText={errors.phone?.message}
        />
        <TextField
          select
          label="Role"
          fullWidth
          margin="normal"
          {...register('role', { required: 'Please select a role' })}
          error={!!errors.role}
          helperText={errors.role?.message}
        >
          <MenuItem value="owner">Property Owner</MenuItem>
          <MenuItem value="advertiser">Advertiser</MenuItem>
        </TextField>
        <TextField
          label="Location (for Owners)"
          fullWidth
          margin="normal"
          {...register('location')}
        />
        <TextField
          label="Business Name (for Advertisers)"
          fullWidth
          margin="normal"
          {...register('businessName')}
        />
        <Button type="submit" variant="contained" fullWidth sx={{ mt: 2, bgcolor: 'var(--primary-color)' }}>
          Save
        </Button>
      </form>
    </Box>
  );
}

export default Onboarding;