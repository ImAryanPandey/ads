import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button, TextField, Box, Typography, MenuItem } from '@mui/material';

function Onboarding() {
  const { register, handleSubmit, formState: { errors }, watch } = useForm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const role = watch("role"); // Dynamically track role selection

  const onSubmit = async (data) => {
    try {
      const apiUrl = `${import.meta.env.VITE_API_URL}/auth/onboarding`;
      console.log('API URL:', apiUrl);
      console.log('Request Data:', data);
      console.log('Axios Config:', { withCredentials: true });
  
      const response = await axios.post(apiUrl, data, {
        withCredentials: true,
      });
      console.log('Response:', response.data);
      toast.success('Profile completed!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
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

        {/* Show Location field only if the role is "owner" */}
        {role === "owner" && (
          <TextField
            label="Location"
            fullWidth
            margin="normal"
            {...register('location', { required: 'Location is required for Owners' })}
            error={!!errors.location}
            helperText={errors.location?.message}
          />
        )}

        {/* Show Business Name field only if the role is "advertiser" */}
        {role === "advertiser" && (
          <TextField
            label="Business Name"
            fullWidth
            margin="normal"
            {...register('businessName', { required: 'Business Name is required for Advertisers' })}
            error={!!errors.businessName}
            helperText={errors.businessName?.message}
          />
        )}

        <Button type="submit" variant="contained" fullWidth sx={{ mt: 2, bgcolor: 'var(--primary-color)' }}>
          Save
        </Button>
      </form>
    </Box>
  );
}

export default Onboarding;