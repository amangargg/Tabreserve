import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import type { Booking, Waitlist } from '../types';
import { User, Calendar, Clock, Star, QrCode, XCircle, ChevronRight, MessageSquare, Heart, CheckCircle2, ShieldAlert } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waitlists, setWaitlists] = useState<Waitlist[]>([]);
  const [loading, setLoading] = useState(true);

  // QR Code Modal State
  const [selectedBookingForQr, setSelectedBookingForQr] = useState<Booking | null>(null);

  // Review Modal State
  const [bookingForReview, setBookingForReview] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  const [successBanner, setSuccessBanner] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const bookRes = await api.get('/bookings');
      setBookings(bookRes.data);
      
      const waitRes = await api.get('/waitlist');
      setWaitlists(waitRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchDashboardData();

    if (searchParams.get('success') === 'true') {
      setSuccessBanner(true);
      setTimeout(() => setSuccessBanner(false), 5000);
    }
  }, [user, navigate]);

  const handleCancelBooking = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this booking? If you paid, a full refund will be processed.')) return;
    try {
      await api.put(`/bookings/${id}/cancel`);
      fetchDashboardData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelWaitlist = async (id: number) => {
    if (!window.confirm('Remove yourself from this waitlist?')) return;
    try {
      await api.delete(`/waitlist/${id}`);
      fetchDashboardData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenReview = (booking: Booking) => {
    setBookingForReview(booking);
    setRating(5);
    setComment('');
    setReviewError('');
    setReviewSuccess(false);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForReview) return;
    setReviewError('');
    setSubmittingReview(true);

    try {
      await api.post('/reviews', {
        booking_id: bookingForReview.id,
        rating,
        comment
      });
      setReviewSuccess(true);
      setTimeout(() => {
        setBookingForReview(null);
        fetchDashboardData();
      }, 1500);
    } catch (err: any) {
      setReviewError(err.response?.data?.detail || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'paid':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'cancelled':
      case 'failed':
      case 'refunded':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'completed':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      default:
        return 'bg-gray-800 text-gray-400 border border-gray-700/50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070a13] flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070a13] pt-28 pb-16 px-4 sm:px-6 lg:px-8">
      
      {/* Page Title & Banner */}
      <div className="max-w-7xl mx-auto">
        
        {successBanner && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4.5 flex gap-3 items-center text-sm text-emerald-400 animate-bounce">
            <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
            <div>
              <span className="font-bold block">Payment Confirmed!</span>
              <span>Your booking is now confirmed. The confirmation details and QR code have been sent to your email.</span>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-display font-extrabold text-white">Welcome back, {user?.name}!</h1>
            <p className="text-sm text-gray-400 mt-1">Manage your table reservations, waitlists, and reviews.</p>
          </div>
          
          <button
            onClick={() => navigate('/restaurants')}
            className="py-2.5 px-5 text-sm font-semibold text-white btn-primary rounded-xl transition-all flex items-center gap-1 group"
          >
            <span>Book New Table</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Dashboard Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Column: Bookings Lists */}
          <div className="lg:col-span-2 space-y-8">
            <div className="glass-card rounded-2xl p-6 border border-gray-800/80">
              <h3 className="font-display font-bold text-lg text-white mb-6 border-b border-gray-800 pb-3">My Reservations</h3>

              {bookings.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                  You haven't reserved any tables yet.
                </div>
              ) : (
                <div className="space-y-6">
                  {bookings.map((booking) => (
                    <div 
                      key={booking.id} 
                      className="bg-slate-900/30 border border-gray-800/60 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 hover:border-gray-700/50 transition-colors"
                    >
                      <div className="flex gap-4.5 items-start">
                        <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-brand-400 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                          <Calendar className="w-6 h-6" />
                        </div>
                        
                        <div className="space-y-1">
                          <h4 className="font-display font-bold text-base text-white">{booking.restaurant?.name || 'Restaurant'}</h4>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-400 mt-1.5">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-gray-500" />
                              <span>{booking.booking_date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-gray-500" />
                              <span>{booking.booking_time.substring(0, 5)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-gray-500" />
                              <span>{booking.guests} Guests</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusColor(booking.booking_status)}`}>
                              {booking.booking_status}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusColor(booking.payment_status)}`}>
                              Payment: {booking.payment_status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap md:flex-col items-stretch gap-2.5 w-full md:w-auto">
                        
                        {booking.payment_status === 'pending' && booking.booking_status !== 'cancelled' && (
                          <button
                            onClick={() => navigate(`/booking-payment?booking_id=${booking.id}`)}
                            className="py-2 px-4 rounded-xl bg-brand-500 text-xs font-semibold text-white hover:bg-brand-600 transition-colors text-center"
                          >
                            Complete Payment
                          </button>
                        )}

                        {booking.booking_status === 'confirmed' && (
                          <>
                            <button
                              onClick={() => setSelectedBookingForQr(booking)}
                              className="py-2 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-white border border-gray-700/50 flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <QrCode className="w-4 h-4 text-brand-400" />
                              <span>View QR Code</span>
                            </button>
                            
                            <button
                              onClick={() => handleCancelBooking(booking.id)}
                              className="py-2 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-400 flex items-center justify-center gap-1.5 transition-colors border border-red-500/20"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Cancel</span>
                            </button>
                          </>
                        )}

                        {booking.booking_status === 'completed' && (
                          <button
                            onClick={() => handleOpenReview(booking)}
                            className="py-2 px-4 rounded-xl bg-indigo-500/10 hover:bg-brand-600 hover:text-white border border-indigo-500/20 text-brand-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                          >
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span>Leave Review</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Waitlist & Profile Stats */}
          <div className="lg:col-span-1 space-y-8">
            {/* Waitlist list */}
            <div className="glass-card rounded-2xl p-6 border border-gray-800/80">
              <h3 className="font-display font-bold text-lg text-white mb-5 border-b border-gray-800 pb-3 flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-400" />
                <span>My Waitlists</span>
              </h3>

              {waitlists.length === 0 ? (
                <p className="text-gray-500 text-xs py-4 text-center">You are not on any waitlists.</p>
              ) : (
                <div className="space-y-4">
                  {waitlists.map((entry) => (
                    <div key={entry.id} className="bg-slate-900/40 border border-gray-800 rounded-xl p-4.5 space-y-3">
                      <div>
                        <h4 className="font-display font-semibold text-sm text-white">{entry.restaurant?.name || 'Restaurant'}</h4>
                        <div className="flex justify-between items-center mt-2.5 text-[11px] text-gray-400">
                          <span>Slot: {entry.date} at {entry.time.substring(0, 5)}</span>
                          <span>{entry.guests} Guests</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center border-t border-gray-800/50 pt-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          entry.status === 'notified'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : entry.status === 'waiting'
                            ? 'bg-gray-800 text-gray-400'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {entry.status}
                        </span>

                        {entry.status === 'notified' && (
                          <button
                            onClick={() => navigate(`/restaurants/${entry.restaurant_id}`)}
                            className="py-1 px-3 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-[10px] font-semibold transition-colors"
                          >
                            Book Now
                          </button>
                        )}
                        
                        {entry.status === 'waiting' && (
                          <button
                            onClick={() => handleCancelWaitlist(entry.id)}
                            className="text-[10px] text-red-400 hover:text-red-300 font-semibold"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* QR Code Viewer Modal */}
      {selectedBookingForQr && (
        <div className="fixed inset-0 z-50 bg-[#070a13]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-sm w-full glass-card border border-gray-800 rounded-2xl p-6 shadow-2xl relative animate-fade-in text-center">
            <button
              onClick={() => setSelectedBookingForQr(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <XCircle className="w-6 h-6" />
            </button>

            <h3 className="font-display font-extrabold text-lg text-white mb-2">Reservation Ticket</h3>
            <p className="text-xs text-brand-300 font-semibold mb-4">{selectedBookingForQr.restaurant?.name}</p>

            <div className="bg-white p-4.5 rounded-xl inline-block border border-gray-200 shadow-inner">
              <img
                src={`http://localhost:8000${selectedBookingForQr.qr_code}`}
                alt="Booking QR Code"
                className="w-48 h-48 mx-auto"
              />
            </div>
            
            <p className="mt-4 text-xs text-gray-400 leading-relaxed px-4">
              Present this code to the restaurant representative on arrival to check in.
            </p>

            <div className="mt-5 border-t border-gray-800 pt-4 text-xs text-gray-500">
              Booking ID: {selectedBookingForQr.id}
            </div>
          </div>
        </div>
      )}

      {/* Write Review Dialog Modal */}
      {bookingForReview && (
        <div className="fixed inset-0 z-50 bg-[#070a13]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-card border border-gray-800 rounded-2xl p-6 shadow-2xl relative animate-fade-in">
            <button
              onClick={() => setBookingForReview(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <h3 className="font-display font-extrabold text-lg text-white mb-1">Write a Review</h3>
            <p className="text-xs text-gray-400 mb-5">Share your dining experience at {bookingForReview.restaurant?.name}.</p>

            {reviewError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400 mb-4 flex gap-2 items-center">
                <ShieldAlert className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}

            {reviewSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs text-emerald-400 mb-4 flex gap-2 items-center">
                <CheckCircle2 className="w-4.5 h-4.5 flex-shrink-0 text-emerald-400" />
                <span>Review submitted! Recalculating ratings...</span>
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              
              {/* Star selector */}
              <div>
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRating(val)}
                      className="text-yellow-400 hover:scale-110 transition-transform"
                    >
                      <Star className={`w-8 h-8 ${val <= rating ? 'fill-current' : 'text-gray-700'}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Text comment */}
              <div>
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">Comment</label>
                <textarea
                  required
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us what you liked, how the service was, or any recommendations..."
                  className="block w-full px-3.5 py-3.5 bg-[#0d1322] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 text-xs transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview || reviewSuccess}
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white btn-primary flex justify-center items-center gap-1 disabled:opacity-40"
              >
                {submittingReview ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    <span>Submit Review</span>
                  </>
                )}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
