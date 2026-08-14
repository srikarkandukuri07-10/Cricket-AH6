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
    <div className="setup-container max-width-600">
      <div className="login-wrapper">
        <div className="login-header text-center mb-6">
          <div className="login-logo-badge mb-3">🏏</div>
          <h1 className="page-title">AH6 Scorer Login</h1>
          <p className="page-description">Sign in to access live cricket scoring and match control panel</p>
        </div>

        <div className="stitch-card border-glow p-6">
          <form onSubmit={handleLogin} className="stitch-form-stack">
            <div className="input-group">
              <label>Username / Email</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter scorer username"
                required
                autoCapitalize="none"
              />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
            <div className="form-action-buttons mt-6">
              <button type="submit" className="btn-stitch-primary width-100" style={{ padding: '14px 24px', fontSize: '1rem' }}>
                🔑 Sign In to Dashboard
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
