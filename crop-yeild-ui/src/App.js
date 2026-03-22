import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, AuthRoute } from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import CropRecommendation from './pages/CropRecommendation';
import DiseaseDetection from './pages/DiseaseDetection';
import FertilizerRecommendation from './pages/FertilizerRecommendation';
import Weather from './pages/Weather';
import Login from './pages/Login';
import Signup from './pages/Signup';
import CheckEmail from './pages/CheckEmail';
import VerifyOtp from './pages/VerifyOtp';
import './App.css';

function App() {
  return (
    <AuthProvider>
        <Router>
          <div className="app">
            <Toaster position="top-right" />
            <Navbar />
            <main className="main-content">
              <Routes>
                <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
                <Route path="/signup" element={<AuthRoute><Signup /></AuthRoute>} />
                <Route path="/check-email" element={<CheckEmail />} />
                <Route path="/verify-otp" element={<VerifyOtp />} />

                <Route path="/" element={<Home />} />
                <Route path="/yield-prediction" element={<ProtectedRoute><CropRecommendation /></ProtectedRoute>} />
                <Route path="/disease-detection" element={<ProtectedRoute><DiseaseDetection /></ProtectedRoute>} />
                <Route path="/fertilizer" element={<ProtectedRoute><FertilizerRecommendation /></ProtectedRoute>} />
                <Route path="/weather" element={<ProtectedRoute><Weather /></ProtectedRoute>} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </Router>
    </AuthProvider>
  );
}

export default App;