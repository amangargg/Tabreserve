export interface User {
  id: number;
  name: string;
  email: string;
  role: string; // 'customer', 'owner', 'admin'
  is_verified: boolean;
  created_at: string;
}

export interface Restaurant {
  id: number;
  owner_id: number;
  name: string;
  address: string;
  cuisine: string;
  opening_time: string; // "HH:MM:SS"
  closing_time: string; // "HH:MM:SS"
  rating: number;
  description: string | null;
  image_url: string | null;
  created_at: string;
}

export interface Table {
  id: number;
  restaurant_id: number;
  table_number: string;
  capacity: number;
  status: string; // 'available', 'occupied', 'reserved'
  type: string; // 'indoor', 'outdoor', 'VIP'
}

export interface Booking {
  id: number;
  user_id: number;
  restaurant_id: number;
  table_id: number | null;
  booking_date: string; // "YYYY-MM-DD"
  booking_time: string; // "HH:MM:SS"
  guests: number;
  payment_status: string; // 'pending', 'paid', 'partially_paid', 'refunded', 'failed'
  booking_status: string; // 'pending', 'confirmed', 'cancelled', 'completed'
  qr_code: string | null;
  created_at: string;
  restaurant?: Restaurant;
}

export interface Payment {
  id: number;
  booking_id: number;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  created_at: string;
}

export interface Review {
  id: number;
  booking_id: number;
  user_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  user_name?: string;
}

export interface Waitlist {
  id: number;
  user_id: number;
  restaurant_id: number;
  date: string;
  time: string;
  guests: number;
  status: string; // 'waiting', 'notified', 'booked', 'cancelled'
  created_at: string;
  restaurant?: Restaurant;
}

export interface Notification {
  id: number;
  user_id: number;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface OwnerAnalytics {
  today_bookings: number;
  revenue: number;
  occupancy_rate: number;
  popular_time: string;
  average_rating: number;
  monthly_earnings: number[];
  monthly_labels: string[];
  cancellation_rate: number;
}

export interface AdminStats {
  total_users: number;
  total_restaurants: number;
  total_bookings: number;
  total_payments: number;
  total_revenue: number;
  recent_bookings: Booking[];
}
