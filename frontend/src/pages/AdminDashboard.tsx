import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import type { AdminStats } from '../types';
import { ShieldCheck, Users, Utensils, Calendar, CreditCard, DollarSign } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAdminStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchAdminStats();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070a13] flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070a13] pt-28 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-3.5 mb-10 border-b border-gray-800 pb-5">
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-extrabold text-white">Admin Operations Console</h1>
            <p className="text-sm text-gray-400 mt-1">Platform-wide statistics, payment audits, and transaction logs.</p>
          </div>
        </div>

        {/* Global Statistics Cards */}
        {stats && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
              
              {/* Users Stats */}
              <div className="glass-card rounded-2xl p-5 border border-gray-800 flex gap-4 items-center">
                <div className="p-3 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Total Users</span>
                  <p className="font-display font-bold text-lg text-white">{stats.total_users}</p>
                </div>
              </div>

              {/* Restaurants Stats */}
              <div className="glass-card rounded-2xl p-5 border border-gray-800 flex gap-4 items-center">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-brand-300 rounded-xl">
                  <Utensils className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Restaurants</span>
                  <p className="font-display font-bold text-lg text-white">{stats.total_restaurants}</p>
                </div>
              </div>

              {/* Bookings Stats */}
              <div className="glass-card rounded-2xl p-5 border border-gray-800 flex gap-4 items-center">
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Bookings</span>
                  <p className="font-display font-bold text-lg text-white">{stats.total_bookings}</p>
                </div>
              </div>

              {/* Payments Stats */}
              <div className="glass-card rounded-2xl p-5 border border-gray-800 flex gap-4 items-center">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Payments</span>
                  <p className="font-display font-bold text-lg text-white">{stats.total_payments}</p>
                </div>
              </div>

              {/* Platform Revenue */}
              <div className="glass-card rounded-2xl p-5 border border-gray-800 col-span-2 lg:col-span-1 flex gap-4 items-center">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Total Revenue</span>
                  <p className="font-display font-bold text-lg text-white">Rs. {stats.total_revenue.toFixed(2)}</p>
                </div>
              </div>

            </div>

            {/* Recent Bookings Audit Table */}
            <div className="glass-card rounded-2xl p-6 border border-gray-800">
              <h3 className="font-display font-bold text-base text-white mb-4">Recent Bookings Log</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800">
                      <th className="pb-3 font-semibold">Booking ID</th>
                      <th className="pb-3 font-semibold">Date</th>
                      <th className="pb-3 font-semibold">Time</th>
                      <th className="pb-3 font-semibold">Guests Pax</th>
                      <th className="pb-3 font-semibold">Payment Status</th>
                      <th className="pb-3 font-semibold">Reservation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {stats.recent_bookings.map((booking) => (
                      <tr key={booking.id} className="text-gray-300 hover:text-white">
                        <td className="py-3.5 font-semibold">#BR-{booking.id}</td>
                        <td className="py-3.5">{booking.booking_date}</td>
                        <td className="py-3.5">{booking.booking_time.substring(0, 5)}</td>
                        <td className="py-3.5">{booking.guests} Guests</td>
                        <td className="py-3.5 capitalize">{booking.payment_status}</td>
                        <td className="py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            booking.booking_status === 'confirmed'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : booking.booking_status === 'cancelled'
                              ? 'bg-red-500/10 text-red-400'
                              : booking.booking_status === 'completed'
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {booking.booking_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
