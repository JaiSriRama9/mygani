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
  const [activeTab, setActiveTab] = useState<"dashboard" | "bookings" | "waitlist" | "notifications">("dashboard");
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
            Generate Daily Slots
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="ml-64 p-10">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight capitalize">{activeTab}</h2>
            <p className="text-gray-500 mt-1">Intelligent Spa Operations Management</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">Resort Admin</p>
              <p className="text-xs text-gray-400">Operations Lead</p>
            </div>
            <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
              <img src="https://picsum.photos/seed/admin/100/100" alt="Admin" referrerPolicy="no-referrer" />
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "mb-6 p-4 rounded-xl flex items-center gap-3",
                message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
              )}
            >
              {message.type === "success" ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
              {message.text}
              <button className="ml-auto text-sm font-bold" onClick={() => setMessage(null)}>Dismiss</button>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-6">
              {[
                { label: "Total Bookings", value: stats?.totalBookings || 0, icon: Calendar, color: "bg-blue-500" },
                { label: "Waitlisted", value: stats?.waitlisted || 0, icon: Users, color: "bg-amber-500" },
                { label: "Utilization", value: `${stats?.utilization || 0}%`, icon: TrendingUp, color: "bg-emerald-500" },
                { label: "AI Reallocated", value: stats?.reallocatedCount || 0, icon: Zap, color: "bg-violet-500" },
              ].map((stat, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={stat.label}
                  className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4", stat.color)}>
                    <stat.icon size={20} />
                  </div>
                  <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
                  <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-8">
              {/* Booking Form */}
              <div className="col-span-1 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <PlusCircle className="text-emerald-600" /> New Booking
                </h3>
                <form onSubmit={handleBooking} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name</label>
                    <input
                      type="text"
                      required
                      value={bookingForm.guestName}
                      onChange={e => setBookingForm({...bookingForm, guestName: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="e.g. Alice Johnson"
                    />
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
                      {services.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.duration}m)</option>
                      ))}
                    </select>
                  </div>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Therapist (Optional)</label>
                      <select
                        value={bookingForm.therapistId}
                        onChange={e => setBookingForm({...bookingForm, therapistId: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                      >
                        <option value="">Any Available</option>
                        {therapists.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Room (Optional)</label>
                      <select
                        value={bookingForm.roomId}
                        onChange={e => setBookingForm({...bookingForm, roomId: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                      >
                        <option value="">Any Available</option>
                        {rooms.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
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
                  <div className="grid grid-cols-2 gap-3 pt-2">
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

                {/* Alternatives Section */}
                <AnimatePresence>
                  {(availableResources || alternatives.length > 0) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-6 pt-6 border-t border-gray-100 space-y-4"
                    >
                      {availableResources && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Available at requested time:</p>
                          <div className="flex flex-wrap gap-2">
                            {availableResources.therapists.map(t => (
                              <span key={t.id} className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold">
                                {t.name}
                              </span>
                            ))}
                            {availableResources.rooms.map(r => (
                              <span key={r.id} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold">
                                {r.name}
                              </span>
                            ))}
                            {availableResources.therapists.length === 0 && <span className="text-[10px] text-red-400 font-bold">No Therapists Free</span>}
                            {availableResources.rooms.length === 0 && <span className="text-[10px] text-red-400 font-bold">No Rooms Free</span>}
                          </div>
                        </div>
                      )}

                      {alternatives.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Alternative Options:</p>
                          <div className="space-y-2">
                            {alternatives.map((alt, i) => (
                              <button
                                key={i}
                                onClick={() => setBookingForm({
                                  ...bookingForm,
                                  startTime: alt.startTime,
                                  therapistId: alt.therapist.id.toString(),
                                  roomId: alt.room.id.toString()
                                })}
                                className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group"
                              >
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-bold text-gray-700">{format(parse(alt.startTime, "yyyy-MM-dd HH:mm", new Date()), "HH:mm, MMM dd")}</span>
                                  <PlusCircle size={14} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">{alt.therapist.name} in {alt.room.name}</p>
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
              <div className="col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Award className="text-violet-600" /> AI Slot Recommendations
                  </h3>
                  <span className="text-xs font-bold bg-violet-50 text-violet-600 px-3 py-1 rounded-full uppercase tracking-wider">Optimized</span>
                </div>
                
                <div className="space-y-4">
                  {recommendations.length > 0 ? recommendations.map((rec, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-gray-50 bg-gray-50/50 hover:bg-white hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex flex-col items-center justify-center shadow-sm">
                          <span className="text-xs font-bold text-gray-400">{format(parse(rec.start_time, "yyyy-MM-dd HH:mm", new Date()), "MMM")}</span>
                          <span className="text-lg font-bold leading-none">{format(parse(rec.start_time, "yyyy-MM-dd HH:mm", new Date()), "dd")}</span>
                        </div>
                        <div>
                          <p className="font-bold">{format(parse(rec.start_time, "yyyy-MM-dd HH:mm", new Date()), "HH:mm")} - {format(parse(rec.end_time, "yyyy-MM-dd HH:mm", new Date()), "HH:mm")}</p>
                          <p className="text-xs text-gray-500 mt-0.5 italic">{rec.explanation}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Score</p>
                          <p className="text-xl font-black text-emerald-600">{rec.score}</p>
                        </div>
                        <button 
                          onClick={() => setBookingForm({...bookingForm, startTime: rec.start_time})}
                          className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <PlusCircle size={18} />
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-10 text-gray-400">
                      <Clock size={48} className="mx-auto mb-4 opacity-20" />
                      <p>Generate slots to see AI recommendations</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "bookings" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                <button 
                  onClick={() => setBookingsView("list")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                    bookingsView === "list" ? "bg-emerald-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  List View
                </button>
                <button 
                  onClick={() => setBookingsView("availability")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                    bookingsView === "availability" ? "bg-emerald-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  Availability View
                </button>
              </div>
              
              {bookingsView === "availability" && (
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
                  <Calendar size={18} className="text-emerald-600" />
                  <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="text-sm font-bold outline-none bg-transparent"
                  />
                </div>
              )}
            </div>

            {bookingsView === "list" ? (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-widest">
                      <th className="px-8 py-4">Guest</th>
                      <th className="px-8 py-4">Service</th>
                      <th className="px-8 py-4">Time</th>
                      <th className="px-8 py-4">Therapist / Room</th>
                      <th className="px-8 py-4">Status</th>
                      <th className="px-8 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bookings.map(booking => (
                      <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                              {booking.guest_name.charAt(0)}
                            </div>
                            <span className="font-bold">{booking.guest_name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 font-medium">{booking.service_name}</td>
                        <td className="px-8 py-5 text-gray-500">{booking.start_time}</td>
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold">{booking.therapist_name}</p>
                          <p className="text-xs text-gray-400">{booking.room_name}</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                            booking.status === "confirmed" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                          )}>
                            {booking.status}
                          </span>
                          {booking.reallocated === 1 && (
                            <span className="ml-2 px-2 py-1 bg-violet-50 text-violet-600 rounded-full text-[10px] font-black uppercase">AI Reallocated</span>
                          )}
                        </td>
                        <td className="px-8 py-5 text-right">
                          {booking.status === "confirmed" && (
                            <button 
                              onClick={() => cancelBooking(booking.id)}
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
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-x-auto">
                <div className="min-w-[1000px] p-8">
                  <div className="grid grid-cols-[150px_1fr] gap-4">
                    {/* Time Header */}
                    <div className="h-10"></div>
                    <div className="grid grid-cols-20 gap-0 border-b border-gray-100 pb-2">
                      {Array.from({ length: 11 }).map((_, i) => (
                        <div key={i} className="text-[10px] font-bold text-gray-400 text-center col-span-2">
                          {9 + i}:00
                        </div>
                      ))}
                    </div>

                    {/* Room Rows */}
                    {rooms.map(room => (
                      <React.Fragment key={room.id}>
                        <div className="flex items-center font-bold text-sm text-gray-700 border-r border-gray-100 pr-4">
                          {room.name}
                        </div>
                        <div className="relative h-16 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 overflow-hidden">
                          {/* Grid Lines */}
                          <div className="absolute inset-0 grid grid-cols-20 pointer-events-none">
                            {Array.from({ length: 19 }).map((_, i) => (
                              <div key={i} className="border-r border-gray-100 h-full"></div>
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
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  key={booking.id}
                                  style={{ left: `${left}%`, width: `${width}%` }}
                                  className="absolute top-2 bottom-2 bg-emerald-100 border border-emerald-200 rounded-lg p-2 overflow-hidden group cursor-pointer hover:bg-emerald-200 transition-colors z-10"
                                >
                                  <div className="flex flex-col h-full justify-center">
                                    <p className="text-[10px] font-black text-emerald-800 truncate leading-tight">{booking.guest_name}</p>
                                    <p className="text-[8px] text-emerald-600 truncate font-bold">{booking.service_name}</p>
                                  </div>
                                  
                                  {/* Tooltip */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-50">
                                    {booking.start_time.split(" ")[1]} - {booking.service_name} ({booking.therapist_name})
                                  </div>
                                </motion.div>
                              );
                            })}
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                  
                  <div className="mt-8 flex items-center gap-6 justify-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-emerald-100 border border-emerald-200 rounded"></div>
                      <span>Confirmed Booking</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-50 border border-dashed border-gray-200 rounded"></div>
                      <span>Available Slot</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                    <td className="px-8 py-5 font-bold">{entry.guest_name}</td>
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
    </div>
  );
}
