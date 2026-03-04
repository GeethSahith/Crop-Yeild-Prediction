import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sprout, Loader } from 'lucide-react';
import { supabase } from '../config/supabase';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import './VerifyOtp.css';

function VerifyOtp() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate('/signup');
    }
  }, [email, navigate]);

  const handleChange = (index, value) => {
    if (value.length > 1) value = value[0];

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      setError(t('otp_incomplete'));
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'signup'
      });

      if (verifyError) throw verifyError;

      if (data?.session) {
        localStorage.setItem('auth_token', data.session.access_token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        toast.success(t('email_verified'));
        navigate('/');
      }
    } catch (err) {
      setError(err.message || t('otp_invalid'));
      setOtp(['', '', '', '', '', '']);
      document.getElementById('otp-0').focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    setError('');

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email
      });

      if (resendError) throw resendError;

      toast.success(t('otp_resent'));
      setOtp(['', '', '', '', '', '']);
      document.getElementById('otp-0').focus();
    } catch (err) {
      setError(err.message || t('otp_resend_failed'));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="verify-otp-container">
      <div className="verify-otp-wrapper">
        <div className="verify-otp-logo">
          <div className="logo-icon">
            <Sprout size={40} className="logo-sprout" />
          </div>
          <h1>{t('verify_email_title')}</h1>
          <p>{t('otp_sent_text')}</p>
          <p className="email-display">{email}</p>
        </div>

        <form onSubmit={handleVerify} className="verify-otp-form">
          {error && <div className="error-message">{error}</div>}

          <div className="otp-inputs">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="otp-input"
                disabled={loading}
                autoFocus={index === 0}
              />
            ))}
          </div>

          <button type="submit" className="btn-verify" disabled={loading}>
            {loading ? (
              <>
                <Loader className="spin" size={20} />
                <span>{t('verifying')}</span>
              </>
            ) : (
              <span>{t('verify_otp')}</span>
            )}
          </button>

          <div className="resend-section">
            <p>{t('otp_not_received')}</p>
            <button
              type="button"
              onClick={handleResendOtp}
              className="btn-resend"
              disabled={resending || loading}
            >
              {resending ? t('resending') : t('resend_otp')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VerifyOtp;