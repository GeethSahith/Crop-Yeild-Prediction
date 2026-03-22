import React, { useState } from 'react';
import { weatherAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import {
  Cloud,
  CloudRain,
  Wind,
  Droplets,
  Gauge,
  Thermometer,
  Loader,
  MapPin,
  Search,
  Navigation,
  Sun,
  Info,
  ChevronRight,
  Sprout
} from 'lucide-react';
import './Weather.css';

function Weather() {
  const { lang, t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [city, setCity] = useState('');
  const [countryCode, setCountryCode] = useState('IN');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!city.trim()) {
      toast.error(t('enter_city_error'));
      return;
    }

    setLoading(true);

    try {
      const response = await weatherAPI.getWeather(city, countryCode, lang);
      setWeatherData(response);
      toast.success(t('weather_success'));
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || t('weather_failed'));
      setWeatherData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="weather-page">
      <div className="weather-container">
        {/* Header */}
        <div className="page-header">
          <div className="header-icon-wrapper weather">
            <Cloud size={40} className="header-icon-main" />
          </div>
          <div className="header-text">
            <h1 className="page-title">{t('weather_title')}</h1>
            <p className="page-subtitle">{t('weather_subtitle')}</p>
          </div>
        </div>

        <div className="content-grid">
          {/* Search Section */}
          <div className="search-side">
            <div className="weather-form-container">
              <form onSubmit={handleSubmit} className="weather-form">
                <div className="form-header">
                  <div className="form-header-title">
                    <Search size={20} className="text-blue-500" />
                    <h2>{t('search_location')}</h2>
                  </div>
                  <p>{t('enter_city_hint')}</p>
                </div>

                <div className="search-grid">
                  <div className="input-group">
                    <label htmlFor="city">
                      <MapPin size={18} />
                      {t('city_name')}
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g., Mumbai, Delhi"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="countryCode">
                      <Navigation size={18} />
                      {t('country_code')}
                    </label>
                    <input
                      type="text"
                      id="countryCode"
                      name="countryCode"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      placeholder="IN"
                      maxLength="2"
                    />
                  </div>
                </div>

                <button type="submit" className="btn-submit-weather" disabled={loading}>
                  {loading ? (
                    <><Loader className="spinner" size={20} /> {t('fetching')}</>
                  ) : (
                    <><Cloud size={20} /> {t('get_weather')}</>
                  )}
                </button>
              </form>
            </div>

            {/* Quick Cities */}
            <div className="quick-cities-card">
              <div className="card-header">
                <Sun size={18} className="text-yellow-500" />
                <h4>{t('quick_access')}</h4>
              </div>
              <div className="city-buttons-grid">
                {['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Pune'].map((quickCity) => (
                  <button
                    key={quickCity}
                    className="city-btn"
                    onClick={() => {
                      setCity(quickCity);
                      setCountryCode('IN');
                    }}
                  >
                    {quickCity}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Weather Result */}
          <div className="result-side">
            {weatherData ? (
              <div className="weather-animate-in">
                <div className="weather-card main-display">
                  <div className="location-info">
                    <div className="loc-text">
                      <MapPin size={24} className="pin-icon" />
                      <div>
                        <h2>{city}</h2>
                        <p className="condition-text">{weatherData.description || 'Clear Sky'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="temp-main">
                    <Thermometer size={64} className="temp-icon" />
                    <div className="temp-numbers">
                      <span className="temp-val">{weatherData.temperature || '25'}°</span>
                      <span className="temp-unit">{t('celsius')}</span>
                    </div>
                  </div>
                </div>

                {/* Detailed Stats Grid */}
                <div className="stats-grid">
                  <div className="stat-box">
                    <div className="stat-icon-bg humidity">
                      <Droplets size={24} />
                    </div>
                    <div className="stat-data">
                      <span className="label">{t('humidity')}</span>
                      <span className="value">{weatherData.humidity || '65'}%</span>
                    </div>
                  </div>

                  <div className="stat-box">
                    <div className="stat-icon-bg wind">
                      <Wind size={24} />
                    </div>
                    <div className="stat-data">
                      <span className="label">{t('wind_speed')}</span>
                      <span className="value">{weatherData.windSpeed || '5'} m/s</span>
                    </div>
                  </div>

                  <div className="stat-box">
                    <div className="stat-icon-bg pressure">
                      <Gauge size={24} />
                    </div>
                    <div className="stat-data">
                      <span className="label">{t('pressure')}</span>
                      <span className="value">{weatherData.pressure || '1013'} hPa</span>
                    </div>
                  </div>

                  <div className="stat-box">
                    <div className="stat-icon-bg rain">
                      <CloudRain size={24} />
                    </div>
                    <div className="stat-data">
                      <span className="label">{t('condition')}</span>
                      <span className="value">{weatherData.description || 'Clear'}</span>
                    </div>
                  </div>
                </div>

                {/* Farming Tips */}
                <div className="farming-tips-container">
                  <div className="tips-title">
                    <Sprout size={20} />
                    <h4>{t('farming_recommendations')}</h4>
                  </div>
                  <ul className="tips-list">
                    <li>
                      <Info size={18} className="tip-bullet" />
                      <span>{weatherData.temperature > 30 ? t('tip_high_temp') : t('tip_normal_temp')}</span>
                    </li>
                    <li>
                      <Info size={18} className="tip-bullet" />
                      <span>{weatherData.humidity > 80 ? t('tip_high_humidity') : t('tip_good_humidity')}</span>
                    </li>
                    <li>
                      <Info size={18} className="tip-bullet" />
                      <span>{weatherData.windSpeed > 10 ? t('tip_high_wind') : t('tip_good_wind')}</span>
                    </li>
                    <li>
                      <ChevronRight size={18} className="tip-bullet" />
                      <span>{t('tip_forecast')}</span>
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="weather-empty-state">
                <Cloud size={60} className="empty-icon" />
                <h3>{t('weather_title')}</h3>
                <p>{t('enter_city_hint')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Weather;