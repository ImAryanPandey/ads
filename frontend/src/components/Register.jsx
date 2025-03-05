import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button, TextField, Box, Typography, MenuItem, Link } from '@mui/material';

function Register() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/register`, data);
      toast.success('Registration successful! Please check your email to verify.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data.message || 'Registration failed');
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 5 }}>
      <Typography variant="h4" gutterBottom>Register</Typography>
      <form onSubmit={handleSubmit(onSubmit)}>
        <TextField
          label="Name"
          fullWidth
          margin="normal"
          {...register('name', { required: 'Name is required' })}
          error={!!errors.name}
          helperText={errors.name?.message}
        />
        <TextField
          label="Email"
          fullWidth
          margin="normal"
          {...register('email', { required: 'Email is required' })}
          error={!!errors.email}
          helperText={errors.email?.message}
        />
        <TextField
          label="Password"
          type="password"
          fullWidth
          margin="normal"
          {...register('password', { required: 'Password is required' })}
          error={!!errors.password}
          helperText={errors.password?.message}
        />
        <TextField
          select
          label="Role"
          fullWidth
          margin="normal"
          {...register('role', { required: 'Role is required' })}
          error={!!errors.role}
          helperText={errors.role?.message}
        >
          <MenuItem value="owner">Property Owner</MenuItem>
          <MenuItem value="advertiser">Advertiser</MenuItem>
        </TextField>
        <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>Register</Button>
      </form>
      <Link href="/login" sx={{ display: 'block', mt: 2 }}>Already have an account? Login</Link>
    </Box>
  );
}

export default Register;