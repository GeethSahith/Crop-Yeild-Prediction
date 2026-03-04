import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell
} from 'recharts';
import { useLanguage } from '../context/LanguageContext';

const YieldChart = ({ currentPrediction }) => {
  const { t } = useLanguage();

  // ✅ multilingual data
  const data = [
    { name: t('avg_regional_yield'), value: 450 },
    { name: t('your_prediction'), value: currentPrediction || 0 }
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-80">
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        {t('chart_analysis')}
      </h3>

      <ResponsiveContainer width="100%" height="80%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} />
          <YAxis axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: '#f9fafb' }} />

          <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={50}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === 1 ? '#10b981' : '#94a3b8'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default YieldChart;