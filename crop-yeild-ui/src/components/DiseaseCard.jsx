import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { AlertTriangle, CheckCircle, ShieldAlert, FileText, Share2 } from 'lucide-react';

const DiseaseCard = ({ result, onDownload }) => {
  const { t, lang } = useLanguage();

  if (!result) return null;

  // Expert logic for dynamic risk colors
  const confidencePercent = Math.round((result.confidence || 0.95) * 100);
  
  const getRiskStyles = (prob) => {
    if (prob >= 80) return {
      card: "border-red-200 bg-red-50",
      icon: <ShieldAlert className="text-red-600" size={32} />,
      badge: "bg-red-600",
      text: "text-red-700",
      label: t('risk_high')
    };
    if (prob >= 50) return {
      card: "border-yellow-200 bg-yellow-50",
      icon: <AlertTriangle className="text-yellow-600" size={32} />,
      badge: "bg-yellow-600",
      text: "text-yellow-700",
      label: t('risk_medium')
    };
    return {
      card: "border-green-200 bg-green-50",
      icon: <CheckCircle className="text-green-600" size={32} />,
      badge: "bg-green-600",
      text: "text-green-700",
      label: t('risk_low')
    };
  };

  const style = getRiskStyles(confidencePercent);

  return (
    <div className={`mt-6 border rounded-2xl overflow-hidden shadow-sm transition-all duration-500 ${style.card}`}>
      {/* Risk Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/50">
        <div className="flex items-center gap-3">
          {style.icon}
          <div>
            <span className={`text-xs font-bold uppercase tracking-widest ${style.text}`}>
              {style.label}
            </span>
            <h2 className="text-2xl font-bold text-gray-900">{result.disease}</h2>
          </div>
        </div>
        <div className={`${style.badge} text-white px-3 py-1 rounded-full text-sm font-bold shadow-sm`}>
          {confidencePercent}% {t('confidence_label')}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Description */}
        {result.description && (
          <div>
            <h4 className="text-sm font-bold text-gray-500 uppercase mb-1">
              {t('diagnosis')}
            </h4>
            <p className="text-gray-700 leading-relaxed">{result.description}</p>
          </div>
        )}

        {/* Treatment & Prevention Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/60 p-4 rounded-xl border border-white">
            <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-2">
              💊 {t('treatment')}
            </h4>
            <p className="text-sm text-gray-600">{result.treatment || t('na_value')}</p>
          </div>
          <div className="bg-white/60 p-4 rounded-xl border border-white">
            <h4 className="font-bold text-green-800 flex items-center gap-2 mb-2">
              🛡️ {t('prevention')}
            </h4>
            <p className="text-sm text-gray-600">{result.prevention || t('na_value')}</p>
          </div>
        </div>

        {/* Expert Actions */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-white/50">
          <button 
            onClick={onDownload}
            className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl hover:bg-black transition-all shadow-md active:scale-95"
          >
            <FileText size={18} />
            {t('download_report')}
          </button>
          <button className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-all shadow-sm">
            <Share2 size={18} />
            {t('share')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiseaseCard;