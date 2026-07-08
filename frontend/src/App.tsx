import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';

import Navbar from './components/Navbar';
import Browse from './pages/Browse';
import RestaurantDetails from './pages/RestaurantDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOtp from './pages/VerifyOtp';
import PaymentPortal from './pages/PaymentPortal';
import Dashboard from './pages/Dashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import AdminDashboard from './pages/AdminDashboard';

// Query Client setup
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Guard checks
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070a13] flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const RoleRoute: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070a13] flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#070a13] text-gray-150 flex flex-col justify-between">
      <Navbar />
      <div className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/restaurants" replace />} />
          <Route path="/restaurants" element={<Browse />} />
          <Route path="/restaurants/:id" element={<RestaurantDetails />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />

          {/* Protected Customer Routes */}
          <Route 
            path="/booking-payment" 
            element={
              <ProtectedRoute>
                <PaymentPortal />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />

          {/* Protected Owner Routes */}
          <Route 
            path="/owner-dashboard" 
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['owner', 'admin']}>
                  <OwnerDashboard />
                </RoleRoute>
              </ProtectedRoute>
            } 
          />

          {/* Protected Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </RoleRoute>
              </ProtectedRoute>
            } 
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/restaurants" replace />} />
        </Routes>
      </div>
      <footer className="py-6 border-t border-gray-900 bg-[#06080e] text-center text-xs text-gray-600">
        &copy; {new Date().getFullYear()} TabReserve Systems Inc. All rights reserved.
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
};

export default App;
