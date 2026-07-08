import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import type { Notification } from '../types';
import { Bell, CheckCircle, Info, Calendar, DollarSign, X } from 'lucide-react';

const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (e) {
      console.error("Failed to load notifications", e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 15 seconds
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment_success':
        return <DollarSign className="w-4 h-4 text-emerald-400" />;
      case 'booking_confirmed':
      case 'booking_confirmed_email':
        return <CheckCircle className="w-4 h-4 text-brand-400" />;
      case 'booking_cancelled':
        return <X className="w-4 h-4 text-red-400" />;
      case 'waitlist_promotion':
        return <Calendar className="w-4 h-4 text-purple-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white ring-2 ring-slate-900 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 glass-card rounded-xl shadow-2xl overflow-hidden z-50 py-1">
          <div className="flex justify-between items-center px-4 py-2 border-b border-gray-800">
            <span className="font-display font-semibold text-sm text-white">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-medium text-brand-400 hover:text-brand-300 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.is_read && markAsRead(notif.id)}
                  className={`px-4 py-3 border-b border-gray-800/50 flex gap-3 items-start cursor-pointer hover:bg-gray-800/40 transition-colors ${
                    !notif.is_read ? 'bg-indigo-950/20' : ''
                  }`}
                >
                  <div className="mt-0.5 p-1 bg-gray-900/80 rounded-md border border-gray-800 flex-shrink-0">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs text-gray-300 leading-relaxed ${!notif.is_read ? 'font-semibold text-white' : ''}`}>
                      {notif.message}
                    </p>
                    <span className="text-[9px] text-gray-500 mt-1 block">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {!notif.is_read && (
                    <span className="w-1.5 h-1.5 bg-brand-500 rounded-full flex-shrink-0 mt-2"></span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
