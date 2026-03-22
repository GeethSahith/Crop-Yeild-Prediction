import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sprout, User, Mail, Lock, MapPin, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Signup.css';

function Signup() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    region: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const regions = [
    'North India',
    'South India',
    'East India',
    'West India',
    'North-East India',
    'Central India'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (
      !formData.fullName ||
      !formData.email ||
      !formData.region ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError(t('signup_fill_all'));
      setLoading(false);
      return;
    }

    if (formData.fullName.length < 2) {
      setError(t('signup_name_short'));
      setLoading(false);
      return;
    }

    if (!formData.email.includes('@')) {
      setError(t('signup_invalid_email'));
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError(t('signup_password_short'));
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('signup_password_mismatch'));
      setLoading(false);
      return;
    }

    try {
      await signUp(
        formData.email,
        formData.password,
        formData.fullName,
        formData.region
      );

      navigate('/verify-otp', { state: { email: formData.email } });
    } catch (err) {
      setError(err.message || t('signup_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-wrapper">
        {/* Logo */}
        <div className="signup-logo">
          <div className="logo-icon">
            <Sprout size={40} className="logo-sprout" />
          </div>
          <h1>{t('signup_title')}</h1>
          <p>{t('signup_subtitle')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="signup-form">
          {error && <div className="error-message">{error}</div>}

          {/* Full Name */}
          <div className="form-group">
            <label htmlFor="fullName">{t('full_name')}</label>
            <div className="input-wrapper">
              <User size={20} className="input-icon" />
              <input
                id="fullName"
                type="text"
                name="fullName"
                placeholder={t('enter_name')}
                value={formData.fullName}
                onChange={handleChange}
                className="form-input"
                disabled={loading}
              />
            </div>
          </div>

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

          {/* Region */}
          <div className="form-group">
            <label htmlFor="region">{t('region_state')}</label>
            <div className="input-wrapper">
              <MapPin size={20} className="input-icon" />
              <select
                id="region"
                name="region"
                value={formData.region}
                onChange={handleChange}
                className="form-input form-select"
                disabled={loading}
              >
                <option value="">{t('select_region')}</option>
                {regions.map((reg) => (
                  <option key={reg} value={reg}>
                    {reg}
                  </option>
                ))}
              </select>
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
                placeholder={t('create_password')}
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

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="confirmPassword">{t('confirm_password')}</label>
            <div className="input-wrapper">
              <Lock size={20} className="input-icon" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                placeholder={t('confirm_password_placeholder')}
                value={formData.confirmPassword}
                onChange={handleChange}
                className="form-input"
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
                disabled={loading}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" className="btn-signup" disabled={loading}>
            <span>
              {loading ? t('creating_account') : t('create_account')}
            </span>
          </button>

          {/* Footer */}
          <div className="signup-footer">
            {t('already_account')}{' '}
            <Link to="/login" className="login-link">
              {t('login_here')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Signup;