import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { setToken } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return toast.error('Please enter your name');

    setSubmitting(true);
    try {
      const { data } = await api.post('/api/auth/session', { name: cleanName });
      setToken(data.token);
      login(data.token, { name: data.name, is_scorer: data.is_scorer });
      localStorage.setItem('chat_display_name', data.name);
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to start session. Try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="setup-container max-width-600" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="start-screen-card stitch-card border-glow p-8 width-100">
        <div className="text-center mb-6">
          <div className="start-logo-badge mb-3">🏏</div>
          <h1 className="page-title" style={{ fontSize: '1.8rem' }}>Welcome to AH6 Cricket</h1>
        </div>

        <form onSubmit={handleContinue} className="stitch-form-stack">
          <div className="input-group">
            <label style={{ fontSize: '1rem', fontWeight: 800 }}>Enter Your Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Rahul / Tulasi"
              required
              autoFocus
              style={{ fontSize: '1.1rem', height: '52px' }}
            />
          </div>
          <div className="form-action-buttons mt-4">
            <button
              type="submit"
              className="btn-stitch-primary width-100"
              disabled={submitting || !name.trim()}
              style={{ padding: '14px 24px', fontSize: '1.1rem', height: '52px' }}
            >
              Continue →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
