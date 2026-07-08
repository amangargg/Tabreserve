import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Restaurant } from '../types';
import { Search, MapPin, Star, Utensils, Clock, ChevronRight } from 'lucide-react';

const Browse: React.FC = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [minRating, setMinRating] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (selectedCity) params.city = selectedCity;
      if (selectedCuisine) params.cuisine = selectedCuisine;
      if (minRating) params.min_rating = minRating;

      const res = await api.get('/restaurants', { params });
      setRestaurants(res.data);
    } catch (e) {
      console.error("Failed to fetch restaurants", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [selectedCity, selectedCuisine, minRating]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRestaurants();
  };

  const cities = ['Delhi', 'Mumbai', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata'];
  const cuisines = ['Italian', 'North Indian', 'Chinese', 'Continental', 'South Indian', 'Mexican', 'Japanese'];

  return (
    <div className="min-h-screen bg-[#070a13] pb-16">
      {/* Hero Banner Section */}
      <div className="relative overflow-hidden pt-28 pb-20 px-4 sm:px-6 lg:px-8 border-b border-gray-900/60 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#070a13] to-[#070a13]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-30">
          <div className="absolute top-10 left-10 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-white tracking-tight leading-none">
            Secure the Best Seat at <br/>
            <span className="text-gradient">Your Favorite Restaurants</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-gray-400 max-w-2xl mx-auto">
            Book tables in real-time, skip waitlists, and complete payments securely with zero friction.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="mt-8 max-w-xl mx-auto">
            <div className="relative flex items-center bg-[#0d1322] border border-gray-800 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-brand-500/40 focus-within:border-brand-500 transition-all shadow-xl">
              <div className="pl-3.5 text-gray-500">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search restaurant name, cuisine or city..."
                className="w-full bg-transparent border-0 py-2.5 pl-3 pr-4 text-white text-sm focus:ring-0 focus:outline-none placeholder-gray-500"
              />
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-semibold text-white btn-primary rounded-xl transition-all"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Grid Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          
          {/* Filters Sidebar */}
          <div className="lg:col-span-1 space-y-6 mb-8 lg:mb-0">
            <div className="glass-card rounded-2xl p-5 border border-gray-800/80">
              <h3 className="font-display font-bold text-base text-white border-b border-gray-800 pb-3">Filters</h3>
              
              {/* City Filter */}
              <div className="mt-4 space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">City</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full bg-[#0d1322] border border-gray-800 rounded-xl text-white text-sm py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">All Cities</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Cuisine Filter */}
              <div className="mt-5 space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Cuisine</label>
                <select
                  value={selectedCuisine}
                  onChange={(e) => setSelectedCuisine(e.target.value)}
                  className="w-full bg-[#0d1322] border border-gray-800 rounded-xl text-white text-sm py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">All Cuisines</option>
                  {cuisines.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Rating Filter */}
              <div className="mt-5 space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Min Rating</label>
                <div className="flex gap-2">
                  {[3, 4, 4.5].map(r => (
                    <button
                      key={r}
                      onClick={() => setMinRating(minRating === r ? '' : r)}
                      className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                        minRating === r
                          ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                          : 'border-gray-800 bg-[#0d1322] text-gray-400 hover:text-white'
                      }`}
                    >
                      {r}+ ★
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Restaurant Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex justify-center items-center py-24">
                <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : restaurants.length === 0 ? (
              <div className="text-center py-20 glass-card rounded-2xl border border-gray-800">
                <p className="text-gray-400">No restaurants match your filters.</p>
                <button
                  onClick={() => { setSearch(''); setSelectedCity(''); setSelectedCuisine(''); setMinRating(''); }}
                  className="mt-4 text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {restaurants.map((restaurant) => (
                  <div
                    key={restaurant.id}
                    className="glass-card rounded-2xl overflow-hidden border border-gray-800/80 flex flex-col h-full"
                  >
                    {/* Cover image */}
                    <div className="h-44 w-full bg-slate-800 relative">
                      {restaurant.image_url ? (
                        <img
                          src={restaurant.image_url.startsWith('http') ? restaurant.image_url : `http://localhost:8000${restaurant.image_url}`}
                          alt={restaurant.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-indigo-950/20 text-indigo-400">
                          <Utensils className="w-8 h-8 opacity-40" />
                        </div>
                      )}
                      
                      {/* Rating tag */}
                      <div className="absolute top-3 right-3 bg-gray-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-gray-800 flex items-center gap-1 text-xs font-semibold text-yellow-400">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{restaurant.rating.toFixed(1) || '0.0'}</span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] uppercase font-bold tracking-widest text-brand-400 mb-1">{restaurant.cuisine}</div>
                        <h4 className="font-display font-bold text-lg text-white leading-snug">{restaurant.name}</h4>
                        
                        <div className="mt-3 space-y-2 text-xs text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-gray-500" />
                            <span className="truncate">{restaurant.address}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 flex-shrink-0 text-gray-500" />
                            <span>{restaurant.opening_time.substring(0, 5)} - {restaurant.closing_time.substring(0, 5)}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/restaurants/${restaurant.id}`)}
                        className="mt-6 w-full py-2.5 text-xs font-semibold text-white bg-gray-800 hover:bg-brand-600 rounded-xl transition-all border border-gray-700/50 hover:border-transparent flex items-center justify-center gap-1 group"
                      >
                        <span>Reserve Table</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Browse;
