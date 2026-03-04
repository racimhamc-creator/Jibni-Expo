import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, AdminPanelSettings } from '@mui/icons-material';
import axios from 'axios';
import './Login.css';

// Backend API URL - uses env variable
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://jibni-new-production.up.railway.app/api';

// Create a separate axios instance for auth
const authApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important: sends cookies
});

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await authApi.post('/auth/admin-login', { 
        phoneNumber: phone, 
        password 
      });

      if (response.data.status === 'success') {
        const { user, token } = response.data.data;
        
        // Store user info and token (fallback for cross-origin cookie issues)
        localStorage.setItem('admin_user', JSON.stringify(user));
        if (token) {
          localStorage.setItem('admin_token', token);
        }
        
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        setError(response.data.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box className="login-container">
      <Paper elevation={3} className="login-paper">
        <Box className="login-header">
          <AdminPanelSettings className="login-icon" />
          <Typography variant="h4" className="login-title">
            Jibni Admin
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Admin Dashboard Login
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleLogin}>
          <TextField
            fullWidth
            label="Phone Number"
            placeholder="+213XXXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            margin="normal"
            required
            autoFocus
          />
          
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleTogglePassword} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading || !phone || !password}
            sx={{ mt: 3 }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

          <Typography variant="body2" sx={{ mt: 3, textAlign: 'center' }}>
            <a href="/" style={{ color: '#667eea', textDecoration: 'none' }}>
              ← Back to Home
            </a>
          </Typography>
        </form>
      </Paper>
    </Box>
  );
};

export default Login;
