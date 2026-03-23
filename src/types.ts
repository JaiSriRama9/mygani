export interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
}

export interface Therapist {
  id: number;
  name: string;
}

export interface Room {
  id: number;
  name: string;
}

export interface Slot {
  id: number;
  start_time: string;
  end_time: string;
  is_peak: number;
  score?: number;
  explanation?: string;
}

export interface Booking {
  id: number;
  guest_id: number;
  guest_name: string;
  guest_mobile?: string;
  service_id: number;
  service_name: string;
  therapist_id: number;
  therapist_name: string;
  room_id: number;
  room_name: string;
  start_time: string;
  status: string;
  reallocated: number;
  offer_code?: string;
  final_price?: number;
  cancellation_reason?: string;
  refund_status?: "none" | "pending" | "refunded";
  payment_status?: "paid" | "pending" | "failed";
}

export interface WaitlistEntry {
  id: number;
  guest_id: number;
  guest_name: string;
  guest_mobile?: string;
  service_id: number;
  service_name: string;
  preferred_time: string;
  priority_score: number;
  explanation: string;
  status: string;
}

export interface Notification {
  id: number;
  guest_id: number;
  guest_name: string;
  message: string;
  type: string;
  created_at: string;
}

export interface DashboardStats {
  totalBookings: number;
  cancelledBookings: number;
  waitlisted: number;
  utilization: string;
  reallocatedCount: number;
  peakDemand: number;
  offPeakDemand: number;
}
