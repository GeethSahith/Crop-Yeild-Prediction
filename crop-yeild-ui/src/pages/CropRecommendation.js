import React, { useState } from 'react';
import { cropAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import toast from 'react-hot-toast';
import {
  Sprout, TrendingUp, Droplets, Thermometer, CloudRain, 
  Gauge, Loader, RotateCcw, CheckCircle2, Sparkles, AlertCircle
} from 'lucide-react';
import './CropRecommendation.css';

function CropRecommendation() {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [formData, setFormData] = useState({
    crop: '',
    crop_year: '',
    season: '',
    state: '',
    area: '',
    annual_rainfall: '',
    fertilizer: '',
    pesticide: '',
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        crop: formData.crop,
        crop_year: parseInt(formData.crop_year),
        season: formData.season,
        state: formData.state,
        area: parseFloat(formData.area),
        annual_rainfall: parseFloat(formData.annual_rainfall),
        fertilizer: parseFloat(formData.fertilizer),
        pesticide: parseFloat(formData.pesticide),
      };
      const response = await cropAPI.recommendYield(data, lang);
      setResult(response);
      toast.success(t('crop_generated'));

      // Save prediction to Supabase yield_predictions table
      if (user?.id) {
        try {
          const { error: dbError } = await supabase
            .from('yield_predictions')
            .insert({
              user_id: user.id,
              crop: formData.crop,
              crop_year: parseInt(formData.crop_year),
              season: formData.season,
              state: formData.state,
              area: parseFloat(formData.area),
              annual_rainfall: parseFloat(formData.annual_rainfall),
              fertilizer: parseFloat(formData.fertilizer),
              pesticide: parseFloat(formData.pesticide),
              predicted_yield: response.predicted_yield_tph,
              confidence: response.confidence,
            });

          if (dbError) {
            console.error('Failed to save prediction to DB:', dbError.message);
          } else {
            console.log('Prediction saved to yield_predictions table');
          }
        } catch (dbErr) {
          console.error('DB insert error:', dbErr);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || t('crop_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
      setFormData({
        crop: '',
        crop_year: '',
        season: '',
        state: '',
        area: '',
        annual_rainfall: '',
        fertilizer: '',
        pesticide: '',
      });
      setResult(null);
    };

  return (
    <div className="crop-page">
      <div className="background-blur"></div>
      
      <div className="crop-container">
        {/* FIXED HEADER & SPROUT POSITIONING */}
        <header className="crop-header">
          <div className="header-content">
             <div className="brand-badge">
                <Sparkles size={14} /> <span>{t('hero_badge')}</span>
              </div>
              <h1 className="main-title">{t('crop_title')}</h1>
              <p className="main-subtitle">
                 {t('crop_subtitle')}
              </p>
          </div>
          <div className="header-visual">
            <div className="sprout-halo">
              <Sprout size={48} className="sprout-icon" />
            </div>
          </div>
        </header>

        <div className="main-layout">
          {/* INPUT PANEL */}
          <div className="data-card input-panel">
            <div className="card-top">
              <div className="icon-box"><Droplets size={24} /></div>
              <div>
                <h3>{t('enter_soil_climate')}</h3>
                <p>{t('provide_accurate')}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="modern-form">
              <div className="input-matrix">
                {[
                  { id: 'crop', label: t('crop') },
                  { id: 'crop_year', label: t('crop_year') },
                  { id: 'season', label: t('season') },
                  { id: 'state', label: t('state') },
                  { id: 'area', label: t('area') },
                  { id: 'annual_rainfall', label: t('annual_rainfall') },
                  { id: 'fertilizer', label: t('nav_fertilizer') },
                  { id: 'pesticide', label: t('pesticide') },
                ].map((input) => (
                  <div className="field-group" key={input.id}>
                    <label htmlFor={input.id}>{input.label}</label>
                    <div className="field-wrapper">
                     <input
                        type={
                          ['crop', 'season', 'state'].includes(input.id)
                            ? 'text'
                            : 'number'
                        }
                        id={input.id}
                        name={input.id}
                        value={formData[input.id]}
                        onChange={handleChange}
                        step="0.01"
                        required
                        placeholder={
                          ['crop', 'season', 'state'].includes(input.id)
                            ? t('enter_value')
                            : '0.00'
                        }
                      />
                      {input.unit && (
                        <span className="field-unit">{input.unit}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="action-bar">
                <button type="submit" className="btn-engine" disabled={loading}>
                  {loading ? <Loader className="spin" /> : <TrendingUp />}
                  <span>{loading ? t('analyzing') : t('predict_yield')}</span>
                </button>
                <button type="button" className="btn-ghost" onClick={handleReset} title={t('reset')}>
                  <RotateCcw size={18} />
                </button>
              </div>
            </form>
          </div>

          {/* RESULT PANEL WITH TRANSITIONS */}
          <div className={`data-card result-panel ${result ? 'has-result' : ''}`}>
            {result ? (
              <div className="result-view fade-in">
                <div className="recommendation-hero">
                  <div className="hero-label">{t('predicted_yield')}</div>
                    <h2 className="crop-name">
                      {result.predicted_yield_tph} {t('yield_unit')}
                    </h2>
                  <div className="confidence-pill">
                    <CheckCircle2 size={14} />
                    {result.confidence}% {t('confidence_label')}
                  </div>
                </div>

                <div className="insight-box">
                  <div className="box-header">
                    <AlertCircle size={18} />
                    <h4>{t('yield_insight')}</h4>
                  </div>
                  <p>
                    {t('yield_insight_desc')}
                    <strong> {result.predicted_yield_tph} {t('yield_unit')}</strong>.
                  </p>
                </div>

                <div className="metric-row">
                  <div className="m-item">
                    <span className="m-label">{t('suitability')}</span>
                    <span className="m-val highlight">{t('high')}</span>
                  </div>
                  <div className="m-item">
                    <span className="m-label">{t('risk_level')}</span>
                    <span className="m-val low">{t('low')}</span>
                  </div>
                </div>

                <div className="pro-tips-area">
                  <h5>{t('pro_tips')}</h5>
                  <ul>
                    <li>{t('tip_monitor_moisture')}</li>
                    <li>{t('tip_crop_rotation')}</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="waiting-state">
                <div className="pulse-circle">
                  <Sprout size={40} />
                </div>
                <h4>{t('analyzing_generic')}</h4>
                <p>{t('provide_accurate')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CropRecommendation;