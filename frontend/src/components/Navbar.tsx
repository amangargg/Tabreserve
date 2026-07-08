import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { Menu, X, Utensils, LayoutDashboard, LogOut, Search } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
      scrolled ? 'glass-panel py-3 shadow-lg' : 'bg-transparent py-5'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12">
          
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="p-2 btn-primary rounded-lg text-white group-hover:scale-110 transition-transform">
              <Utensils className="h-5 w-5" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-white">
              Tab<span className="text-brand-400">Reserve</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/restaurants" className="text-gray-300 hover:text-white hover:scale-105 transition-all text-sm font-medium flex items-center gap-1.5">
              <Search className="w-4 h-4" /> Browse
            </Link>
            
            {user ? (
              <>
                <Link to="/dashboard" className="text-gray-300 hover:text-white hover:scale-105 transition-all text-sm font-medium flex items-center gap-1.5">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>
                
                {user.role === 'owner' && (
                  <Link to="/owner-dashboard" className="text-brand-300 hover:text-brand-200 transition-all text-sm font-medium">
                    Owner Hub
                  </Link>
                )}

                {user.role === 'admin' && (
                  <Link to="/admin" className="text-red-300 hover:text-red-200 transition-all text-sm font-medium">
                    Admin Portal
                  </Link>
                )}

                <NotificationBell />

                <div className="flex items-center space-x-3 pl-4 border-l border-gray-800">
                  <div className="flex flex-col text-right">
                    <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold">{user.role}</span>
                    <span className="text-sm font-semibold text-white">{user.name}</span>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-red-400 rounded-full hover:bg-red-500/10 transition-all"
                    title="Log Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3 pl-4">
                <Link 
                  to="/login" 
                  className="text-gray-300 hover:text-white text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  to="/register" 
                  className="px-4 py-2 text-sm font-semibold text-white btn-primary rounded-lg transition-all"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-4">
            {user && <NotificationBell />}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu dropdown */}
      {isOpen && (
        <div className="md:hidden glass-panel border-t border-gray-800 mt-2 py-4 px-4 space-y-3 animate-fade-in">
          <Link 
            to="/restaurants" 
            className="block text-gray-300 hover:text-white py-2 text-base font-medium"
            onClick={() => setIsOpen(false)}
          >
            Browse Restaurants
          </Link>
          
          {user ? (
            <>
              <Link 
                to="/dashboard" 
                className="block text-gray-300 hover:text-white py-2 text-base font-medium"
                onClick={() => setIsOpen(false)}
              >
                Dashboard
              </Link>
              {user.role === 'owner' && (
                <Link 
                  to="/owner-dashboard" 
                  className="block text-brand-300 hover:text-brand-200 py-2 text-base font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  Owner Dashboard
                </Link>
              )}
              {user.role === 'admin' && (
                <Link 
                  to="/admin" 
                  className="block text-red-300 hover:text-red-200 py-2 text-base font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  Admin Portal
                </Link>
              )}
              
              <div className="pt-4 border-t border-gray-800 flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold text-white">{user.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          ) : (
            <div className="pt-4 border-t border-gray-800 flex flex-col space-y-2">
              <Link 
                to="/login" 
                className="w-full text-center py-2 text-sm text-gray-300 hover:text-white font-medium"
                onClick={() => setIsOpen(false)}
              >
                Sign In
              </Link>
              <Link 
                to="/register" 
                className="w-full text-center py-2 text-sm text-white font-semibold btn-primary rounded-lg"
                onClick={() => setIsOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
