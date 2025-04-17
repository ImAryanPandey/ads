import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button, TextField, Box, Typography, MenuItem } from '@mui/material';

function Onboarding() {
  const { register, handleSubmit, formState: { errors }, watch, control } = useForm({
    defaultValues: {
      phone: '',
      role: '',
      location: '',
      businessName: '',
    },
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const role = watch("role");

  const onSubmit = async (data) => {
    try {
      const apiUrl = `${import.meta.env.VITE_API_URL}/auth/onboarding`;
      const response = await axios.post(apiUrl, data, { withCredentials: true });
      
      // Sync user data and check role from the correct response structure
      const userResponse = await axios.get(`${import.meta.env.VITE_API_URL}/auth/me`, { withCredentials: true });
      if (!userResponse.data.role) {
        throw new Error('Role not set after onboarding');
      }
      console.log('User data after onboarding:', userResponse.data);

      toast.success('Profile completed!');
      navigate(response.data.redirect || '/dashboard?refresh=true');
    } catch (error) {
      console.error('Onboarding error:', error.response?.data || error.message);
      if (error.response?.status === 401 || error.response?.data.redirect === '/login') {
        toast.error('Please log in to continue.');
        navigate('/login');
      } else if (error.response?.data.redirect) {
        toast.error(error.response.data.message);
        navigate(error.response.data.redirect);
      } else {
        toast.error(error.response?.data.message || 'Onboarding failed');
      }
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
        
        <Controller
          name="role"
          control={control}
          rules={{ required: 'Please select a role' }}
          render={({ field }) => (
            <TextField
              {...field}
              select
              label="Role"
              fullWidth
              margin="normal"
              error={!!errors.role}
              helperText={errors.role?.message}
            >
              <MenuItem value="">Select a role</MenuItem>
              <MenuItem value="owner">AdSpace Owner</MenuItem>
              <MenuItem value="advertiser">Advertiser</MenuItem>
            </TextField>
          )}
        />

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

        <Button
          type="submit"
          variant="contained"
          fullWidth
          sx={{ mt: 2, bgcolor: 'var(--primary-color)', '&:hover': { bgcolor: 'var(--primary-dark)' } }}
        >
          Save
        </Button>
      </form>
    </Box>
  );
}

export default Onboarding;