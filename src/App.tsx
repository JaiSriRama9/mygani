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
import { format, addDays, startOfToday, parse } from "date-fns";
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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recommendations, setRecommendations] = useState<Slot[]>([]);
  
  const [bookingForm, setBookingForm] = useState({
    guestName: "",
    serviceId: "",
    startTime: "",
    isVip: false
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  const fetchData = async () => {
    try {
      const [srv, bks, wtl, ntf, dsh] = await Promise.all([
        fetch("/api/services").then(res => res.json()),
        fetch("/api/bookings").then(res => res.json()),
        fetch("/api/waitlist").then(res => res.json()),
        fetch("/api/notifications").then(res => res.json()),
        fetch("/api/dashboard").then(res => res.json())
      ]);
      setServices(srv);
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
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingForm)
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        setBookingForm({ guestName: "", serviceId: "", startTime: "", isVip: false });
        fetchData();
      } else {
        setMessage({ type: "error", text: data.message });
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
      setBookingForm({ guestName: "", serviceId: "", startTime: "", isVip: false });
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
