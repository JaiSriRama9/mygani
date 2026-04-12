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
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, addDays, startOfToday, parse, addMinutes, isWithinInterval, isSameDay, differenceInMinutes } from "date-fns";
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
  const [activeTab, setActiveTab] = useState<"dashboard" | "bookings" | "waitlist" | "notifications" | "consultation">("dashboard");
  const [services, setServices] = useState<Service[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recommendations, setRecommendations] = useState<Slot[]>([]);
  const [bookingsView, setBookingsView] = useState<"list" | "availability">("list");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  const [bookingForm, setBookingForm] = useState({
    guestName: "",
    serviceId: "",
    startTime: "",
    isVip: false,
    therapistId: "",
    roomId: ""
  });

  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [availableResources, setAvailableResources] = useState<{ therapists: Therapist[], rooms: Room[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  const fetchData = async () => {
    try {
      const [srv, thr, rms, bks, wtl, ntf, dsh] = await Promise.all([
        fetch("/api/services").then(res => res.json()),
        fetch("/api/therapists").then(res => res.json()),
        fetch("/api/rooms").then(res => res.json()),
        fetch("/api/bookings").then(res => res.json()),
        fetch("/api/waitlist").then(res => res.json()),
        fetch("/api/notifications").then(res => res.json()),
        fetch("/api/dashboard").then(res => res.json())
      ]);
      setServices(srv);
      setTherapists(thr);
      setRooms(rms);
      setBookings(bks);
      setWaitlist(wtl);
      setNotifications(ntf);
      setStats(dsh);
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

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

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAlternatives([]);
    setAvailableResources(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingForm)
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        setBookingForm({ guestName: "", serviceId: "", startTime: "", isVip: false, therapistId: "", roomId: "" });
        fetchData();
      } else {
        setMessage({ type: "error", text: data.message });
        if (data.alternatives) setAlternatives(data.alternatives);
        if (data.availableTherapists || data.availableRooms) {
          setAvailableResources({
            therapists: data.availableTherapists || [],
            rooms: data.availableRooms || []
          });
        }
      }
    } catch (err) {
      setMessage({ type: "error", text: "Booking failed. Try again." });
    }
    setLoading(false);
  };

  const handleWaitlist = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: bookingForm.guestName,
          serviceId: bookingForm.serviceId,
          preferredTime: bookingForm.startTime,
          isVip: bookingForm.isVip
        })
      });
      const data = await res.json();
      setMessage({ type: "success", text: `Added to waitlist! Priority Score: ${data.score}` });
      setBookingForm({ guestName: "", serviceId: "", startTime: "", isVip: false, therapistId: "", roomId: "" });
      setAlternatives([]);
      setAvailableResources(null);
      fetchData();
    } catch (err) {
      setMessage({ type: "error", text: "Failed to join waitlist." });
    }
    setLoading(false);
  };

  const cancelBooking = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    await fetch(`/api/bookings/${id}/cancel`, { method: "POST" });
    fetchData();
    setMessage({ type: "success", text: "Booking cancelled. AI is checking waitlist for reallocation..." });
  };

  return (
    <div className="min-h-screen bg-beige text-charcoal font-sans selection:bg-teal-brand/20">
      {/* AI Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-brand/5 blur-[120px] rounded-full animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-soft-pink/10 blur-[120px] rounded-full animate-pulse-glow" style={{ animationDelay: "2s" }} />
      </div>

      {/* Sidebar - Desktop */}
      <nav className="fixed left-0 top-0 h-full w-72 glass-dark text-white p-8 z-50 hidden lg:flex flex-col border-r-0">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-brand to-forest rounded-2xl flex items-center justify-center text-white glow-teal">
            <Zap size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter leading-none">SmartSpa</h1>
            <span className="text-[10px] uppercase tracking-[0.3em] text-teal-brand font-bold">AI Wellness</span>
          </div>
        </div>

        <div className="space-y-3 flex-1">
          {[
            { id: "dashboard", label: "Sanctuary", icon: LayoutDashboard },
            { id: "bookings", label: "Journeys", icon: Calendar },
            { id: "consultation", label: "AI Oracle", icon: Award },
            { id: "waitlist", label: "Priority", icon: Users },
            { id: "notifications", label: "Whispers", icon: Bell },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                activeTab === tab.id 
                  ? "bg-white/10 text-white font-semibold" 
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              <tab.icon size={22} className={cn("transition-transform duration-300", activeTab === tab.id ? "scale-110" : "group-hover:scale-110")} />
              <span className="tracking-wide">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-6 bg-teal-brand rounded-r-full" />
              )}
            </button>
          ))}
        </div>

        <div className="pt-8 border-t border-white/10">
          <button 
            onClick={handleGenerateSlots}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-teal-brand to-forest text-white py-4 rounded-2xl font-bold hover:glow-teal transition-all duration-300 disabled:opacity-50 group"
          >
            <RefreshCw size={20} className={cn("transition-transform duration-700", loading ? "animate-spin" : "group-hover:rotate-180")} />
            Sync AI Slots
          </button>
        </div>
      </nav>

      {/* Bottom Nav - Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-white/20 p-4 z-50 flex lg:hidden justify-around items-center rounded-t-[32px] shadow-2xl">
        {[
          { id: "dashboard", icon: LayoutDashboard },
          { id: "bookings", icon: Calendar },
          { id: "consultation", icon: Award },
          { id: "notifications", icon: Bell },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "p-3 rounded-2xl transition-all duration-300",
              activeTab === tab.id ? "bg-forest text-white glow-teal" : "text-gray-400"
            )}
          >
            <tab.icon size={24} />
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="lg:ml-72 p-6 lg:p-12 relative z-10 pb-32 lg:pb-12">
        {/* Hero Section - Only on Dashboard */}
        {activeTab === "dashboard" && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative h-[400px] rounded-[40px] overflow-hidden mb-12 group"
          >
            <img 
              src="https://picsum.photos/seed/spa-luxury/1920/1080?blur=2" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              alt="Luxury Spa"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-forest/90 via-forest/40 to-transparent flex flex-col justify-center p-12">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <span className="inline-block px-4 py-1.5 bg-teal-brand/20 backdrop-blur-md border border-teal-brand/30 text-teal-brand rounded-full text-xs font-black uppercase tracking-[0.2em] mb-6">
                  Premium Experience
                </span>
                <h2 className="text-5xl lg:text-6xl font-black text-white leading-[0.9] mb-6 max-w-xl tracking-tighter">
                  Relax Smarter with <span className="text-teal-brand">AI-Powered</span> Wellness
                </h2>
                <p className="text-white/70 text-lg max-w-md mb-8 font-medium leading-relaxed">
                  Personalized spa experiences powered by intelligent insights. Discover the future of tranquility.
                </p>
                <button 
                  onClick={() => setBookingsView("availability")}
                  className="px-8 py-4 bg-white text-forest rounded-2xl font-bold hover:bg-teal-brand hover:text-white transition-all duration-300 hover:glow-teal"
                >
                  Explore Availability
                </button>
              </motion.div>
            </div>
          </motion.section>
        )}

        <header className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-4xl font-black tracking-tighter capitalize text-forest">{activeTab === "dashboard" ? "Sanctuary" : activeTab}</h2>
            <p className="text-gray-400 font-medium mt-1">Intelligent Spa Operations Management</p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-forest">Ganesh QA</p>
              <p className="text-xs text-gray-400 font-medium">Operations Lead</p>
            </div>
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-xl glow-gold">
              <img src="https://picsum.photos/seed/admin/200/200" alt="Admin" referrerPolicy="no-referrer" />
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={cn(
                "mb-8 p-5 rounded-[24px] flex items-center gap-4 glass shadow-xl",
                message.type === "success" ? "text-emerald-700 border-emerald-100/50" : "text-red-700 border-red-100/50"
              )}
            >
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", message.type === "success" ? "bg-emerald-100" : "bg-red-100")}>
                {message.type === "success" ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
              </div>
              <span className="font-bold flex-1">{message.text}</span>
              <button className="text-xs font-black uppercase tracking-widest opacity-50 hover:opacity-100" onClick={() => setMessage(null)}>Dismiss</button>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === "dashboard" && (
          <div className="space-y-12">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { label: "Total Bookings", value: stats?.totalBookings || 0, icon: Calendar, color: "from-blue-500 to-blue-700" },
                { label: "Waitlisted", value: stats?.waitlisted || 0, icon: Users, color: "from-amber-500 to-amber-700" },
                { label: "Utilization", value: `${stats?.utilization || 0}%`, icon: TrendingUp, color: "from-teal-brand to-forest" },
                { label: "AI Reallocated", value: stats?.reallocatedCount || 0, icon: Zap, color: "from-violet-500 to-violet-700" },
              ].map((stat, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={stat.label}
                  className="glass p-8 rounded-[32px] shadow-sm hover:shadow-xl transition-all duration-500 group"
                >
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 bg-gradient-to-br shadow-lg group-hover:scale-110 transition-transform duration-500", stat.color)}>
                    <stat.icon size={28} />
                  </div>
                  <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">{stat.label}</p>
                  <h3 className="text-4xl font-black text-forest">{stat.value}</h3>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
              {/* Booking Form */}
              <div className="xl:col-span-1 glass p-10 rounded-[40px] shadow-sm border-white/50">
                <h3 className="text-2xl font-black mb-8 flex items-center gap-3 text-forest">
                  <div className="w-10 h-10 bg-teal-brand/10 rounded-xl flex items-center justify-center text-teal-brand">
                    <PlusCircle size={24} />
                  </div>
                  New Journey
                </h3>
                <form onSubmit={handleBooking} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Guest Name</label>
                    <input
                      type="text"
                      required
                      value={bookingForm.guestName}
                      onChange={e => setBookingForm({...bookingForm, guestName: e.target.value})}
                      className="w-full px-6 py-4 rounded-2xl bg-white/50 border border-white focus:border-teal-brand focus:ring-4 focus:ring-teal-brand/10 outline-none transition-all font-medium"
                      placeholder="e.g. Alice Johnson"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Service</label>
                    <select
                      required
                      value={bookingForm.serviceId}
                      onChange={e => setBookingForm({...bookingForm, serviceId: e.target.value})}
                      className="w-full px-6 py-4 rounded-2xl bg-white/50 border border-white focus:border-teal-brand focus:ring-4 focus:ring-teal-brand/10 outline-none transition-all font-medium appearance-none"
                    >
                      <option value="">Select Service</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.duration}m)</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Preferred Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={bookingForm.startTime.replace(" ", "T")}
                      onChange={e => setBookingForm({...bookingForm, startTime: e.target.value.replace("T", " ")})}
                      className="w-full px-6 py-4 rounded-2xl bg-white/50 border border-white focus:border-teal-brand focus:ring-4 focus:ring-teal-brand/10 outline-none transition-all font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Therapist</label>
                      <select
                        value={bookingForm.therapistId}
                        onChange={e => setBookingForm({...bookingForm, therapistId: e.target.value})}
                        className="w-full px-6 py-3 rounded-2xl bg-white/50 border border-white focus:border-teal-brand outline-none text-sm font-bold"
                      >
                        <option value="">Any</option>
                        {therapists.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Room</label>
                      <select
                        value={bookingForm.roomId}
                        onChange={e => setBookingForm({...bookingForm, roomId: e.target.value})}
                        className="w-full px-6 py-3 rounded-2xl bg-white/50 border border-white focus:border-teal-brand outline-none text-sm font-bold"
                      >
                        <option value="">Any</option>
                        {rooms.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 py-2">
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="vip"
                        checked={bookingForm.isVip}
                        onChange={e => setBookingForm({...bookingForm, isVip: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-brand"></div>
                    </div>
                    <label htmlFor="vip" className="text-sm font-bold text-forest">VIP Guest Status</label>
                  </div>
                  <div className="grid grid-cols-1 gap-4 pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-teal-brand to-forest text-white py-5 rounded-2xl font-black text-lg hover:glow-teal transition-all duration-300 disabled:opacity-50 shadow-xl"
                    >
                      Confirm Booking
                    </button>
                    <button
                      type="button"
                      onClick={handleWaitlist}
                      disabled={loading || !bookingForm.guestName || !bookingForm.serviceId}
                      className="w-full bg-soft-pink/20 text-forest py-4 rounded-2xl font-bold hover:bg-soft-pink/30 transition-all disabled:opacity-50"
                    >
                      Join Priority Waitlist
                    </button>
                  </div>
                </form>

                {/* Alternatives Section */}
                <AnimatePresence>
                  {(availableResources || alternatives.length > 0) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-8 pt-8 border-t border-forest/5 space-y-6"
                    >
                      {availableResources && (
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Available Now:</p>
                          <div className="flex flex-wrap gap-2">
                            {availableResources.therapists.map(t => (
                              <span key={t.id} className="px-3 py-1.5 bg-teal-brand/10 text-teal-brand rounded-xl text-[10px] font-black uppercase tracking-wider border border-teal-brand/20">
                                {t.name}
                              </span>
                            ))}
                            {availableResources.rooms.map(r => (
                              <span key={r.id} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-wider border border-blue-100">
                                {r.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {alternatives.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">AI Suggested Slots:</p>
                          <div className="space-y-3">
                            {alternatives.map((alt, i) => (
                              <button
                                key={i}
                                onClick={() => setBookingForm({
                                  ...bookingForm,
                                  startTime: alt.startTime,
                                  therapistId: alt.therapist.id.toString(),
                                  roomId: alt.room.id.toString()
                                })}
                                className="w-full text-left p-4 rounded-2xl border border-white bg-white/30 hover:bg-white hover:shadow-lg transition-all group"
                              >
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-black text-forest">{format(parse(alt.startTime, "yyyy-MM-dd HH:mm", new Date()), "HH:mm, MMM dd")}</span>
                                  <PlusCircle size={18} className="text-teal-brand opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{alt.therapist.name} • {alt.room.name}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* AI Recommendations */}
              <div className="xl:col-span-2 glass p-10 rounded-[40px] shadow-sm border-white/50">
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-2xl font-black flex items-center gap-3 text-forest">
                    <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-600">
                      <Award size={24} />
                    </div>
                    AI Optimized Slots
                  </h3>
                  <span className="text-[10px] font-black bg-violet-500 text-white px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg shadow-violet-500/20">Oracle Pick</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {recommendations.length > 0 ? recommendations.map((rec, i) => (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      key={i} 
                      onClick={() => setBookingForm({...bookingForm, startTime: rec.start_time})}
                      className="flex items-center justify-between p-6 rounded-[32px] border border-white bg-white/40 hover:bg-white hover:shadow-2xl transition-all duration-500 cursor-pointer group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-teal-brand/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-teal-brand/10 transition-colors" />
                      <div className="flex items-center gap-5 relative z-10">
                        <div className="w-14 h-14 bg-white rounded-2xl flex flex-col items-center justify-center shadow-sm group-hover:glow-teal transition-all">
                          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{format(parse(rec.start_time, "yyyy-MM-dd HH:mm", new Date()), "MMM")}</span>
                          <span className="text-xl font-black text-forest leading-none">{format(parse(rec.start_time, "yyyy-MM-dd HH:mm", new Date()), "dd")}</span>
                        </div>
                        <div>
                          <p className="text-lg font-black text-forest">{format(parse(rec.start_time, "yyyy-MM-dd HH:mm", new Date()), "HH:mm")} - {format(parse(rec.end_time, "yyyy-MM-dd HH:mm", new Date()), "HH:mm")}</p>
                          <p className="text-[10px] text-teal-brand font-black uppercase tracking-widest mt-1 opacity-70">{rec.explanation}</p>
                        </div>
                      </div>
                      <div className="relative z-10">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Score</p>
                          <p className="text-3xl font-black text-teal-brand leading-none">{rec.score}</p>
                        </div>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="col-span-2 text-center py-20 text-gray-300">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock size={40} className="opacity-20" />
                      </div>
                      <p className="font-bold tracking-wide">Sync AI Oracle to reveal optimal wellness windows</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "consultation" && (
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-to-br from-teal-brand to-forest rounded-[28px] flex items-center justify-center text-white mx-auto glow-teal mb-6">
                <Award size={40} />
              </div>
              <h2 className="text-5xl font-black tracking-tighter text-forest">AI Wellness Oracle</h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto font-medium">
                Harness the power of intelligent insights to craft your perfect sanctuary experience.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass p-10 rounded-[40px] border-white/50 space-y-6">
                <h3 className="text-2xl font-black text-forest">Personalized Analysis</h3>
                <p className="text-gray-500 font-medium">Our AI analyzes your past preferences and current stress levels to recommend the ideal treatment.</p>
                <div className="space-y-4 pt-4">
                  {[
                    "Stress Level: High (Detected via schedule density)",
                    "Preferred Focus: Deep Tissue & Aromatherapy",
                    "Optimal Window: Tomorrow, 10:00 AM - 11:30 AM"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-white/40 rounded-2xl border border-white">
                      <div className="w-2 h-2 bg-teal-brand rounded-full glow-teal" />
                      <span className="text-sm font-bold text-forest">{item}</span>
                    </div>
                  ))}
                </div>
                <button className="w-full py-4 bg-forest text-white rounded-2xl font-bold hover:glow-teal transition-all">Generate New Insight</button>
              </div>

              <div className="glass p-10 rounded-[40px] border-white/50 space-y-6">
                <h3 className="text-2xl font-black text-forest">Smart Recommendations</h3>
                <div className="space-y-4">
                  <div className="p-6 bg-gradient-to-br from-teal-brand/10 to-forest/10 rounded-3xl border border-teal-brand/20">
                    <h4 className="font-black text-teal-brand uppercase tracking-widest text-xs mb-2">Top Pick</h4>
                    <p className="text-lg font-black text-forest mb-2">90m Deep Tissue + Lavender</p>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">Based on your recent high-intensity bookings, this combination will maximize recovery.</p>
                  </div>
                  <div className="p-6 bg-white/40 rounded-3xl border border-white">
                    <h4 className="font-black text-gray-400 uppercase tracking-widest text-xs mb-2">Alternative</h4>
                    <p className="text-lg font-black text-forest mb-2">60m Swedish + Hot Stones</p>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">A gentler approach for mid-week relaxation.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "bookings" && (
          <div className="space-y-12">
            <div className="flex justify-between items-center">
              <div className="flex glass p-1.5 rounded-2xl border-white/50 shadow-sm">
                <button 
                  onClick={() => setBookingsView("list")}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
                    bookingsView === "list" ? "bg-forest text-white shadow-lg" : "text-gray-400 hover:text-forest hover:bg-white/50"
                  )}
                >
                  List View
                </button>
                <button 
                  onClick={() => setBookingsView("availability")}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
                    bookingsView === "availability" ? "bg-forest text-white shadow-lg" : "text-gray-400 hover:text-forest hover:bg-white/50"
                  )}
                >
                  Availability
                </button>
              </div>
              
              {bookingsView === "availability" && (
                <div className="flex items-center gap-4 glass px-6 py-2.5 rounded-2xl border-white/50 shadow-sm">
                  <Calendar size={18} className="text-teal-brand" />
                  <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm font-black text-forest uppercase tracking-widest"
                  />
                </div>
              )}
            </div>

            {bookingsView === "list" ? (
              <div className="glass rounded-[40px] shadow-sm border-white/50 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-forest/5 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">
                      <th className="px-10 py-6">Guest Sanctuary</th>
                      <th className="px-10 py-6">Service Journey</th>
                      <th className="px-10 py-6">Temporal Window</th>
                      <th className="px-10 py-6">Guide / Chamber</th>
                      <th className="px-10 py-6">Status</th>
                      <th className="px-10 py-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-forest/5">
                    {bookings.map(booking => (
                      <tr key={booking.id} className="hover:bg-white/40 transition-colors group">
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-brand to-forest text-white flex items-center justify-center font-black text-xs shadow-lg">
                              {booking.guest_name.charAt(0)}
                            </div>
                            <span className="font-black text-forest">{booking.guest_name}</span>
                          </div>
                        </td>
                        <td className="px-10 py-6 font-bold text-gray-600">{booking.service_name}</td>
                        <td className="px-10 py-6">
                          <p className="text-sm font-black text-forest">{format(parse(booking.start_time, "yyyy-MM-dd HH:mm", new Date()), "HH:mm")}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{format(parse(booking.start_time, "yyyy-MM-dd HH:mm", new Date()), "MMM dd")}</p>
                        </td>
                        <td className="px-10 py-6">
                          <p className="text-sm font-black text-forest">{booking.therapist_name}</p>
                          <p className="text-[10px] font-bold text-teal-brand uppercase tracking-widest">{booking.room_name}</p>
                        </td>
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm",
                              booking.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                            )}>
                              {booking.status}
                            </span>
                            {booking.reallocated === 1 && (
                              <span className="px-3 py-1 bg-violet-500 text-white rounded-full text-[8px] font-black uppercase tracking-widest glow-teal">AI Optimized</span>
                            )}
                          </div>
                        </td>
                        <td className="px-10 py-6 text-right">
                          {booking.status === "confirmed" && (
                            <button 
                              onClick={() => cancelBooking(booking.id)}
                              className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400 hover:text-red-600 transition-colors"
                            >
                              Release
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="glass rounded-[40px] shadow-sm border-white/50 overflow-x-auto">
                <div className="min-w-[1000px] p-10">
                  <div className="grid grid-cols-[180px_1fr] gap-6">
                    {/* Time Header */}
                    <div className="h-10"></div>
                    <div className="grid grid-cols-20 gap-0 border-b border-forest/5 pb-4">
                      {Array.from({ length: 11 }).map((_, i) => (
                        <div key={i} className="text-[10px] font-black text-gray-400 text-center col-span-2 uppercase tracking-widest">
                          {9 + i}:00
                        </div>
                      ))}
                    </div>

                    {/* Room Rows */}
                    {rooms.map(room => (
                      <React.Fragment key={room.id}>
                        <div className="flex items-center font-black text-sm text-forest border-r border-forest/5 pr-6">
                          {room.name}
                        </div>
                        <div className="relative h-20 bg-white/30 rounded-3xl border border-white overflow-hidden shadow-inner">
                          {/* Grid Lines */}
                          <div className="absolute inset-0 grid grid-cols-20 pointer-events-none">
                            {Array.from({ length: 19 }).map((_, i) => (
                              <div key={i} className="border-r border-forest/5 h-full"></div>
                            ))}
                          </div>

                          {/* Bookings on Timeline */}
                          {bookings
                            .filter(b => b.room_id === room.id && b.status === "confirmed" && b.start_time.startsWith(selectedDate))
                            .map(booking => {
                              const start = parse(booking.start_time, "yyyy-MM-dd HH:mm", new Date());
                              const dayStart = parse(`${selectedDate} 09:00`, "yyyy-MM-dd HH:mm", new Date());
                              const offsetMinutes = differenceInMinutes(start, dayStart);
                              const left = (offsetMinutes / 600) * 100; // 10 hours = 600 mins
                              const width = (booking.service_duration / 600) * 100;

                              return (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  key={booking.id}
                                  className="absolute top-2 bottom-2 rounded-2xl bg-gradient-to-r from-teal-brand to-forest text-white p-3 shadow-lg flex flex-col justify-center overflow-hidden group cursor-pointer hover:glow-teal transition-all z-10"
                                  style={{ left: `${left}%`, width: `${width}%` }}
                                >
                                  <p className="text-[10px] font-black truncate leading-none">{booking.guest_name}</p>
                                  <p className="text-[8px] font-bold opacity-70 truncate mt-1 uppercase tracking-widest">{booking.service_name}</p>
                                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </motion.div>
                              );
                            })}
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "waitlist" && (
          <div className="glass rounded-[40px] shadow-sm border-white/50 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-forest/5 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="px-10 py-6">Guest Sanctuary</th>
                  <th className="px-10 py-6">Service Journey</th>
                  <th className="px-10 py-6">Temporal Window</th>
                  <th className="px-10 py-6">Priority Score</th>
                  <th className="px-10 py-6">AI Oracle Insight</th>
                  <th className="px-10 py-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest/5">
                {waitlist.map(entry => (
                  <tr key={entry.id} className="hover:bg-white/40 transition-colors group">
                    <td className="px-10 py-6 font-black text-forest">{entry.guest_name}</td>
                    <td className="px-10 py-6 font-bold text-gray-600">{entry.service_name}</td>
                    <td className="px-10 py-6 text-sm font-black text-forest">{entry.preferred_time}</td>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                          <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 shadow-lg" style={{ width: `${entry.priority_score}%` }}></div>
                        </div>
                        <span className="font-black text-amber-600 text-sm">{entry.priority_score}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-xs text-gray-400 italic max-w-xs font-medium leading-relaxed">{entry.explanation}</td>
                    <td className="px-10 py-6">
                      <span className={cn(
                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm",
                        entry.status === "waiting" ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-700"
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
          <div className="max-w-3xl mx-auto space-y-6">
            {notifications.map(notif => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={notif.id}
                className="glass p-8 rounded-[32px] shadow-sm hover:shadow-xl transition-all duration-500 flex gap-6 border-white/50"
              >
                <div className={cn(
                  "w-16 h-16 rounded-[20px] flex items-center justify-center shrink-0 shadow-lg",
                  notif.type === "confirmation" ? "bg-emerald-100 text-emerald-600" :
                  notif.type === "waitlist" ? "bg-amber-100 text-amber-600" :
                  notif.type === "reallocation" ? "bg-violet-100 text-violet-600" : "bg-blue-100 text-blue-600"
                )}>
                  <Bell size={28} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-lg font-black text-forest tracking-tight">To: {notif.guest_name}</h4>
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{format(new Date(notif.created_at), "HH:mm, MMM dd")}</span>
                  </div>
                  <p className="text-gray-500 font-medium leading-relaxed">{notif.message}</p>
                  <div className="mt-5 flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 bg-forest/5 rounded-full text-forest/50 border border-forest/5">{notif.type}</span>
                    <span className="text-[10px] text-teal-brand font-black uppercase tracking-widest opacity-50">SmartSpa AI Engine</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
