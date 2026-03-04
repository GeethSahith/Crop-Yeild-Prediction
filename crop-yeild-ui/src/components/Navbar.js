import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sprout,
  Home as HomeIcon,
  Leaf,
  Image as ImageIcon,
  Droplet,
  Cloud,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Navbar.css';

function Navbar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { lang, setLang, t } = useLanguage();

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (['/login', '/signup'].includes(location.pathname)) {
    return null;
  }

  const toggleLanguage = () => {
    setLang(lang === 'en' ? 'te' : 'en');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Left: Brand */}
        <Link to="/" className="navbar-brand">
          <Sprout size={28} className="brand-icon" strokeWidth={2.5} />
          <span className="brand-name">CropWise</span>
        </Link>

        {/* Center: Links */}
        <div className="navbar-links">
          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
            <HomeIcon size={18} />
            <span>{t('nav_home')}</span>
          </Link>

          <Link to="/crop-recommendation" className={`nav-link ${isActive('/crop-recommendation') ? 'active' : ''}`}>
            <Leaf size={18} />
            <span>{t('nav_crop')}</span>
          </Link>

          <Link to="/disease-detection" className={`nav-link ${isActive('/disease-detection') ? 'active' : ''}`}>
            <ImageIcon size={18} />
            <span>{t('nav_disease')}</span>
          </Link>

          <Link to="/fertilizer" className={`nav-link ${isActive('/fertilizer') ? 'active' : ''}`}>
            <Droplet size={18} />
            <span>{t('nav_fertilizer')}</span>
          </Link>

          <Link to="/weather" className={`nav-link ${isActive('/weather') ? 'active' : ''}`}>
            <Cloud size={18} />
            <span>{t('nav_weather')}</span>
          </Link>
        </div>

        {/* Right: Actions (Language First, then User/Auth) */}
        <div className="navbar-actions">
          <button onClick={toggleLanguage} className="lang-switch">
            {lang === 'en' ? 'తెలుగు' : 'English'}
          </button>

          {user ? (
            <div className="user-section">
              <span className="user-name">
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </span>
              <button onClick={handleLogout} className="btn-logout">
                <LogOut size={16} />
                <span>{t('logout') || 'Logout'}</span>
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn-secondary">{t('login_here')}</Link>
              <Link to="/signup" className="btn-primary">{t('signup_title')}</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;