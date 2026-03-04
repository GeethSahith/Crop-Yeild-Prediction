import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import {
  Sprout,
  TrendingUp,
  Target,
  Globe,
  ArrowRight,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import './Home.css';

function Home() {
  const { t } = useLanguage();

  return (
    <div className="home">

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <Sprout size={20} />
              <span>{t('hero_badge')}</span>
            </div>

            {/* ✅ FIXED — no more dangerous split */}
            <h1 className="hero-title">
              {t('hero_title')}
            </h1>

            <p className="hero-description">{t('hero_desc')}</p>

            <div className="hero-actions">
              <Link to="/crop-recommendation" className="btn-hero-primary">
                {t('get_started')}
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>

          <div className="hero-image">
            <div className="image-wrapper">
              <img
                src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80"
                alt="Smart Farming"
                className="hero-img"
              />

              {/* Analytics Card */}
              <div className="floating-card card-1">
                <div className="card-icon">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="card-value">+15%</p>
                  <p className="card-label">{t('yield_growth')}</p>
                </div>
              </div>

              {/* Risk Alert */}
              <div className="floating-card card-2 border-l-4 border-red-500">
                <div className="card-icon text-red-500">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <p className="card-label-small text-red-600 font-bold">
                    {t('high')} {t('risk_level')}
                  </p>
                  <p className="card-value-small">{t('pest_alert')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="features-container">
          <div className="section-header">
            <h2 className="section-title">{t('features_title')}</h2>
            <p className="section-subtitle">
              {t('features_subtitle')}
            </p>
          </div>

          <div className="features-grid">

            {/* Crop */}
            <Link to="/crop-recommendation" className="feature-card">
              <div className="feature-icon crop">
                <Sprout size={32} />
              </div>
              <h3 className="feature-title">{t('nav_crop')}</h3>
              <p className="feature-description">
                {t('feature_crop_desc')}
              </p>
              <div className="feature-benefits">
                <div className="benefit-item">
                  <CheckCircle size={16} />
                  <span>{t('feature_soil')}</span>
                </div>
                <div className="benefit-item">
                  <CheckCircle size={16} />
                  <span>{t('feature_weather')}</span>
                </div>
              </div>
              <div className="feature-link">
                {t('learn_more')} <ArrowRight size={16} />
              </div>
            </Link>

            {/* Disease */}
            <Link to="/disease-detection" className="feature-card">
              <div className="feature-icon disease">
                <Target size={32} />
              </div>
              <h3 className="feature-title">{t('nav_disease')}</h3>
              <p className="feature-description">
                {t('feature_disease_desc')}
              </p>
              <div className="feature-benefits">
                <div className="benefit-item">
                  <CheckCircle size={16} />
                  <span>{t('feature_disease_types')}</span>
                </div>
                <div className="benefit-item">
                  <CheckCircle size={16} />
                  <span>{t('feature_instant')}</span>
                </div>
              </div>
              <div className="feature-link">
                {t('learn_more')} <ArrowRight size={16} />
              </div>
            </Link>

            {/* Fertilizer */}
            <Link to="/fertilizer" className="feature-card">
              <div className="feature-icon fertilizer">
                <Globe size={32} />
              </div>
              <h3 className="feature-title">{t('nav_fertilizer')}</h3>
              <p className="feature-description">
                {t('feature_fertilizer_desc')}
              </p>
              <div className="feature-benefits">
                <div className="benefit-item">
                  <CheckCircle size={16} />
                  <span>{t('feature_npk')}</span>
                </div>
                <div className="benefit-item">
                  <CheckCircle size={16} />
                  <span>{t('feature_cost')}</span>
                </div>
              </div>
              <div className="feature-link">
                {t('learn_more')} <ArrowRight size={16} />
              </div>
            </Link>

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-container">
          <h2 className="cta-title">{t('cta_title')}</h2>
          <div className="cta-actions">
            <Link to="/crop-recommendation" className="btn-cta-primary">
              {t('get_started')}
              <ArrowRight size={20} />
            </Link>
            <Link to="/weather" className="btn-cta-secondary">
              {t('check_weather')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;