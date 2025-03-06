import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button, TextField, Box, Typography, Link } from '@mui/material';
import { motion } from 'framer-motion';
import styled from '@emotion/styled';

// Styled components
const Background = styled(Box)`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: var(--background-light);
`;

const Overlay = styled(Box)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.2);
  z-index: 1;
`;

const ImageLeft = styled(motion.img)`
  position: absolute;
  left: 0;
  top: 20%;
  width: 300px;
  height: auto;
  opacity: 0.8;
  z-index: 0;
  @media (max-width: 600px) {
    display: none;
  }
`;

const ImageRight = styled(motion.img)`
  position: absolute;
  right: 0;
  bottom: 20%;
  width: 300px;
  height: auto;
  opacity: 0.8;
  z-index: 0;
  @media (max-width: 600px) {
    display: none;
  }
`;

const LoginContainer = styled(motion.div)`
  background: var(--container-light);
  padding: 2rem;
  border-radius: 12px;
  box-shadow: var(--shadow);
  width: 100%;
  max-width: 400px;
  z-index: 2;
  text-align: center;

  .dark-mode & {
    background: var(--container-dark);
  }
`;

function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, data);
      localStorage.setItem('token', response.data.token);
      navigate(response.data.user.profileCompleted ? '/dashboard' : '/onboarding');
      toast.success('Logged in successfully!');
    } catch (error) {
      toast.error(error.response?.data.message || 'Login failed');
    }
  };

  const googleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  };

  return (
    <Background>
      <Overlay />
      <ImageLeft
        src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300"
        alt="Property"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 0.8 }}
        transition={{ duration: 1 }}
      />
      <ImageRight
        src="https://images.unsplash.com/photo-1566594775437-5d3025b7a32f?auto=format&fit=crop&w=300"
        alt="Billboard"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 0.8 }}
        transition={{ duration: 1, delay: 0.5 }}
      />
      <LoginContainer
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: 'var(--primary-color)' }}>
          Welcome to AdSphere
        </Typography>
        <Typography variant="body2" sx={{ mb: 3 }}>
          Connect properties with advertisers seamlessly
        </Typography>
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            label="Email"
            fullWidth
            margin="normal"
            variant="outlined"
            {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' } })}
            error={!!errors.email}
            helperText={errors.email?.message}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': { borderColor: 'var(--primary-color)' },
                '&.Mui-focused fieldset': { borderColor: 'var(--primary-color)' },
              },
            }}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            variant="outlined"
            {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Minimum 6 characters' } })}
            error={!!errors.password}
            helperText={errors.password?.message}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': { borderColor: 'var(--primary-color)' },
                '&.Mui-focused fieldset': { borderColor: 'var(--primary-color)' },
              },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 2, bgcolor: 'var(--primary-color)', '&:hover': { bgcolor: '#5B4CD6' } }}
          >
            Login
          </Button>
          <Button
            variant="outlined"
            fullWidth
            sx={{ mt: 2, borderColor: 'var(--secondary-color)', color: 'var(--secondary-color)', '&:hover': { borderColor: 'var(--primary-color)' } }}
            onClick={googleLogin}
          >
            Login with Google
          </Button>
          <Link href="/register" sx={{ display: 'block', mt: 2 }}>
            Don’t have an account? Register
          </Link>
        </form>
      </LoginContainer>
    </Background>
  );
}

export default Login;