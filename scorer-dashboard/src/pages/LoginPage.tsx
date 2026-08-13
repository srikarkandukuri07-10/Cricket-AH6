import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { setToken } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/api/auth/login', { email: username, username, password });
      setToken(data.token);
      login(data.token, data.user);
      toast.success('Logged in successfully');
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Login failed. Check credentials.';
      toast.error(msg);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>AH6 Scorer Login</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary full-width">Login</button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
