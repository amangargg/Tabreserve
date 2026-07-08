import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import type { Restaurant, Table, Booking, Waitlist, OwnerAnalytics } from '../types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Plus, Trash2, Calendar, DollarSign, Clock, Star, Users, LayoutGrid, ShieldAlert, Award, Check, X } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const OwnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [activeRestaurant, setActiveRestaurant] = useState<Restaurant | null>(null);
  
  // Create restaurant state
  const [showCreateRest, setShowCreateRest] = useState(false);
  const [newRestName, setNewRestName] = useState('');
  const [newRestAddress, setNewRestAddress] = useState('');
  const [newRestCuisine, setNewRestCuisine] = useState('');
  const [newRestOpen, setNewRestOpen] = useState('11:00');
  const [newRestClose, setNewRestClose] = useState('23:00');
  const [newRestDesc, setNewRestDesc] = useState('');
  const [createRestError, setCreateRestError] = useState('');

  // Analytics, tables, waitlist, bookings state
  const [analytics, setAnalytics] = useState<OwnerAnalytics | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waitlist, setWaitlist] = useState<Waitlist[]>([]);
  const [activeTab, setActiveTab] = useState<'analytics' | 'tables' | 'bookings' | 'waitlist'>('analytics');
  
  // Table creation state
  const [newTableNum, setNewTableNum] = useState('');
  const [newTableCap, setNewTableCap] = useState(4);
  const [newTableType, setNewTableType] = useState('indoor');

  const fetchOwnerRestaurants = async () => {
    try {
      const res = await api.get('/restaurants');
      // Filter restaurants owned by the current owner (the backend `/restaurants` list returns all, we filter here)
      const owned = res.data.filter((r: Restaurant) => r.owner_id === user?.id);
      setRestaurants(owned);
      if (owned.length > 0) {
        setActiveRestaurant(owned[0]);
      } else {
        setShowCreateRest(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRestaurantData = async () => {
    if (!activeRestaurant) return;
    try {
      // Fetch analytics
      const analRes = await api.get('/admin/owner/analytics', { params: { restaurant_id: activeRestaurant.id } });
      setAnalytics(analRes.data);

      // Fetch tables
      const tabRes = await api.get('/tables', { params: { restaurant_id: activeRestaurant.id } });
      setTables(tabRes.data);

      // Fetch bookings
      const bookRes = await api.get('/bookings');
      const filteredBookings = bookRes.data.filter((b: Booking) => b.restaurant_id === activeRestaurant.id);
      setBookings(filteredBookings);

      // Fetch waitlist
      const waitRes = await api.get(`/waitlist/restaurant/${activeRestaurant.id}`);
      setWaitlist(waitRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'owner') {
      navigate('/login');
      return;
    }
    fetchOwnerRestaurants();
  }, [user]);

  useEffect(() => {
    fetchRestaurantData();
  }, [activeRestaurant]);

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateRestError('');
    try {
      const res = await api.post('/restaurants', {
        name: newRestName,
        address: newRestAddress,
        cuisine: newRestCuisine,
        opening_time: newRestOpen,
        closing_time: newRestClose,
        description: newRestDesc
      });
      const created = res.data;
      setRestaurants(prev => [...prev, created]);
      setActiveRestaurant(created);
      setShowCreateRest(false);
      
      // Reset forms
      setNewRestName('');
      setNewRestAddress('');
      setNewRestCuisine('');
      setNewRestDesc('');
    } catch (err: any) {
      setCreateRestError(err.response?.data?.detail || 'Failed to create restaurant profile.');
    }
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRestaurant) return;
    try {
      const res = await api.post('/tables', {
        table_number: newTableNum,
        capacity: newTableCap,
        type: newTableType
      }, { params: { restaurant_id: activeRestaurant.id } });
      
      setTables(prev => [...prev, res.data]);
      setNewTableNum('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTable = async (id: number) => {
    if (!window.confirm('Delete this table? This cannot be undone.')) return;
    try {
      await api.delete(`/tables/${id}`);
      setTables(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateBookingStatus = async (id: number, status: string) => {
    try {
      await api.put(`/bookings/${id}/status`, null, { params: { booking_status: status } });
      fetchRestaurantData();
    } catch (e) {
      console.error(e);
    }
  };

  // Chart rendering parameters
  const chartData = {
    labels: analytics?.monthly_labels || [],
    datasets: [
      {
        label: 'Monthly Earnings (Rs)',
        data: analytics?.monthly_earnings || [],
        backgroundColor: 'rgba(99, 102, 241, 0.65)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1.5,
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#94a3b8',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#94a3b8',
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-[#070a13] pt-28 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Restaurant Profile Selector / Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-extrabold text-white">Owner Hub</h1>
            <p className="text-sm text-gray-400 mt-1">Manage tables, waitlist reservations, and track restaurant analytics.</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {restaurants.length > 0 && !showCreateRest && (
              <select
                value={activeRestaurant?.id || ''}
                onChange={(e) => {
                  const selected = restaurants.find(r => r.id === Number(e.target.value));
                  if (selected) setActiveRestaurant(selected);
                }}
                className="bg-[#0d1322] border border-gray-800 rounded-xl text-white text-sm py-2.5 px-4 focus:outline-none focus:ring-1 focus:ring-brand-500 w-full md:w-48"
              >
                {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
            
            <button
              onClick={() => setShowCreateRest(!showCreateRest)}
              className="py-2.5 px-4 text-xs font-semibold text-white bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-700/50 flex-shrink-0 transition-colors"
            >
              {showCreateRest ? 'Manage Restaurant' : 'Create Restaurant'}
            </button>
          </div>
        </div>

        {/* Create Restaurant Wizard Form */}
        {showCreateRest ? (
          <div className="max-w-2xl mx-auto glass-card border border-gray-800 rounded-2xl p-6 md:p-8 shadow-xl">
            <h3 className="font-display font-bold text-xl text-white mb-2">Create Restaurant Profile</h3>
            <p className="text-xs text-gray-400 mb-6">Create a profile to start configuring tables and listing slots.</p>

            {createRestError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3.5 flex gap-2 items-center text-xs text-red-400 mb-4">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <span>{createRestError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRestaurant} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Restaurant Name</label>
                  <input
                    required
                    value={newRestName}
                    onChange={(e) => setNewRestName(e.target.value)}
                    type="text"
                    className="w-full bg-[#0d1322] border border-gray-800 rounded-xl text-white text-xs py-3 px-3.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="Grand Bistro"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Cuisine</label>
                  <input
                    required
                    value={newRestCuisine}
                    onChange={(e) => setNewRestCuisine(e.target.value)}
                    type="text"
                    className="w-full bg-[#0d1322] border border-gray-800 rounded-xl text-white text-xs py-3 px-3.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="Italian, Continental"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Address / Location</label>
                  <input
                    required
                    value={newRestAddress}
                    onChange={(e) => setNewRestAddress(e.target.value)}
                    type="text"
                    className="w-full bg-[#0d1322] border border-gray-800 rounded-xl text-white text-xs py-3 px-3.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="Connaught Place, Delhi"
                  />
                </div>

                <div className="col-span-1 space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Opening Time</label>
                  <input
                    required
                    value={newRestOpen}
                    onChange={(e) => setNewRestOpen(e.target.value)}
                    type="text"
                    className="w-full bg-[#0d1322] border border-gray-800 rounded-xl text-white text-center text-xs py-3 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="11:00"
                  />
                </div>

                <div className="col-span-1 space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Closing Time</label>
                  <input
                    required
                    value={newRestClose}
                    onChange={(e) => setNewRestClose(e.target.value)}
                    type="text"
                    className="w-full bg-[#0d1322] border border-gray-800 rounded-xl text-white text-center text-xs py-3 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="23:00"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Description</label>
                  <textarea
                    rows={3}
                    value={newRestDesc}
                    onChange={(e) => setNewRestDesc(e.target.value)}
                    className="w-full bg-[#0d1322] border border-gray-800 rounded-xl text-white text-xs py-3 px-3.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="Provide a brief summary about the restaurant's legacy, service standard, etc."
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 text-xs font-semibold text-white btn-primary rounded-xl transition-all mt-4"
              >
                Launch Restaurant Profile
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Dashboard Tabs bar */}
            <div className="flex border-b border-gray-850 mb-8 overflow-x-auto gap-4">
              {(['analytics', 'tables', 'bookings', 'waitlist'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 px-2 font-display text-sm font-semibold capitalize transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === tab
                      ? 'border-indigo-500 text-brand-300'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* TAB CONTENT: ANALYTICS */}
            {activeTab === 'analytics' && analytics && (
              <div className="space-y-8">
                {/* Analytic stats cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Revenue Card */}
                  <div className="glass-card rounded-2xl p-5 border border-gray-800 flex gap-4 items-center">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                      <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Total Revenue</span>
                      <p className="font-display font-bold text-lg text-white">Rs. {analytics.revenue.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Bookings Card */}
                  <div className="glass-card rounded-2xl p-5 border border-gray-800 flex gap-4 items-center">
                    <div className="p-3 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-xl">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Today's Bookings</span>
                      <p className="font-display font-bold text-lg text-white">{analytics.today_bookings}</p>
                    </div>
                  </div>

                  {/* Occupancy Card */}
                  <div className="glass-card rounded-2xl p-5 border border-gray-800 flex gap-4 items-center">
                    <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
                      <LayoutGrid className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Occupancy Rate</span>
                      <p className="font-display font-bold text-lg text-white">{analytics.occupancy_rate}%</p>
                    </div>
                  </div>

                  {/* Rating Card */}
                  <div className="glass-card rounded-2xl p-5 border border-gray-800 flex gap-4 items-center">
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl">
                      <Star className="w-6 h-6 fill-current" />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Average Rating</span>
                      <p className="font-display font-bold text-lg text-white">{analytics.average_rating.toFixed(1)} ★</p>
                    </div>
                  </div>
                </div>

                {/* Charts and stats */}
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Revenue Chart */}
                  <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-gray-800">
                    <h3 className="font-display font-bold text-base text-white mb-4">Earnings History</h3>
                    <div className="h-64 flex items-center justify-center">
                      <Bar data={chartData} options={chartOptions} />
                    </div>
                  </div>

                  {/* Popular time / Cancellation Rate Card */}
                  <div className="lg:col-span-1 glass-card rounded-2xl p-6 border border-gray-800 flex flex-col justify-between">
                    <div>
                      <h3 className="font-display font-bold text-base text-white mb-4">Service Insights</h3>
                      <div className="space-y-5">
                        <div className="flex justify-between items-center py-2.5 border-b border-gray-800/60">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4.5 h-4.5 text-gray-500" />
                            <span className="text-xs text-gray-300">Peak Dining Slot</span>
                          </div>
                          <span className="text-xs font-semibold text-white bg-slate-900 px-2 py-1 rounded border border-gray-850">{analytics.popular_time}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2.5 border-b border-gray-800/60">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="w-4.5 h-4.5 text-gray-500" />
                            <span className="text-xs text-gray-300">Cancellation Rate</span>
                          </div>
                          <span className="text-xs font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">{analytics.cancellation_rate}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-4 border-t border-gray-800/80 flex items-center gap-3 text-xs text-gray-500">
                      <Award className="w-6 h-6 text-brand-400 flex-shrink-0" />
                      <span>TabReserve dynamically optimizes table placement algorithms based on occupancy trends.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: TABLES */}
            {activeTab === 'tables' && (
              <div className="grid md:grid-cols-3 gap-8">
                {/* Table list */}
                <div className="md:col-span-2 glass-card rounded-2xl p-6 border border-gray-800">
                  <h3 className="font-display font-bold text-base text-white mb-4">Tables Directory</h3>
                  
                  {tables.length === 0 ? (
                    <p className="text-gray-500 text-xs italic py-6 text-center">No tables created yet. Add tables to enable bookings.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="text-gray-500 border-b border-gray-800">
                            <th className="pb-3 font-semibold">Table Number</th>
                            <th className="pb-3 font-semibold">Capacity</th>
                            <th className="pb-3 font-semibold">Location Type</th>
                            <th className="pb-3 font-semibold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                          {tables.map((table) => (
                            <tr key={table.id} className="text-gray-300 hover:text-white">
                              <td className="py-3.5 font-bold">T-{table.table_number}</td>
                              <td className="py-3.5 flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-gray-500" />
                                <span>{table.capacity} Seater</span>
                              </td>
                              <td className="py-3.5 capitalize">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                  table.type === 'vip' 
                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                                    : table.type === 'outdoor'
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    : 'bg-gray-800 text-gray-400 border-gray-700/50'
                                }`}>
                                  {table.type}
                                </span>
                              </td>
                              <td className="py-3.5 text-right">
                                <button
                                  onClick={() => handleDeleteTable(table.id)}
                                  className="text-red-400 hover:text-red-300 p-1.5 bg-red-500/10 border border-red-500/10 rounded-lg hover:border-red-500/30 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Add table Form */}
                <div className="md:col-span-1 glass-card rounded-2xl p-6 border border-gray-800/80 self-start">
                  <h3 className="font-display font-bold text-base text-white mb-4">Add Table</h3>
                  
                  <form onSubmit={handleAddTable} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Table Identifier</label>
                      <input
                        required
                        value={newTableNum}
                        onChange={(e) => setNewTableNum(e.target.value)}
                        type="text"
                        className="w-full bg-[#0d1322] border border-gray-800 rounded-xl text-white text-xs py-3 px-3.5 focus:outline-none"
                        placeholder="e.g. 101, 102A"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Seating Capacity</label>
                      <select
                        value={newTableCap}
                        onChange={(e) => setNewTableCap(Number(e.target.value))}
                        className="w-full bg-[#0d1322] border border-gray-800 rounded-xl text-white text-xs py-3 px-3 focus:outline-none"
                      >
                        {[2, 4, 6, 8, 10, 12].map(n => <option key={n} value={n}>{n} Guests</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Table Type</label>
                      <select
                        value={newTableType}
                        onChange={(e) => setNewTableType(e.target.value)}
                        className="w-full bg-[#0d1322] border border-gray-800 rounded-xl text-white text-xs py-3 px-3 focus:outline-none"
                      >
                        <option value="indoor">Indoor (Dining Room)</option>
                        <option value="outdoor">Outdoor (Terrace/Garden)</option>
                        <option value="vip">VIP (Private Lounge)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 text-xs font-semibold text-white btn-primary rounded-xl flex items-center justify-center gap-1 mt-4"
                    >
                      <Plus className="w-4.5 h-4.5" />
                      <span>Add Table</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* TAB CONTENT: BOOKINGS */}
            {activeTab === 'bookings' && (
              <div className="glass-card rounded-2xl p-6 border border-gray-800">
                <h3 className="font-display font-bold text-base text-white mb-4">Bookings Management</h3>

                {bookings.length === 0 ? (
                  <p className="text-gray-500 text-xs italic py-6 text-center">No bookings logged for this restaurant.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="text-gray-500 border-b border-gray-800">
                          <th className="pb-3 font-semibold">Date</th>
                          <th className="pb-3 font-semibold">Time</th>
                          <th className="pb-3 font-semibold">Guests</th>
                          <th className="pb-3 font-semibold">Table</th>
                          <th className="pb-3 font-semibold">Booking Status</th>
                          <th className="pb-3 font-semibold">Payment Status</th>
                          <th className="pb-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/50">
                        {bookings.map((booking) => (
                          <tr key={booking.id} className="text-gray-300 hover:text-white">
                            <td className="py-3.5 font-semibold">{booking.booking_date}</td>
                            <td className="py-3.5">{booking.booking_time.substring(0, 5)}</td>
                            <td className="py-3.5">{booking.guests} Pax</td>
                            <td className="py-3.5 font-mono">T-{booking.table_id || 'N/A'}</td>
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
                            <td className="py-3.5 capitalize">{booking.payment_status}</td>
                            <td className="py-3.5 text-right flex justify-end gap-1.5">
                              {booking.booking_status === 'confirmed' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
                                    className="p-1.5 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/10 rounded-lg hover:border-emerald-500/30 transition-all flex items-center gap-1 text-[10px] font-semibold"
                                    title="Mark Completed"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Complete
                                  </button>
                                  <button
                                    onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                                    className="p-1.5 text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/10 rounded-lg hover:border-red-500/30 transition-all flex items-center gap-1 text-[10px] font-semibold"
                                    title="Cancel Reservation"
                                  >
                                    <X className="w-3.5 h-3.5" /> Cancel
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: WAITLIST */}
            {activeTab === 'waitlist' && (
              <div className="glass-card rounded-2xl p-6 border border-gray-800">
                <h3 className="font-display font-bold text-base text-white mb-4">Waitlist Entries</h3>

                {waitlist.length === 0 ? (
                  <p className="text-gray-500 text-xs italic py-6 text-center">No active waitlisted customers.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="text-gray-500 border-b border-gray-800">
                          <th className="pb-3 font-semibold">Date</th>
                          <th className="pb-3 font-semibold">Time</th>
                          <th className="pb-3 font-semibold">Guests Count</th>
                          <th className="pb-3 font-semibold">Waitlist Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/50">
                        {waitlist.map((entry) => (
                          <tr key={entry.id} className="text-gray-300 hover:text-white">
                            <td className="py-3.5 font-semibold">{entry.date}</td>
                            <td className="py-3.5">{entry.time.substring(0, 5)}</td>
                            <td className="py-3.5">{entry.guests} Pax</td>
                            <td className="py-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                entry.status === 'notified'
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                  : 'bg-gray-800 text-gray-400'
                              }`}>
                                {entry.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OwnerDashboard;
