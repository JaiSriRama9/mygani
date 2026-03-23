import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Users, 
  Clock, 
  Bell, 
  LayoutDashboard, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  Award,
  Zap,
  RefreshCw,
  Phone,
  Ticket,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  Star,
  Play,
  MessageSquare,
  Smartphone,
  X,
  Plus,
  Search,
  QrCode,
  CreditCard
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, addDays, startOfToday, parse, addMinutes } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { 
  Service, 
  Therapist, 
  Room, 
  Slot, 
  Booking, 
  WaitlistEntry, 
  Notification, 
  DashboardStats 
} from "./types";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "bookings" | "waitlist" | "notifications" | "availability">("dashboard");
  const [services, setServices] = useState<Service[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recommendations, setRecommendations] = useState<Slot[]>([]);
  const [availabilityDate, setAvailabilityDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [availabilityData, setAvailabilityData] = useState<{ slots: Slot[], bookings: any[] }>({ slots: [], bookings: [] });
  const [viewBy, setViewBy] = useState<"therapist" | "room">("therapist");
  const [peakFilter, setPeakFilter] = useState<"all" | "peak" | "off-peak">("all");
  const [durationFilter, setDurationFilter] = useState<string>("all");
  const [showAllBookings, setShowAllBookings] = useState(true);
  const [bookingSearch, setBookingSearch] = useState("");
  
  const [user, setUser] = useState<{ name: string, email: string, mobile: string, age: string } | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup" | "otp">("login");
  const [otpSent, setOtpSent] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(0);
  
  const [bookingForm, setBookingForm] = useState({
    guestName: "",
    mobileNumber: "",
    serviceId: "",
    startTime: "",
    therapistId: "",
    roomId: "",
    isVip: false,
    offerCode: "",
    paymentStatus: "pending"
  });

  const [appliedOffer, setAppliedOffer] = useState<{ code: string, discount: number } | null>(null);

  const [editingBookingId, setEditingBookingId] = useState<number | null>(null);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"counter" | "qr" | "card">("counter");
  const [lastBookingData, setLastBookingData] = useState<any>(null);

  const OFFERS: Record<string, number> = {
    "SPA10": 0.1,
    "WELCOME20": 0.2,
    "AI_SPECIAL": 0.15
  };

  const handleApplyOffer = () => {
    const code = bookingForm.offerCode.toUpperCase();
    if (OFFERS[code]) {
      setAppliedOffer({ code, discount: OFFERS[code] });
      setMessage({ type: "success", text: `Offer ${code} applied! ${OFFERS[code] * 100}% discount.` });
    } else {
      setAppliedOffer(null);
      setMessage({ type: "error", text: "Invalid offer code." });
    }
  };

  const calculatePrice = () => {
    const service = services.find(s => s.id.toString() === bookingForm.serviceId);
    if (!service) return 0;
    let price = service.price;
    if (appliedOffer) {
      price = price * (1 - appliedOffer.discount);
    }
    return price;
  };

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string, alternatives?: Slot[] } | null>(null);

  const fetchData = async () => {
    try {
      const [srv, bks, wtl, ntf, dsh, thr, rms] = await Promise.all([
        fetch("/api/services").then(res => res.json()),
        fetch("/api/bookings").then(res => res.json()),
        fetch("/api/waitlist").then(res => res.json()),
        fetch("/api/notifications").then(res => res.json()),
        fetch(`/api/dashboard?date=${availabilityDate}`).then(res => res.json()),
        fetch("/api/therapists").then(res => res.json()),
        fetch("/api/rooms").then(res => res.json())
      ]);
      setServices(srv);
      setBookings(bks);
      setWaitlist(wtl);
      setNotifications(ntf);
      setStats(dsh);
      setTherapists(thr);
      setRooms(rms);
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  const fetchAvailability = async () => {
    try {
      const res = await fetch(`/api/availability?date=${availabilityDate}`);
      const data = await res.json();
      setAvailabilityData(data);
    } catch (err) {
      console.error("Failed to fetch availability", err);
    }
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    fetchData();
  }, [availabilityDate]);

  useEffect(() => {
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [availabilityDate]);

  useEffect(() => {
    if (activeTab === "availability") {
      fetchAvailability();
    }
  }, [activeTab, availabilityDate]);

  const handleGenerateSlots = async () => {
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");
    await fetch("/api/slots/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today })
    });
    const recs = await fetch(`/api/recommendations?date=${today}`).then(res => res.json());
    setRecommendations(recs);
    setLoading(false);
    setMessage({ type: "success", text: "Daily slots generated and optimized!" });
  };

  const performBooking = async (formData: typeof bookingForm, id: number | null = null) => {
    setLoading(true);
    try {
      const url = id ? `/api/bookings/${id}` : "/api/bookings";
      const method = id ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setLastBookingData({
          ...formData,
          id: data.bookingId || id,
          serviceName: services.find(s => s.id.toString() === formData.serviceId)?.name,
          price: calculatePrice()
        });
        setShowPaymentModal(true);
        setBookingForm({ guestName: "", mobileNumber: "", serviceId: "", startTime: "", therapistId: "", roomId: "", isVip: false, offerCode: "", paymentStatus: "pending" });
        setAppliedOffer(null);
        setEditingBookingId(null);
        fetchData();
      } else {
        setMessage({ 
          type: "error", 
          text: data.message, 
          alternatives: data.alternatives 
        });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Booking failed. Try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (bookingForm.guestName.trim().length < 2) {
      setMessage({ type: "error", text: "Guest name must be at least 2 characters." });
      return;
    }
    if (bookingForm.mobileNumber.length < 10) {
      setMessage({ type: "error", text: "Please enter a valid 10-digit mobile number." });
      return;
    }

    // Working hours validation
    if (!bookingForm.startTime) {
      setMessage({ type: "error", text: "Please select a time slot." });
      return;
    }
    const bookingTime = parse(bookingForm.startTime, "yyyy-MM-dd HH:mm", new Date());
    const hour = bookingTime.getHours();
    if (hour < 9 || hour >= 19) {
      setMessage({ 
        type: "error", 
        text: "Spa is only open from 9:00 AM to 7:00 PM."
      });
      return;
    }

    await performBooking(bookingForm, editingBookingId);
  };

  const handleWaitlist = async () => {
    if (!bookingForm.guestName || !bookingForm.serviceId || !bookingForm.startTime) {
      setMessage({ type: "error", text: "Please fill in guest name, service, and preferred time." });
      return;
    }
    
    // Validation
    if (bookingForm.guestName.trim().length < 2) {
      setMessage({ type: "error", text: "Guest name must be at least 2 characters." });
      return;
    }
    if (bookingForm.mobileNumber.length < 10) {
      setMessage({ type: "error", text: "Please enter a valid 10-digit mobile number." });
      return;
    }

    // Working hours validation
    const bookingTime = parse(bookingForm.startTime, "yyyy-MM-dd HH:mm", new Date());
    const hour = bookingTime.getHours();
    if (hour < 9 || hour >= 19) {
      setMessage({ 
        type: "error", 
        text: "Spa is only open from 9:00 AM to 7:00 PM."
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: bookingForm.guestName,
          mobileNumber: bookingForm.mobileNumber,
          serviceId: bookingForm.serviceId,
          preferredTime: bookingForm.startTime,
          isVip: bookingForm.isVip
        })
      });
      const data = await res.json();
      setMessage({ type: "success", text: `Added to waitlist! Priority Score: ${data.score}` });
      setBookingForm({ guestName: "", mobileNumber: "", serviceId: "", startTime: "", therapistId: "", roomId: "", isVip: false, offerCode: "", paymentStatus: "pending" });
      setAppliedOffer(null);
      fetchData();
    } catch (err) {
      setMessage({ type: "error", text: "Failed to join waitlist." });
    }
    setLoading(false);
  };

  const cancelBooking = (booking: Booking) => {
    setCancellingBooking(booking);
    setCancellationReason("");
    setShowCancelModal(true);
  };

  const handleModify = (booking: Booking) => {
    setBookingForm({
      guestName: booking.guest_name,
      mobileNumber: booking.guest_mobile || "",
      serviceId: booking.service_id.toString(),
      startTime: booking.start_time,
      therapistId: booking.therapist_id.toString(),
      roomId: booking.room_id.toString(),
      isVip: false, // Assuming default
      offerCode: booking.offer_code || "",
      paymentStatus: booking.payment_status || "pending"
    });
    if (booking.offer_code && OFFERS[booking.offer_code.toUpperCase()]) {
      setAppliedOffer({ code: booking.offer_code.toUpperCase(), discount: OFFERS[booking.offer_code.toUpperCase()] });
    } else {
      setAppliedOffer(null);
    }
    setEditingBookingId(booking.id);
    setShowCancelModal(false);
    setActiveTab("dashboard");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmCancellation = async () => {
    if (!cancellingBooking) return;
    
    setLoading(true);
    try {
      // Calculate refund eligibility (e.g., 24h notice)
      const bookingTime = new Date(cancellingBooking.start_time).getTime();
      const now = new Date().getTime();
      const hoursDiff = (bookingTime - now) / (1000 * 60 * 60);
      const refundStatus = hoursDiff >= 24 ? "refunded" : "none";

      await fetch(`/api/bookings/${cancellingBooking.id}/cancel`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          reason: cancellationReason,
          refundStatus
        })
      });
      
      fetchData();
      setShowCancelModal(false);
      setCancellingBooking(null);
      setMessage({ 
        type: "success", 
        text: refundStatus === "refunded" 
          ? "Booking cancelled successfully. Full refund processed." 
          : "Booking cancelled. No refund issued (less than 24h notice)." 
      });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to cancel booking." });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Sidebar */}
      <nav className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-6 z-50">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
            <Zap size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">SmartSpa AI</h1>
        </div>

        <div className="space-y-2">
          {[
            { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
            { id: "availability", label: "Availability", icon: Clock },
            { id: "bookings", label: "Bookings", icon: Calendar },
            { id: "waitlist", label: "Waitlist", icon: Users },
            { id: "notifications", label: "Notifications", icon: Bell },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                activeTab === tab.id 
                  ? "bg-emerald-50 text-emerald-700 font-medium" 
                  : "text-gray-500 hover:bg-gray-50"
              )}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <button 
            onClick={handleGenerateSlots}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            AI Slots
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="ml-64 p-10">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight capitalize">{activeTab}</h2>
            <p className="text-gray-500 mt-1">Intelligent Spa Operations Management</p>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            {user ? (
              <div className="flex items-center gap-4 pl-4 border-l border-gray-100">
                <div className="flex flex-col items-end">
                  <p className="text-base font-bold text-gray-900 leading-tight">{user.name}</p>
                  <p className="text-xs font-medium text-gray-500">{user.mobile}</p>
                  <p className="text-xs text-gray-400">{user.age} yrs</p>
                  <p className="text-[10px] text-gray-400">{user.email}</p>
                </div>
                <button 
                  onClick={() => setUser(null)}
                  className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-all"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => { setShowAuth(true); setAuthMode("login"); }}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
              >
                <User size={18} />
                <span>Login / Sign Up</span>
              </button>
            )}
          </div>
        </header>

        <AnimatePresence>
          {showAuth && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl relative"
              >
                <button 
                  onClick={() => setShowAuth(false)}
                  className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    {authMode === "otp" ? <Smartphone size={32} /> : <User size={32} />}
                  </div>
                  <h2 className="text-2xl font-bold">
                    {authMode === "login" ? "Welcome Back" : authMode === "signup" ? "Create Account" : "Verify Mobile"}
                  </h2>
                  <p className="text-gray-500 text-sm mt-2">
                    {authMode === "login" ? "Login to manage your spa bookings" : authMode === "signup" ? "Join SmartSpa AI today" : "Enter the 4-digit code sent to your phone"}
                  </p>
                </div>

                <form className="space-y-4" onSubmit={(e) => {
                  e.preventDefault();
                  if (authMode === "otp") {
                    setUser({ name: "John Doe", email: "john@example.com", mobile: "1234567890", age: "28" });
                    setShowAuth(false);
                  } else if (authMode === "login" || authMode === "signup") {
                    setAuthMode("otp");
                    setOtpSent(true);
                  }
                }}>
                  {authMode === "signup" && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Full Name</label>
                        <input type="text" required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="John Doe" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Age</label>
                        <input type="number" required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="25" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Email Address</label>
                        <input type="email" required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="john@example.com" />
                      </div>
                    </>
                  )}

                  {(authMode === "login" || authMode === "signup") && (
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Mobile Number</label>
                      <input type="tel" required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="1234567890" />
                    </div>
                  )}

                  {authMode === "otp" && (
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Verification Code</label>
                      <div className="flex gap-3 justify-center">
                        {[1, 2, 3, 4].map(i => (
                          <input key={i} type="text" maxLength={1} className="w-12 h-14 text-center text-2xl font-bold rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                        ))}
                      </div>
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 mt-4"
                  >
                    {authMode === "otp" ? "Verify & Continue" : "Send OTP"}
                  </button>
                </form>

                <div className="mt-8 text-center border-t border-gray-100 pt-6">
                  <p className="text-sm text-gray-500">
                    {authMode === "login" ? "Don't have an account?" : "Already have an account?"}
                    <button 
                      onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
                      className="ml-2 text-emerald-600 font-bold hover:underline"
                    >
                      {authMode === "login" ? "Sign Up" : "Login"}
                    </button>
                  </p>
                </div>
              </motion.div>
            </div>
          )}

          {showCancelModal && cancellingBooking && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl relative"
              >
                <button 
                  onClick={() => setShowCancelModal(false)}
                  className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <XCircle size={32} />
                  </div>
                  <h2 className="text-2xl font-bold">Cancel Booking</h2>
                  <p className="text-gray-500 text-sm mt-2">
                    Are you sure you want to cancel your booking for <strong>{cancellingBooking.service_name}</strong>?
                  </p>
                  <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-left">
                    <p className="text-xs font-bold text-emerald-700 uppercase mb-1">💡 Smart Advice</p>
                    <p className="text-xs text-emerald-600 leading-relaxed">
                      Instead of cancelling, you can <strong>modify your booking</strong> to a different time or therapist. This preserves your spot and avoids cancellation fees!
                    </p>
                    <button 
                      onClick={() => handleModify(cancellingBooking)}
                      className="mt-3 w-full py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all"
                    >
                      Modify Instead
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Reason for Cancellation</label>
                    <textarea 
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      placeholder="e.g. Personal emergency, changed plans..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none h-24 resize-none"
                    />
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Refund Policy</p>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        (new Date(cancellingBooking.start_time).getTime() - new Date().getTime()) / (1000 * 60 * 60) >= 24 
                          ? "bg-emerald-500" : "bg-amber-500"
                      )}></div>
                      <p className="text-sm font-medium">
                        {(new Date(cancellingBooking.start_time).getTime() - new Date().getTime()) / (1000 * 60 * 60) >= 24 
                          ? "Eligible for full refund (24h+ notice)" 
                          : "No refund (Less than 24h notice)"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={() => setShowCancelModal(false)}
                      className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
                    >
                      Keep Booking
                    </button>
                    <button 
                      onClick={confirmCancellation}
                      disabled={loading}
                      className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50"
                    >
                      Confirm Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl p-4 rounded-2xl shadow-2xl border backdrop-blur-md flex flex-col gap-4",
                (message.type === "success" || (message.alternatives && message.alternatives.length > 0)) ? "bg-emerald-50/90 text-emerald-700 border-emerald-100" : "bg-red-50/90 text-red-700 border-red-100"
              )}
            >
              <div className="flex items-center gap-3">
                {(message.type === "success" || (message.alternatives && message.alternatives.length > 0)) ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                <span className="font-bold">{message.text}</span>
                {(message.text.includes("Slot unavailable") || message.text.includes("This slot is currently booked")) && (
                  <button 
                    onClick={() => {
                      handleWaitlist();
                      setMessage(null);
                    }}
                    className="ml-4 px-4 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-bold hover:bg-amber-200 transition-colors"
                  >
                    Join Waitlist
                  </button>
                )}
                {message.text.includes("9:00 AM to 7:00 PM") && (
                  <button 
                    onClick={() => {
                      setActiveTab("availability");
                      setMessage(null);
                    }}
                    className="ml-4 px-4 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-bold hover:bg-red-200 transition-colors"
                  >
                    View Booking Available Time
                  </button>
                )}
                <button className="ml-auto text-sm font-bold opacity-50 hover:opacity-100" onClick={() => setMessage(null)}>Dismiss</button>
              </div>

              {message.alternatives && message.alternatives.length > 0 && (
                <div className="mt-2 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-70">AI Suggestions</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {message.alternatives.map((alt, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          const updatedForm = { ...bookingForm, startTime: alt.start_time };
                          setBookingForm(updatedForm);
                          setMessage(null);
                          performBooking(updatedForm, editingBookingId);
                        }}
                        className="bg-white/50 hover:bg-white p-4 rounded-2xl border border-emerald-200/50 text-left transition-all group"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-sm">{format(parse(alt.start_time, "yyyy-MM-dd HH:mm", new Date()), "HH:mm")}</span>
                          <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">{alt.score}</span>
                        </div>
                        <p className="text-[10px] italic opacity-70 line-clamp-1">{alt.explanation}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* Upcoming Bookings - Now at the Top */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Clock className="text-emerald-600" /> Upcoming Bookings
                </h3>
                <button 
                  onClick={() => setActiveTab("bookings")}
                  className="text-sm font-bold text-emerald-600 hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bookings
                  .filter(b => b.status === "confirmed" && new Date(b.start_time) >= new Date())
                  .slice(0, 3)
                  .map(booking => (
                  <div key={booking.id} className="p-4 rounded-2xl border border-gray-50 bg-gray-50/50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-gray-900">{booking.guest_name}</p>
                        <p className="text-xs text-gray-400">{booking.service_name}</p>
                        <p className="text-[10px] text-emerald-600 font-medium mt-1">
                          {format(parse(booking.start_time, "yyyy-MM-dd HH:mm", new Date()), "MMM dd, yyyy")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase">
                          {format(parse(booking.start_time, "yyyy-MM-dd HH:mm", new Date()), "HH:mm")}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter",
                          booking.payment_status === "paid" ? "bg-emerald-500 text-white" : "bg-amber-400 text-white"
                        )}>
                          {booking.payment_status || 'pending'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Users size={14} />
                        <span>{booking.therapist_name}</span>
                      </div>
                      <button 
                        onClick={() => {
                          setBookingSearch(booking.guest_name);
                          setShowAllBookings(true);
                          setActiveTab("bookings");
                        }}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 underline uppercase tracking-wider"
                      >
                        View Payment
                      </button>
                    </div>
                  </div>
                ))}
                {bookings.filter(b => b.status === "confirmed" && new Date(b.start_time) >= new Date()).length === 0 && (
                  <div className="col-span-full py-8 text-center text-gray-400 italic">
                    No upcoming bookings for today.
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm gap-4">
              <div className="flex items-center gap-4">
                <h3 className="font-bold">Dashboard Date:</h3>
                <input
                  type="date"
                  value={availabilityDate}
                  onChange={(e) => setAvailabilityDate(e.target.value)}
                  className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="text-sm text-gray-400 font-medium">
                Viewing data for {format(parse(availabilityDate, "yyyy-MM-dd", new Date()), "MMMM dd, yyyy")}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: "Total Bookings", value: stats?.totalBookings || 0, icon: Calendar, color: "bg-blue-500" },
                { label: "Utilization", value: `${stats?.utilization || 0}%`, icon: TrendingUp, color: "bg-emerald-500" },
                { label: "Revenue", value: `$${stats?.revenue || 0}`, icon: Zap, color: "bg-amber-500" },
                { label: "Waitlist", value: waitlist.length, icon: Users, color: "bg-violet-500" },
              ].map((stat) => (
                <motion.div 
                  key={stat.label}
                  whileHover={{ y: -4 }}
                  className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn("p-3 rounded-2xl text-white", stat.color)}>
                      <stat.icon size={20} />
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
                  <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Booking Form */}
              <div className="col-span-1 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    {editingBookingId ? <RefreshCw className="text-amber-600" /> : <PlusCircle className="text-emerald-600" />}
                    {editingBookingId ? "Modify Booking" : "New Booking"}
                  </h3>
                  {editingBookingId && (
                    <button 
                      onClick={() => {
                        setEditingBookingId(null);
                        setBookingForm({ guestName: "", mobileNumber: "", serviceId: "", startTime: "", therapistId: "", roomId: "", isVip: false, offerCode: "", paymentStatus: "pending" });
                        setAppliedOffer(null);
                      }}
                      className="text-xs font-bold text-gray-400 hover:text-gray-600"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
                <form onSubmit={handleBooking} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name</label>
                      <input
                        type="text"
                        required
                        maxLength={50}
                        value={bookingForm.guestName}
                        onChange={e => {
                          const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                          setBookingForm({...bookingForm, guestName: val});
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="e.g. Alice Johnson"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-3.5 text-gray-400" size={18} />
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          value={bookingForm.mobileNumber}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setBookingForm({...bookingForm, mobileNumber: val});
                          }}
                          className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                          placeholder="1234567890"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                    <select
                      required
                      value={bookingForm.serviceId}
                      onChange={e => setBookingForm({...bookingForm, serviceId: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="">Select Service</option>
                      {services
                        .filter(s => durationFilter === "all" || s.duration.toString() === durationFilter)
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.duration}m) - ${s.price}</option>
                        ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={bookingForm.startTime.replace(" ", "T")}
                        onChange={e => setBookingForm({...bookingForm, startTime: e.target.value.replace("T", " ")})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Offer Code</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Ticket className="absolute left-4 top-3.5 text-gray-400" size={18} />
                          <input
                            type="text"
                            value={bookingForm.offerCode}
                            onChange={e => setBookingForm({...bookingForm, offerCode: e.target.value})}
                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none uppercase"
                            placeholder="SPA10"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleApplyOffer}
                          className="px-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {bookingForm.serviceId && (
                    <div className={cn(
                      "p-4 rounded-2xl border transition-all",
                      editingBookingId ? "bg-amber-50 border-amber-100" : "bg-emerald-50 border-emerald-100"
                    )}>
                      <div className="flex justify-between items-center">
                        <span className={cn(
                          "text-sm font-medium",
                          editingBookingId ? "text-amber-800" : "text-emerald-800"
                        )}>
                          {editingBookingId ? "Updated Price" : "Total Price"}
                        </span>
                        <div className="text-right">
                          {appliedOffer && (
                            <p className={cn(
                              "text-xs line-through",
                              editingBookingId ? "text-amber-600" : "text-emerald-600"
                            )}>
                              ${services.find(s => s.id.toString() === bookingForm.serviceId)?.price}
                            </p>
                          )}
                          <p className={cn(
                            "text-xl font-bold",
                            editingBookingId ? "text-amber-900" : "text-emerald-900"
                          )}>
                            ${calculatePrice().toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 py-2">
                    <input
                      type="checkbox"
                      id="vip"
                      checked={bookingForm.isVip}
                      onChange={e => setBookingForm({...bookingForm, isVip: e.target.checked})}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <label htmlFor="vip" className="text-sm font-medium text-gray-700">VIP Guest</label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      Book Now
                    </button>
                    <button
                      type="button"
                      onClick={handleWaitlist}
                      disabled={loading || !bookingForm.guestName || !bookingForm.serviceId}
                      className="bg-amber-100 text-amber-700 py-3 rounded-xl font-bold hover:bg-amber-200 transition-colors disabled:opacity-50"
                    >
                      Join Waitlist
                    </button>
                  </div>
                </form>
              </div>

              {/* AI Recommendations & Experience Video */}
              <div className="col-span-1 lg:col-span-2 space-y-8">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Award className="text-violet-600" /> AI Slot Recommendations
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    {recommendations.slice(0, 4).map((rec, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-gray-50 bg-gray-50/50 hover:bg-white hover:shadow-md transition-all cursor-pointer group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-xl flex flex-col items-center justify-center shadow-sm">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">{format(parse(rec.start_time, "yyyy-MM-dd HH:mm", new Date()), "MMM")}</span>
                            <span className="text-lg font-black text-gray-900 leading-none">{format(parse(rec.start_time, "yyyy-MM-dd HH:mm", new Date()), "dd")}</span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{format(parse(rec.start_time, "yyyy-MM-dd HH:mm", new Date()), "HH:mm")}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">Optimal Slot</span>
                              {rec.is_peak === 1 && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[8px] font-black uppercase">Peak</span>}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => setBookingForm({...bookingForm, startTime: rec.start_time})}
                          className="p-2 bg-white text-emerald-600 rounded-xl border border-gray-100 group-hover:bg-emerald-600 group-hover:text-white transition-all"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Experience Video Section */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Play className="text-emerald-600" /> Spa Experience
                  </h3>
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-900 group cursor-pointer">
                    <img 
                      src="https://picsum.photos/seed/spa-video/800/450" 
                      alt="Spa Experience" 
                      className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                        <Play className="text-white fill-white" size={32} />
                      </div>
                    </div>
                    <div className="absolute bottom-6 left-6 text-white">
                      <p className="font-bold text-lg">Virtual Tour: Serenity Spa</p>
                      <p className="text-sm text-white/70">Experience the tranquility before you arrive</p>
                    </div>
                  </div>
                </div>

                {/* Feedback Section */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <MessageSquare className="text-emerald-600" /> Share Your Feedback
                  </h3>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(i => (
                        <button 
                          key={i} 
                          onClick={() => setRating(i)}
                          className={cn("transition-colors", i <= rating ? "text-amber-400" : "text-gray-200")}
                        >
                          <Star size={24} fill={i <= rating ? "currentColor" : "none"} />
                        </button>
                      ))}
                    </div>
                    <textarea 
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Tell us about your experience..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none h-24 resize-none"
                    />
                    <button 
                      onClick={() => {
                        setMessage({ type: "success", text: "Thank you for your feedback!" });
                        setFeedback("");
                        setRating(0);
                      }}
                      className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-all"
                    >
                      Submit Feedback
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "availability" && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-6">
              {/* Month Calendar Navigation */}
              <div className="col-span-1 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-fit">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-gray-700">
                    {format(parse(availabilityDate, "yyyy-MM-dd", new Date()), "MMMM yyyy")}
                  </h4>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setAvailabilityDate(format(addMinutes(parse(availabilityDate, "yyyy-MM-dd", new Date()), -1440 * 30), "yyyy-MM-dd"))}
                      className="p-1 hover:bg-gray-100 rounded-lg"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button 
                      onClick={() => setAvailabilityDate(format(addMinutes(parse(availabilityDate, "yyyy-MM-dd", new Date()), 1440 * 30), "yyyy-MM-dd"))}
                      className="p-1 hover:bg-gray-100 rounded-lg"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <span key={`${d}-${i}`} className="text-[10px] font-bold text-gray-400 uppercase">{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 35 }).map((_, i) => {
                    const startOfMonthDate = new Date(parse(availabilityDate, "yyyy-MM-dd", new Date()).getFullYear(), parse(availabilityDate, "yyyy-MM-dd", new Date()).getMonth(), 1);
                    const startDay = startOfMonthDate.getDay();
                    const date = new Date(startOfMonthDate);
                    date.setDate(i - startDay + 1);
                    const isCurrentMonth = date.getMonth() === startOfMonthDate.getMonth();
                    const isSelected = format(date, "yyyy-MM-dd") === availabilityDate;
                    
                    return (
                      <button
                        key={i}
                        onClick={() => setAvailabilityDate(format(date, "yyyy-MM-dd"))}
                        className={cn(
                          "aspect-square flex items-center justify-center text-xs rounded-lg transition-all",
                          !isCurrentMonth && "text-gray-300",
                          isSelected ? "bg-emerald-600 text-white font-bold shadow-md" : "hover:bg-emerald-50 text-gray-600"
                        )}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Availability Grid */}
              <div className="col-span-3 space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                      <button
                        onClick={() => setViewBy("therapist")}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                          viewBy === "therapist" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500"
                        )}
                      >
                        Therapists
                      </button>
                      <button
                        onClick={() => setViewBy("room")}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                          viewBy === "room" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500"
                        )}
                      >
                        Rooms
                      </button>
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                      {(["all", "peak", "off-peak"] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setPeakFilter(f)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                            peakFilter === f ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400"
                          )}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                      <span>Booked</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="p-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest sticky left-0 bg-gray-50 z-10">Time Slot</th>
                        {(viewBy === "therapist" ? therapists : rooms).map((item) => (
                          <th key={item.id} className="p-4 text-center text-xs font-bold text-gray-400 uppercase tracking-widest min-w-[150px]">
                            {item.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {availabilityData.slots
                        .filter(s => {
                          if (peakFilter === "peak") return s.is_peak === 1;
                          if (peakFilter === "off-peak") return s.is_peak === 0;
                          return true;
                        })
                        .map((slot) => (
                        <tr key={slot.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4 text-sm font-bold text-gray-600 sticky left-0 bg-white border-r border-gray-50 z-10">
                            {format(parse(slot.start_time, "yyyy-MM-dd HH:mm", new Date()), "HH:mm")}
                          </td>
                          {(viewBy === "therapist" ? therapists : rooms).map((item) => {
                            const booking = availabilityData.bookings.find((b: any) => {
                              const isMatch = viewBy === "therapist" ? b.therapist_id === item.id : b.room_id === item.id;
                              if (!isMatch) return false;
                              
                              const bStart = parse(b.start_time, "yyyy-MM-dd HH:mm", new Date());
                              const bEnd = addMinutes(bStart, b.duration);
                              const sStart = parse(slot.start_time, "yyyy-MM-dd HH:mm", new Date());
                              
                              return (sStart >= bStart && sStart < bEnd);
                            });

                            return (
                              <td key={item.id} className="p-2">
                                {booking ? (
                                  <button
                                    onClick={() => {
                                      setBookingForm({ 
                                        ...bookingForm, 
                                        startTime: slot.start_time,
                                        therapistId: viewBy === "therapist" ? item.id.toString() : "",
                                        roomId: viewBy === "room" ? item.id.toString() : ""
                                      });
                                      setActiveTab("dashboard");
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                      setMessage({ type: "error", text: "This slot is currently booked. You can join the waitlist or choose another time." });
                                    }}
                                    className="w-full bg-gray-100 text-gray-500 p-3 rounded-xl text-xs font-medium border border-gray-200 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-100 transition-all group"
                                  >
                                    <div className="group-hover:hidden">
                                      <p className="font-bold">{booking.guest_name}</p>
                                      <p className="opacity-70">{booking.service_name}</p>
                                    </div>
                                    <div className="hidden group-hover:block font-bold">
                                      Join Waitlist
                                    </div>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setBookingForm({ 
                                        ...bookingForm, 
                                        startTime: slot.start_time,
                                        therapistId: viewBy === "therapist" ? item.id.toString() : "",
                                        roomId: viewBy === "room" ? item.id.toString() : ""
                                      });
                                      setActiveTab("dashboard");
                                      // Optional: scroll to form
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="w-full bg-emerald-50 text-emerald-600 p-3 rounded-xl text-xs font-bold border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all group"
                                  >
                                    <span className="group-hover:hidden">Available</span>
                                    <span className="hidden group-hover:inline">Book Now</span>
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "bookings" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm">Filter:</h3>
                  <button 
                    onClick={() => setShowAllBookings(true)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                      showAllBookings ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    )}
                  >
                    All Bookings
                  </button>
                  <button 
                    onClick={() => setShowAllBookings(false)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                      !showAllBookings ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    )}
                  >
                    By Date
                  </button>
                </div>
                {!showAllBookings && (
                  <input
                    type="date"
                    value={availabilityDate}
                    onChange={(e) => setAvailabilityDate(e.target.value)}
                    className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  />
                )}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search guest name..."
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    className="pl-10 pr-10 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm w-64"
                  />
                  {bookingSearch && (
                    <button 
                      onClick={() => setBookingSearch("")}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-400 font-medium">
                {showAllBookings ? "Showing all historical bookings" : `Showing bookings for ${format(parse(availabilityDate, "yyyy-MM-dd", new Date()), "MMMM dd, yyyy")}`}
              </div>
            </div>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-widest">
                    <th className="px-8 py-4">Guest</th>
                    <th className="px-8 py-4">Service</th>
                    <th className="px-8 py-4">Price</th>
                    <th className="px-8 py-4">Time</th>
                    <th className="px-8 py-4">Therapist / Room</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings
                    .filter(b => {
                      const matchesDate = showAllBookings || b.start_time.startsWith(availabilityDate);
                      const matchesSearch = b.guest_name.toLowerCase().includes(bookingSearch.toLowerCase());
                      return matchesDate && matchesSearch;
                    })
                    .map(booking => (
                    <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                            {booking.guest_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold">{booking.guest_name}</p>
                            <p className="text-xs text-gray-400">{booking.guest_mobile}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 font-medium">{booking.service_name}</td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-emerald-700">${booking.final_price?.toFixed(2)}</span>
                          {booking.offer_code && (
                            <span className="text-[10px] font-bold text-emerald-500 uppercase">{booking.offer_code}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-gray-500">{booking.start_time}</td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-bold">{booking.therapist_name}</p>
                        <p className="text-xs text-gray-400">{booking.room_name}</p>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider w-fit",
                              booking.status === "confirmed" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                            )}>
                              {booking.status}
                            </span>
                            <span className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tight",
                              booking.payment_status === "paid" ? "bg-emerald-500 text-white" : "bg-amber-400 text-white"
                            )}>
                              {booking.payment_status || 'pending'}
                            </span>
                          </div>
                          {booking.status === "cancelled" && (
                            <div className="flex flex-col gap-0.5">
                              {booking.cancellation_reason && (
                                <p className="text-[10px] text-gray-400 italic leading-tight max-w-[150px]">
                                  Reason: {booking.cancellation_reason}
                                </p>
                              )}
                              {booking.refund_status && (
                                <p className={cn(
                                  "text-[10px] font-bold uppercase",
                                  booking.refund_status === "full" ? "text-emerald-500" : "text-amber-500"
                                )}>
                                  Refund: {booking.refund_status}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        {booking.reallocated === 1 && (
                          <span className="mt-1 inline-block px-2 py-1 bg-violet-50 text-violet-600 rounded-full text-[10px] font-black uppercase">AI Reallocated</span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-right flex items-center justify-end gap-3">
                        {booking.status === "confirmed" && booking.payment_status !== "paid" && (
                          <button 
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/bookings/${booking.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ payment_status: 'paid' })
                                });
                                const data = await res.json();
                                if (data.success) {
                                  setMessage({ type: "success", text: "Payment marked as paid!" });
                                  fetchData();
                                }
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="text-emerald-600 hover:text-emerald-700 font-bold text-sm"
                          >
                            Mark Paid
                          </button>
                        )}
                        {booking.status === "confirmed" && (
                          <button 
                            onClick={() => cancelBooking(booking)}
                            className="text-red-500 hover:text-red-700 font-bold text-sm"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "waitlist" && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-widest">
                  <th className="px-8 py-4">Guest</th>
                  <th className="px-8 py-4">Service</th>
                  <th className="px-8 py-4">Preferred Time</th>
                  <th className="px-8 py-4">Priority Score</th>
                  <th className="px-8 py-4">AI Explanation</th>
                  <th className="px-8 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {waitlist.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <p className="font-bold">{entry.guest_name}</p>
                      <p className="text-xs text-gray-400">{entry.guest_mobile}</p>
                    </td>
                    <td className="px-8 py-5 font-medium">{entry.service_name}</td>
                    <td className="px-8 py-5 text-gray-500">{entry.preferred_time}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500" style={{ width: `${entry.priority_score}%` }}></div>
                        </div>
                        <span className="font-bold text-amber-600">{entry.priority_score}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-xs text-gray-400 italic max-w-xs">{entry.explanation}</td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                        entry.status === "waiting" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                      )}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="max-w-3xl mx-auto space-y-4">
            {notifications.map(notif => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={notif.id}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex gap-4"
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                  notif.type === "confirmation" ? "bg-emerald-100 text-emerald-600" :
                  notif.type === "waitlist" ? "bg-amber-100 text-amber-600" :
                  notif.type === "reallocation" ? "bg-violet-100 text-violet-600" : "bg-blue-100 text-blue-600"
                )}>
                  <Bell size={24} />
                </div>
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-gray-900">To: {notif.guest_name}</h4>
                    <span className="text-xs text-gray-400">{format(new Date(notif.created_at), "HH:mm, MMM dd")}</span>
                  </div>
                  <p className="text-gray-600 mt-1">{notif.message}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-gray-100 rounded text-gray-500">{notif.type}</span>
                    <span className="text-[10px] text-gray-300 italic">Sent via SmartSpa AI Engine</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Payment Confirmation Modal */}
      <AnimatePresence>
        {showPaymentModal && lastBookingData && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Booking Confirmation</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <p className="text-emerald-600 text-xs font-bold uppercase tracking-wider">Service Available & Confirmed</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowPaymentModal(false)}
                    className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="bg-emerald-50 rounded-2xl p-4 mb-6 border border-emerald-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Service</span>
                    <span className="font-bold text-emerald-900">{lastBookingData.serviceName}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Time</span>
                    <span className="font-bold text-emerald-900">{format(parse(lastBookingData.startTime, "yyyy-MM-dd HH:mm", new Date()), "MMM dd, HH:mm")}</span>
                  </div>
                  <div className="h-px bg-emerald-200/50 my-2"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Total Amount</span>
                    <span className="text-xl font-bold text-emerald-900">${lastBookingData.price.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Choose Payment Method</p>
                  
                  <button
                    onClick={() => setPaymentMethod("counter")}
                    className={cn(
                      "w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4",
                      paymentMethod === "counter" 
                        ? "border-emerald-500 bg-emerald-50/50" 
                        : "border-gray-100 hover:border-gray-200"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      paymentMethod === "counter" ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400"
                    )}>
                      <Users size={20} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900">Pay at Counter</p>
                      <p className="text-xs text-gray-500">Post-service payment at reception</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod("qr")}
                    className={cn(
                      "w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4",
                      paymentMethod === "qr" 
                        ? "border-emerald-500 bg-emerald-50/50" 
                        : "border-gray-100 hover:border-gray-200"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      paymentMethod === "qr" ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400"
                    )}>
                      <QrCode size={20} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900">Pay via QR (Advance)</p>
                      <p className="text-xs text-gray-500">Scan and pay now for faster check-in</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod("card")}
                    className={cn(
                      "w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4",
                      paymentMethod === "card" 
                        ? "border-emerald-500 bg-emerald-50/50" 
                        : "border-gray-100 hover:border-gray-200"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      paymentMethod === "card" ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400"
                    )}>
                      <CreditCard size={20} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900">Credit/Debit Card</p>
                      <p className="text-xs text-gray-500">Secure online payment (Advance)</p>
                    </div>
                  </button>
                </div>

                {paymentMethod === "qr" && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mb-8 flex flex-col items-center p-6 bg-gray-50 rounded-3xl border border-dashed border-gray-200"
                  >
                    <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
                      <QrCode size={120} className="text-gray-900" />
                    </div>
                    <p className="text-xs text-gray-400 text-center">Scan this QR code with any payment app to complete your advance payment.</p>
                  </motion.div>
                )}

                {paymentMethod === "card" && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mb-8 space-y-3 p-6 bg-gray-50 rounded-3xl border border-gray-100"
                  >
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Card Number" 
                        className="w-full p-3 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none text-sm font-mono"
                        defaultValue="**** **** **** 4242"
                      />
                      <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="text" 
                        placeholder="MM/YY" 
                        className="w-full p-3 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none text-sm font-mono"
                        defaultValue="12/28"
                      />
                      <input 
                        type="password" 
                        placeholder="CVV" 
                        className="w-full p-3 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none text-sm font-mono"
                        defaultValue="***"
                      />
                    </div>
                  </motion.div>
                )}

                <button
                  onClick={async () => {
                    if (paymentMethod === "qr" || paymentMethod === "card") {
                      try {
                        await fetch(`/api/bookings/${lastBookingData.id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ payment_status: 'paid' })
                        });
                        fetchData();
                      } catch (err) {
                        console.error("Failed to update payment status", err);
                      }
                    }
                    const methodLabel = paymentMethod === "qr" ? "QR Payment" : paymentMethod === "card" ? "Card Payment" : "Pay at Counter";
                    setMessage({ type: "success", text: `Booking Confirmed with ${methodLabel}! We look forward to seeing you.` });
                    setShowPaymentModal(false);
                  }}
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-[0.98]"
                >
                  Confirm & Finalize Booking
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
