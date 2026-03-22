import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sprout,
  Home as HomeIcon,
  Leaf,
  Image as ImageIcon,
  Droplet,
  Cloud,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Navbar.css';

function Navbar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await signOut();
      setIsMobileMenuOpen(false);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const closeMenu = () => setIsMobileMenuOpen(false);

  if (['/login', '/signup'].includes(location.pathname)) {
    return null;
  }

  const toggleLanguage = () => {
    setLang(lang === 'en' ? 'te' : 'en');
  };

  return (
    <nav className={`navbar ${isMobileMenuOpen ? 'menu-open' : ''}`}>
      <div className="navbar-container">
        {/* Left: Brand */}
        <Link to="/" className="navbar-brand" onClick={closeMenu}>
          <Sprout size={28} className="brand-icon" strokeWidth={2.5} />
          <span className="brand-name">CropWise</span>
        </Link>

        {/* Hamburger Button */}
        <button 
          className="mobile-menu-btn" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>

        {/* Center & Right Wrapper for Mobile slider */}
        <div className={`nav-menu-wrapper ${isMobileMenuOpen ? 'open' : ''}`}>
          {/* Center: Links */}
          <div className="navbar-links" onClick={closeMenu}>
            <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
              <HomeIcon size={18} />
              <span>{t('nav_home')}</span>
            </Link>

            <Link to="/yield-prediction" className={`nav-link ${isActive('/yield-prediction') ? 'active' : ''}`}>
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

          {/* Right: Actions */}
          <div className="navbar-actions">
            <button onClick={() => { toggleLanguage(); closeMenu(); }} className="lang-switch">
              {lang === 'en' ? 'తెలుగు' : 'English'}
            </button>

            {user ? (
              <div className="user-section">
                <button onClick={handleLogout} className="btn-logout">
                  <LogOut size={16} />
                  <span>{t('logout') || 'Logout'}</span>
                </button>
              </div>
            ) : (
               <div className="auth-buttons" onClick={closeMenu}>
                <Link to="/login" className="btn-secondary">{t('login_here')}</Link>
                <Link to="/signup" className="btn-primary">{t('signup_title')}</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;