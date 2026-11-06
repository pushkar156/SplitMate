import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'sonner';
import { LoginPage } from './pages/auth/LoginPage';
import { OotyDashboardPage } from './pages/dashboard/OotyDashboardPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#a8c7fa] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            theme="system"
            richColors
            closeButton
            toastOptions={{
              style: {
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-color)',
              },
            }}
          />
          <Routes>
            {/* 13-member Ooty Login Page */}
            <Route path="/login" element={<LoginPage />} />

            {/* Dedicated Ooty Trip Dashboard (device stays logged in until logout) */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <OotyDashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Redirect any old routes straight to the Ooty Dashboard */}
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/groups/*" element={<Navigate to="/" replace />} />
            <Route path="/join/*" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
