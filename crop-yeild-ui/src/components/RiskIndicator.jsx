import React from 'react';
import { AlertTriangle, ShieldCheck, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const RiskIndicator = ({ probability }) => {
  const { t } = useLanguage();
  
  // Logic for color coding (Requirement: Better UI risk colors)
  const getRiskDetails = (p) => {
    if (p >= 80) {
      return {
        color: 'bg-red-50 text-red-700 border-red-200',
        icon: <AlertTriangle />,
        label: t('risk_high')
      };
    }

    if (p >= 50) {
      return {
        color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        icon: <AlertCircle />,
        label: t('risk_medium')
      };
    }

    return {
      color: 'bg-green-50 text-green-700 border-green-200',
      icon: <ShieldCheck />,
      label: t('risk_low')
    };
  };

  const risk = getRiskDetails(probability);

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border ${risk.color} transition-all duration-500`}>
      <div className="p-2 bg-white rounded-full shadow-sm">
        {risk.icon}
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider font-bold opacity-70">{t('risk_level')}</p>
        <p className="text-lg font-extrabold">{risk.label} ({probability}%)</p>
      </div>
    </div>
  );
};

export default RiskIndicator;