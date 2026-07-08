import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import type { Restaurant, Review } from '../types';
import { Star, MapPin, Clock, Calendar, Users, Info, ChevronRight, AlertCircle, MessageSquare } from 'lucide-react';

const RestaurantDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking details
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0] // tomorrow by default
  );
  const [guests, setGuests] = useState<number>(2);
  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  // Waitlist or booking messages
  const [actionError, setActionError] = useState('');
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState(0);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const restRes = await api.get(`/restaurants/${id}`);
      setRestaurant(restRes.data);
      
      const revRes = await api.get(`/reviews/restaurant/${id}`);
      setReviews(revRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async () => {
    if (!id || !selectedDate || !guests) return;
    setSlotsLoading(true);
    setSelectedTime(null);
    setActionError('');
    setWaitlistSuccess(false);
    
    try {
      const res = await api.get(`/restaurants/${id}/slots`, {
        params: { date_str: selectedDate, guests }
      });
      setSlots(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  useEffect(() => {
    fetchSlots();
  }, [id, selectedDate, guests]);

  const handleBooking = async () => {
    if (!user) {
      navigate(`/login?redirect=/restaurants/${id}`);
      return;
    }
    
    if (!selectedTime) {
      setActionError('Please select a time slot.');
      return;
    }

    try {
      setActionError('');
      // Create pending booking
      const res = await api.post('/bookings', {
        restaurant_id: Number(id),
        booking_date: selectedDate,
        booking_time: selectedTime,
        guests: guests
      });
      
      const booking = res.data;
      // Redirect to payment sum page
      navigate(`/booking-payment?booking_id=${booking.id}`);
    } catch (e: any) {
      const detail = e.response?.data?.detail || 'Booking creation failed.';
      setActionError(detail);
      
      // If fully booked, check if waitlist count is present to display
      if (detail.includes('fully booked')) {
        checkWaitlistStatus();
      }
    }
  };

  const checkWaitlistStatus = async () => {
    if (!selectedTime) return;
    try {
      const res = await api.post('/restaurants/check-availability', {
        restaurant_id: Number(id),
        booking_date: selectedDate,
        booking_time: selectedTime,
        guests: guests
      });
      setWaitlistCount(res.data.waitlist_count || 0);
    } catch (e) {}
  };

  const handleJoinWaitlist = async () => {
    if (!user) {
      navigate(`/login?redirect=/restaurants/${id}`);
      return;
    }
    if (!selectedTime) return;

    try {
      setActionError('');
      await api.post('/waitlist', {
        restaurant_id: Number(id),
        date: selectedDate,
        time: selectedTime,
        guests: guests
      });
      setWaitlistSuccess(true);
      fetchSlots(); // refresh
    } catch (e: any) {
      setActionError(e.response?.data?.detail || 'Failed to join waitlist.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070a13] flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-[#070a13] flex flex-col justify-center items-center text-white">
        <p className="text-gray-400">Restaurant not found.</p>
        <button onClick={() => navigate('/restaurants')} className="mt-4 text-brand-400">Back to Browse</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070a13] pb-20">
      
      {/* Restaurant Header Jumbotron */}
      <div className="h-96 w-full relative">
        {restaurant.image_url ? (
          <img
            src={restaurant.image_url.startsWith('http') ? restaurant.image_url : `http://localhost:8000${restaurant.image_url}`}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-slate-900 to-slate-950 flex items-center justify-center">
            <Star className="w-16 h-16 text-indigo-900 opacity-20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070a13] via-[#070a13]/60 to-transparent"></div>
        
        {/* Title overlay */}
        <div className="absolute bottom-6 left-0 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-bold tracking-widest text-brand-400 mb-1.5 block">{restaurant.cuisine}</span>
                <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white leading-tight">{restaurant.name}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-300">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span>{restaurant.address}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>Operating Hours: {restaurant.opening_time.substring(0, 5)} - {restaurant.closing_time.substring(0, 5)}</span>
                  </div>
                </div>
              </div>
              
              {/* Rating section */}
              <div className="flex items-center gap-2.5 bg-gray-900/80 border border-gray-800 p-3 rounded-2xl backdrop-blur-md self-start md:self-auto">
                <div className="flex items-center gap-1 text-yellow-400">
                  <Star className="w-5 h-5 fill-current" />
                  <span className="font-display font-bold text-lg text-white">{restaurant.rating.toFixed(1) || '0.0'}</span>
                </div>
                <span className="text-xs text-gray-400 border-l border-gray-800 pl-2.5">{reviews.length} reviews</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Column: Description & Reviews */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="glass-card rounded-2xl p-6 border border-gray-800/80">
              <h3 className="font-display font-bold text-lg text-white mb-3">About the Restaurant</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                {restaurant.description || `${restaurant.name} is a premier dining establishment located in ${restaurant.address}, specialized in premium ${restaurant.cuisine} culinary art. We offer a vibrant dining ambiance suitable for family gatherings, business meets, and romantic dates.`}
              </p>
            </div>

            {/* Reviews */}
            <div className="glass-card rounded-2xl p-6 border border-gray-800/80">
              <h3 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-brand-400" />
                <span>Customer Reviews</span>
              </h3>
              
              {reviews.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No reviews left yet. Be the first to dine and review!
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="bg-slate-900/40 border border-gray-800/60 rounded-xl p-4.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-brand-500/20 text-brand-300 rounded-full flex items-center justify-center text-xs font-semibold uppercase">
                            {rev.user_name?.substring(0, 2) || 'U'}
                          </div>
                          <span className="text-sm font-semibold text-white">{rev.user_name || 'Anonymous'}</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-yellow-400 bg-gray-900/60 py-1 px-2 rounded-lg border border-gray-800 text-[10px] font-bold">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{rev.rating}</span>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-gray-300 leading-relaxed">{rev.comment || 'Dined and left a rating.'}</p>
                      <span className="text-[9px] text-gray-500 mt-2.5 block">
                        {new Date(rev.created_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Dynamic Booking Form */}
          <div className="lg:col-span-1">
            <div className="glass-card rounded-2xl p-6 border border-gray-800/80 sticky top-28 shadow-xl">
              <h3 className="font-display font-bold text-lg text-white border-b border-gray-800 pb-3">Book a Table</h3>
              
              {/* Form elements */}
              <div className="mt-4 space-y-4">
                
                {/* Date select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                    <span>Select Date</span>
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-[#0d1322] border border-gray-800 rounded-xl text-white text-sm py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                {/* Guests select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-gray-500" />
                    <span>Number of Guests</span>
                  </label>
                  <select
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className="w-full bg-[#0d1322] border border-gray-800 rounded-xl text-white text-sm py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                    ))}
                  </select>
                </div>

                {/* Slots Grid */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Available Slots</span>
                  {slotsLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No operating hours defined for this date.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map((slot) => (
                        <button
                          key={slot.time}
                          disabled={!slot.available}
                          type="button"
                          onClick={() => { setSelectedTime(slot.time); checkWaitlistStatus(); }}
                          className={`py-2 px-2.5 rounded-lg border text-xs font-semibold transition-all text-center ${
                            selectedTime === slot.time
                              ? 'border-brand-500 bg-brand-500/20 text-brand-300'
                              : slot.available
                              ? 'border-gray-800 bg-[#0d1322] text-gray-300 hover:border-gray-700 hover:text-white'
                              : 'border-transparent bg-gray-900/10 text-gray-600 cursor-not-allowed opacity-30'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Errors or Success logs */}
                {actionError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400 flex gap-2 items-start mt-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p>{actionError}</p>
                      {actionError.includes('fully booked') && selectedTime && (
                        <button
                          onClick={handleJoinWaitlist}
                          type="button"
                          className="mt-2 text-xs font-semibold text-brand-400 hover:text-brand-300 block"
                        >
                          Join the Waitlist ({waitlistCount} waiting)
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {waitlistSuccess && (
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-xs text-purple-400 flex gap-2 items-start mt-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">Joined Waitlist!</p>
                      <p className="mt-1">We will notify you immediately via email/in-app notification if a table frees up for this slot.</p>
                    </div>
                  </div>
                )}

                {/* Main Action Button */}
                <button
                  type="button"
                  onClick={handleBooking}
                  disabled={!selectedTime || waitlistSuccess}
                  className="w-full mt-4 flex justify-center py-3 px-4 rounded-xl text-sm font-semibold text-white btn-primary disabled:opacity-40 disabled:cursor-not-allowed items-center gap-1.5"
                >
                  <span>Book Slot</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RestaurantDetails;
