import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import type { Booking } from '../types';
import { CreditCard, CheckCircle, XCircle, AlertCircle, ShoppingBag, ShieldCheck } from 'lucide-react';

const PaymentPortal: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get('booking_id');

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  
  // Simulated gateway state
  const [showSimulatedModal, setShowSimulatedModal] = useState(false);
  const [mockOrderId, setMockOrderId] = useState('');

  // Fixed advance booking deposit fee
  const depositAmount = 500.0;

  const fetchBooking = async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      const res = await api.get(`/bookings/${bookingId}`);
      setBooking(res.data);
      // Fetch details of restaurant
      const restRes = await api.get(`/restaurants/${res.data.restaurant_id}`);
      setBooking(prev => prev ? { ...prev, restaurant: restRes.data } : null);
    } catch (e) {
      console.error(e);
      setError('Failed to load booking details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  // Load Razorpay SDK Script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!booking) return;
    setError('');
    setPaying(true);

    try {
      // 1. Create Order
      const orderRes = await api.post('/payments/order', {
        booking_id: booking.id,
        amount: depositAmount
      });
      
      const paymentOrder = orderRes.data;
      const orderId = paymentOrder.razorpay_order_id;
      
      // Check if order ID is a mock order
      if (orderId.startsWith('order_mock_')) {
        setMockOrderId(orderId);
        setShowSimulatedModal(true);
        setPaying(false);
        return;
      }

      // 2. Load SDK
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setError('Failed to load Razorpay payment SDK. Check connection.');
        setPaying(false);
        return;
      }

      // 3. Configure Checkout Options
      const options = {
        key: orderRes.data.key_id || 'rzp_test_mockkeyid12345', // key is fetched from backend or uses fallback
        amount: depositAmount * 100, // paise
        currency: 'INR',
        name: 'TabReserve',
        description: `Advance Deposit for ${booking.restaurant?.name || 'Restaurant'}`,
        order_id: orderId,
        handler: async function (response: any) {
          // Signature Verification
          try {
            setPaying(true);
            await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            // Redirect on success
            navigate('/dashboard?success=true');
          } catch (verifyError: any) {
            setError(verifyError.response?.data?.detail || 'Signature verification failed.');
            setPaying(false);
          }
        },
        prefill: {
          name: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).name : '',
          email: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).email : ''
        },
        theme: {
          color: '#6366f1'
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setError(resp.error.description || 'Payment transaction failed.');
        setPaying(false);
      });
      rzp.open();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to initialize payment.');
      setPaying(false);
    }
  };

  // Mock signature verification simulation
  const handleSimulatePayment = async (success: boolean) => {
    setShowSimulatedModal(false);
    if (!success) {
      setError('Payment simulated failure.');
      return;
    }

    setPaying(true);
    try {
      const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 16)}`;
      const mockSignature = `mock_sig_${Math.random().toString(36).substring(2, 20)}`;
      
      await api.post('/payments/verify', {
        razorpay_order_id: mockOrderId,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: mockSignature
      });

      // Redirect
      navigate('/dashboard?success=true');
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Signature verification failed.');
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070a13] flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-[#070a13] flex flex-col justify-center items-center text-white p-4">
        <p className="text-gray-400">{error}</p>
        <button onClick={() => navigate('/restaurants')} className="mt-4 text-brand-400">Back to Browse</button>
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="min-h-screen bg-[#070a13] py-28 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-2xl w-full grid md:grid-cols-5 gap-6">
        
        {/* Invoice Summary */}
        <div className="md:col-span-3 glass-card rounded-2xl p-6 border border-gray-800 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2 border-b border-gray-800 pb-3">
              <ShoppingBag className="w-5 h-5 text-brand-400" />
              <span>Booking Summary</span>
            </h3>

            <div className="space-y-4 text-sm text-gray-300">
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Restaurant</span>
                <p className="font-semibold text-white text-base">{booking.restaurant?.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Date</span>
                  <p className="font-medium text-white">{booking.booking_date}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Time</span>
                  <p className="font-medium text-white">{booking.booking_time.substring(0, 5)}</p>
                </div>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Guests Count</span>
                <p className="font-medium text-white">{booking.guests} {booking.guests === 1 ? 'Guest' : 'Guests'}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-800/80">
            <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
              <span>Advance Booking Fee</span>
              <span>Rs. {depositAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold text-white border-t border-gray-800/50 pt-2">
              <span>Total Payable</span>
              <span className="text-lg text-gradient">Rs. {depositAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Checkout Card */}
        <div className="md:col-span-2 glass-card rounded-2xl p-6 border border-gray-800 flex flex-col justify-between items-center text-center">
          <div className="py-6 flex flex-col items-center">
            <div className="p-4 bg-indigo-500/10 rounded-full border border-indigo-500/20 text-brand-400 animate-pulse">
              <CreditCard className="w-10 h-10" />
            </div>
            <h4 className="mt-4 font-display font-bold text-base text-white">Payment Secure</h4>
            <p className="mt-2 text-xs text-gray-400 leading-relaxed px-2">
              All transactions are secured by end-to-end payment integrations.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 text-[11px] text-red-400 flex gap-2 items-center text-left w-full my-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handlePayment}
            disabled={paying}
            className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white btn-primary flex items-center justify-center gap-1.5 focus:outline-none"
          >
            {paying ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <ShieldCheck className="w-4.5 h-4.5" />
                <span>Pay Reservation</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Beautiful Simulated Payment Gateway Modal */}
      {showSimulatedModal && (
        <div className="fixed inset-0 z-50 bg-[#070a13]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-card border border-brand-500/30 rounded-2xl p-6 shadow-2xl relative animate-fade-in">
            <div className="text-center">
              <div className="inline-flex p-3 bg-brand-500/10 rounded-full border border-brand-500/30 text-brand-400">
                <CreditCard className="w-7 h-7" />
              </div>
              <h3 className="mt-3 font-display font-extrabold text-lg text-white">TabReserve Payment Terminal</h3>
              <p className="mt-1 text-xs text-gray-400">Order ID: {mockOrderId}</p>
            </div>

            {/* Simulation Card Layout */}
            <div className="mt-5 bg-[#0a0e19] border border-gray-800 rounded-xl p-4.5 space-y-3.5 text-left">
              <div className="flex justify-between items-center text-xs text-gray-400 border-b border-gray-800 pb-2">
                <span>Merchant</span>
                <span className="font-semibold text-white">TabReserve Admin</span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>Amount</span>
                <span className="font-bold text-brand-300">Rs. {depositAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3.5">
              <button
                onClick={() => handleSimulatePayment(false)}
                className="py-3 px-4 rounded-xl border border-red-500/20 bg-red-500/10 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center gap-1"
              >
                <XCircle className="w-4 h-4" />
                <span>Simulate Fail</span>
              </button>
              
              <button
                onClick={() => handleSimulatePayment(true)}
                className="py-3 px-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-1"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Simulate Pay</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentPortal;
