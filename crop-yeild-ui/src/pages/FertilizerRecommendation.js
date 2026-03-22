import React, { useState } from 'react';
import { fertilizerAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import toast from 'react-hot-toast';
import { 
  Droplet, Sprout, Loader, Info, Zap, 
  ShieldCheck, RotateCcw, ChevronRight, 
  Lightbulb, Beaker 
} from 'lucide-react';
import './FertilizerRecommendation.css';

function FertilizerRecommendation() {
  const { lang, t } = useLanguage();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [formData, setFormData] = useState({
    nitrogen: '',
    phosphorus: '',
    potassium: '',
    crop_name: '',
  });

  const cropList = [
    'Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane', 'Potato', 'Tomato',
    'Onion', 'Banana', 'Mango', 'Grapes', 'Apple', 'Orange', 'Coconut',
    'Coffee', 'Tea', 'Soybean', 'Groundnut', 'Chickpea', 'Lentil'
  ];

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const data = {
        nitrogen: parseFloat(formData.nitrogen),
        phosphorus: parseFloat(formData.phosphorus),
        potassium: parseFloat(formData.potassium),
        crop_name: formData.crop_name,
      };

      const response = await fertilizerAPI.recommendFertilizer(data, lang);
      setResult(response);
      toast.success(t('fertilizer_generated'));

      // Save recommendation to Supabase fertilizer_recommendations table
      if (user?.id) {
        try {
          const { error: dbError } = await supabase
            .from('fertilizer_recommendations')
            .insert({
              user_id: user.id,
              nitrogen: parseFloat(formData.nitrogen),
              phosphorus: parseFloat(formData.phosphorus),
              potassium: parseFloat(formData.potassium),
              crop_name: formData.crop_name,
              recommended_fertilizer: response.fertilizer,
              description: response.description,
              dosage: response.dosage,
              npk_analysis: response.npk_analysis,
              language: lang,
            });

          if (dbError) {
            console.error('Failed to save recommendation to DB:', dbError.message);
          } else {
            console.log('Recommendation saved to fertilizer_recommendations table');
          }
        } catch (dbErr) {
          console.error('DB insert error:', dbErr);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || t('fertilizer_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      nitrogen: '',
      phosphorus: '',
      potassium: '',
      crop_name: '',
    });
    setResult(null);
  };

  return (
    <div className="fertilizer-page">
      <div className="fertilizer-container">
        {/* HEADER */}
        <div className="page-header">
          <div className="header-icon-wrapper">
            <Beaker size={40} className="header-icon-main" />
          </div>
          <div className="header-text">
            <h1 className="page-title">{t('fertilizer_title')}</h1>
            <p className="page-subtitle">{t('fertilizer_subtitle')}</p>
          </div>
        </div>

        <div className="content-grid">
          {/* FORM SECTION */}
          <div className="form-section-wrapper">
            <form onSubmit={handleSubmit} className="fertilizer-form">
              <div className="form-header">
                <h2>{t('enter_npk_crop')}</h2>
                <p>{t('provide_npk')}</p>
              </div>

              {/* CROP SELECTION */}
              <div className="input-group">
                <label htmlFor="crop_name">
                  <Sprout size={18} className="label-icon" />
                  {t('select_crop')}
                </label>
                <select
                  id="crop_name"
                  name="crop_name"
                  value={formData.crop_name}
                  onChange={handleChange}
                  required
                >
                  <option value="">{t('select_crop_placeholder')}</option>
                  {cropList.map((crop) => (
                    <option key={crop} value={crop}>{crop}</option>
                  ))}
                </select>
              </div>

              {/* NPK INPUT GRID */}
              <div className="npk-grid">
                <div className="input-group">
                  <label htmlFor="nitrogen">
                    <span className="npk-badge n">N</span>
                    {t('nitrogen')}
                  </label>
                  <div className="input-with-hint">
                    <input
                      type="number"
                      id="nitrogen"
                      name="nitrogen"
                      value={formData.nitrogen}
                      onChange={handleChange}
                      placeholder="e.g. 37"
                      step="0.01"
                      required
                    />
                    <span className="unit-label">kg/ha</span>
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="phosphorus">
                    <span className="npk-badge p">P</span>
                    {t('phosphorus')}
                  </label>
                  <div className="input-with-hint">
                    <input
                      type="number"
                      id="phosphorus"
                      name="phosphorus"
                      value={formData.phosphorus}
                      onChange={handleChange}
                      placeholder="e.g. 50"
                      step="0.01"
                      required
                    />
                    <span className="unit-label">kg/ha</span>
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="potassium">
                    <span className="npk-badge k">K</span>
                    {t('potassium')}
                  </label>
                  <div className="input-with-hint">
                    <input
                      type="number"
                      id="potassium"
                      name="potassium"
                      value={formData.potassium}
                      onChange={handleChange}
                      placeholder="e.g. 45"
                      step="0.01"
                      required
                    />
                    <span className="unit-label">kg/ha</span>
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="form-actions">
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? (
                    <><Loader className="spinner" size={20} /> {t('analyzing_generic')}</>
                  ) : (
                    <><Droplet size={20} /> {t('get_recommendation')}</>
                  )}
                </button>

                <button type="button" className="btn-reset" onClick={handleReset} disabled={loading}>
                  <RotateCcw size={18} /> {t('reset')}
                </button>
              </div>
            </form>

            {/* NPK KNOWLEDGE CARD */}
            <div className="npk-info-card">
              <div className="card-title-row">
                <Info size={20} className="info-icon-blue" />
                <h4>{t('npk_understanding')}</h4>
              </div>

              <div className="npk-descriptions">
                <div className="npk-item">
                  <span className="npk-badge n">N</span>
                  <div>
                    <strong>{t('nitrogen')}</strong>
                    <p>{t('nitrogen_desc')}</p>
                  </div>
                </div>

                <div className="npk-item">
                  <span className="npk-badge p">P</span>
                  <div>
                    <strong>{t('phosphorus')}</strong>
                    <p>{t('phosphorus_desc')}</p>
                  </div>
                </div>

                <div className="npk-item">
                  <span className="npk-badge k">K</span>
                  <div>
                    <strong>{t('potassium')}</strong>
                    <p>{t('potassium_desc')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RESULT SECTION */}
          <div className="result-section">
            {result ? (
              <div className="result-animate-container">
                <div className="result-card">
                  <div className="result-header">
                    <div className="result-icon-box">
                      <ShieldCheck size={32} />
                    </div>
                    <h3>{t('fertilizer_title')}</h3>
                  </div>

                  <div className="fertilizer-result">
                    <h2 className="fertilizer-name">
                      {result.fertilizer || t('recommended_fertilizer')}
                    </h2>

                    <div className="fertilizer-badge-main">
                      <Sprout size={14} /> {t('for_crop', { crop: formData.crop_name })}
                    </div>

                    {result.description && (
                      <div className="result-content-box">
                        <div className="box-label"><Info size={16}/> {t('description')}</div>
                        <p>{result.description}</p>
                      </div>
                    )}

                    {result.dosage && (
                      <div className="result-content-box">
                        <div className="box-label"><Zap size={16}/> {t('application')}</div>
                        <p>{result.dosage}</p>
                      </div>
                    )}

                    {/* NPK SUMMARY VALUES */}
                    <div className="npk-values-summary">
                      <div className="summary-item">
                        <span className="npk-badge n">N</span>
                        <div className="val-group">
                          <span className="value">{formData.nitrogen}</span>
                          <span className="unit">kg/ha</span>
                        </div>
                      </div>
                      <div className="summary-item">
                        <span className="npk-badge p">P</span>
                        <div className="val-group">
                          <span className="value">{formData.phosphorus}</span>
                          <span className="unit">kg/ha</span>
                        </div>
                      </div>
                      <div className="summary-item">
                        <span className="npk-badge k">K</span>
                        <div className="val-group">
                          <span className="value">{formData.potassium}</span>
                          <span className="unit">kg/ha</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* APPLICATION TIPS */}
                <div className="tips-card">
                  <div className="tips-header">
                    <Lightbulb size={20} />
                    <h4>{t('application_tips')}</h4>
                  </div>
                  <ul className="tips-list">
                    <li><ChevronRight size={14} /> {t('tip_apply_time')}</li>
                    <li><ChevronRight size={14} /> {t('tip_even_distribution')}</li>
                    <li><ChevronRight size={14} /> {t('tip_water_after')}</li>
                    <li><ChevronRight size={14} /> {t('tip_follow_dosage')}</li>
                    <li><ChevronRight size={14} /> {t('tip_monitor_ph')}</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="empty-state-card">
                <div className="pulse-icon-container">
                  <Droplet size={48} />
                </div>
                <h4>{t('waiting_for_input')}</h4>
                <p>{t('fertilizer_subtitle')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FertilizerRecommendation;