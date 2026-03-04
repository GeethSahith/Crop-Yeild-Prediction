import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sprout, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!formData.email || !formData.password) {
      setError(t('login_fill_all'));
      setLoading(false);
      return;
    }

    if (!formData.email.includes('@')) {
      setError(t('login_invalid_email'));
      setLoading(false);
      return;
    }

    try {
      await signIn(formData.email, formData.password);
      navigate('/');
    } catch (err) {
      setError(err.message || t('login_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* Logo */}
        <div className="login-logo">
          <div className="logo-icon">
            <Sprout size={40} className="logo-sprout" />
          </div>
          <h1>{t('login_title')}</h1>
          <p>{t('login_subtitle')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="login-form">
          {error && <div className="error-message">{error}</div>}

          {/* Email */}
          <div className="form-group">
            <label htmlFor="email">{t('email')}</label>
            <div className="input-wrapper">
              <Mail size={20} className="input-icon" />
              <input
                id="email"
                type="email"
                name="email"
                placeholder="farmer@example.com"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password">{t('password')}</label>
            <div className="input-wrapper">
              <Lock size={20} className="input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder={t('enter_password')}
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" className="btn-login" disabled={loading}>
            <span>
              {loading ? t('logging_in') : t('login')}
            </span>
          </button>
        </form>

        {/* Footer */}
        <div className="login-footer">
          {t('no_account')}{' '}
          <Link to="/signup" className="signup-link">
            {t('register_here')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;