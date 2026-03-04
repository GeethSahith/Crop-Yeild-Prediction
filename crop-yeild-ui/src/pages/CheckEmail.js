import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import './CheckEmail.css';

function CheckEmail() {
  const location = useLocation();
  const { t } = useLanguage();
  const email = location.state?.email || 'your email';

  return (
    <div className="check-email-container">
      <div className="check-email-wrapper">
        {/* Icon */}
        <div className="check-email-icon">
          <Mail size={80} className="mail-icon" />
          <CheckCircle size={40} className="check-icon" />
        </div>

        {/* Content */}
        <h1 className="check-email-title">Check Your Email</h1>
        <p className="check-email-subtitle">
          We've sent a confirmation link to <strong>{email}</strong>
        </p>

        {/* Instructions */}
        <div className="check-email-instructions">
          <p>
            Please click the confirmation link in the email to verify your account. 
            Once confirmed, you can login to your account.
          </p>
          <p className="email-tip">
            <strong>Tip:</strong> Check your spam or junk folder if you don't see the email in your inbox.
          </p>
        </div>

        {/* Back to Login */}
        <Link to="/login" className="back-to-login-btn">
          <ArrowLeft size={20} />
          Back to Login
        </Link>

        {/* Resend Link */}
        <p className="resend-help">
          Didn't receive the email? Check your spam folder or contact support.
        </p>
      </div>
    </div>
  );
}

export default CheckEmail;
