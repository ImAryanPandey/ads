import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button, TextField, Box, Typography, Link } from '@mui/material';

function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, data);
      localStorage.setItem('token', response.data.token);
      navigate(response.data.user.profileCompleted ? '/dashboard' : '/onboarding');
    } catch (error) {
      toast.error(error.response?.data.message || 'Login failed');
    }
  };

  const googleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 5 }}>
      <Typography variant="h4" gutterBottom>Login</Typography>
      <form onSubmit={handleSubmit(onSubmit)}>
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
        <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>Login</Button>
        <Button variant="outlined" fullWidth sx={{ mt: 2 }} onClick={googleLogin}>Login with Google</Button>
      </form>
      <Link href="/register" sx={{ display: 'block', mt: 2 }}>Don't have an account? Register</Link>
    </Box>
  );
}

export default Login;