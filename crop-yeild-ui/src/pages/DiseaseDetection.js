import React, { useState } from 'react';
import { diseaseAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { generatePDF } from '../utils/reportGenerator';
import toast from 'react-hot-toast';
import {
  Target, Upload, X, Loader, FileDown,
  Sparkles, ShieldAlert, Zap, Info, RotateCcw, CheckCircle
} from 'lucide-react';
import './DiseaseDetection.css';

function DiseaseDetection() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // File handling (Drag & Drop + Click)
  const handleFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
      setResult(null);
    } else {
      toast.error(t('upload_hint'));
    }
  };

  const onDrag = (e) => {
    e.preventDefault();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return toast.error(t('upload_hint'));

    setLoading(true);
    try {
      const response = await diseaseAPI.detectDisease(selectedFile);
      setResult(response);
      toast.success(t('disease_success'), { icon: '🔍' });
    } catch (error) {
      toast.error(t('detection_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
  };

  return (
    <div className="disease-page">
      <div className="background-blur-disease"></div>

      <div className="disease-container">
        {/* MATCHED HEADER */}
        <header className="disease-header">
          <div className="header-left">
            <div className="brand-badge-blue">
              <Sparkles size={14} /> <span>{t('hero_badge')}</span>
            </div>
            <h1 className="main-title">{t('nav_disease')}</h1>
            <p className="main-subtitle">{t('disease_subtitle')}</p>
          </div>
          <div className="header-visual">
            <div className="icon-halo">
              <Target size={40} />
            </div>
          </div>
        </header>

        <div className="main-layout">
          {/* UPLOAD PANEL */}
          <div className="data-card">
            <div className="card-top">
              <div className="icon-box" style={{ background: '#3b82f6' }}>
                <Upload size={24} />
              </div>
              <div>
                <h3>{t('diagnosis')}</h3>
                <p>{t('file_type_hint')}</p>
              </div>
            </div>

            <div
              className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={onDrag}
              onDragOver={onDrag}
              onDragLeave={onDrag}
              onDrop={onDrop}
              onClick={() => !preview && document.getElementById('file-input').click()}
            >
              <input
                id="file-input"
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => handleFile(e.target.files[0])}
              />

              {!preview ? (
                <div className="upload-prompt">
                  <div className="icon-halo" style={{ margin: '0 auto 1.5rem' }}>
                    <Upload size={32} />
                  </div>
                  <h3>{t('upload_drop')}</h3>
                  <p>{t('upload_browse')}</p>
                </div>
              ) : (
                <div className="preview-wrapper">
                  <img src={preview} alt="Preview" className="preview-img" />
                  <button className="btn-remove-img" onClick={(e) => { e.stopPropagation(); handleReset(); }}>
                    <X size={20} />
                  </button>
                </div>
              )}
            </div>

            <div className="action-row">
              <button className="btn-detect" onClick={handleSubmit} disabled={loading || !preview}>
                {loading ? <Loader className="spin" size={20} /> : <Target size={20} />}
                <span>{loading ? t('analyzing') : t('prediction_btn')}</span>
              </button>
              {preview && (
                <button className="btn-ghost" onClick={handleReset}>
                  <RotateCcw size={18} />
                </button>
              )}
            </div>
          </div>

          {/* RESULT PANEL */}
          <div className={`data-card result-panel-disease ${result ? 'has-result' : ''}`} id="report-area">
            {result ? (
              <div className="result-content fade-up">
                <span className="disease-badge">{t('disease_detected')}</span>
                <h2>{result.disease.replace(/___/g, ' ').replace(/_/g, ' ')}</h2>

                <div className="metric-row">
                  <div className="m-item" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <span className="m-label">{t('confidence_label')}</span>
                    <span className="m-val">{result.confidence}%</span>
                  </div>
                  <div
                    className="m-item"
                    style={{ background: 'rgba(255,255,255,0.1)' }}
                  >
                    <span className="m-label">{t('risk_level')}</span>

                    <span
                      className="m-val"
                      style={{
                        color:
                          (result?.risk_level || '').toLowerCase().includes('high')
                            ? '#f87171'
                            : (result?.risk_level || '').toLowerCase().includes('medium')
                            ? '#facc15'
                            : '#34d399',
                      }}
                    >
                      {result?.risk_level}
                    </span>
                  </div>
                </div>

                <div className="info-box-glass">
                  <h4><Info size={16} /> {t('description')}</h4>
                  <p>{result.description}</p>
                </div>

                <div className="info-box-glass">
                  <h4><Zap size={16} /> {t('treatment')}</h4>
                  <p>{result.treatment}</p>
                </div>

                <div className="info-box-glass">
                  <h4><ShieldAlert size={16} /> {t('prevention')}</h4>
                  <p>{result.prevention}</p>
                </div>

                <button
                  className="btn-detect"
                  style={{ background: '#3b82f6', marginTop: '1rem' }}
                  onClick={() => generatePDF('report-area', 'Health_Report.pdf')}
                >
                  <FileDown size={20} />
                  <span>{t('download_report')}</span>
                </button>
              </div>
            ) : (
              <div className="waiting-state" style={{ marginTop: '20%' }}>
                <div className="pulse-circle" style={{ color: '#3b82f6' }}>
                  <Target size={40} />
                </div>
                <h4>{t('analyzing_generic')}</h4>
                <p>{t('disease_subtitle')}</p>
              </div>
            )}
          </div>
          <div className="info-cards">
              <div className="info-card">
                <CheckCircle size={24} className="info-icon" />
                <div>
                  <h4>{t('feature_disease_types')}</h4>
                  <p>{t('covers_diseases')}</p>
                </div>
              </div>
              <div className="info-card">
                <Target size={24} className="info-icon" />
                <div>
                  <h4>95% {t('confidence_label')}</h4>
                  <p>{t('deep_learning')}</p>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}

export default DiseaseDetection;