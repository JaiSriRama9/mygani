import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { format, addMinutes, addDays, parse, isWithinInterval, startOfDay, endOfDay } from "date-fns";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("spa.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    is_vip INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    duration INTEGER NOT NULL,
    price REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS therapists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_peak INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    therapist_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    status TEXT DEFAULT 'confirmed',
    reallocated INTEGER DEFAULT 0,
    FOREIGN KEY(guest_id) REFERENCES guests(id),
    FOREIGN KEY(service_id) REFERENCES services(id),
    FOREIGN KEY(therapist_id) REFERENCES therapists(id),
    FOREIGN KEY(room_id) REFERENCES rooms(id)
  );

  CREATE TABLE IF NOT EXISTS waitlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    preferred_time TEXT NOT NULL,
    priority_score REAL DEFAULT 0,
    explanation TEXT,
    status TEXT DEFAULT 'waiting',
    FOREIGN KEY(guest_id) REFERENCES guests(id),
    FOREIGN KEY(service_id) REFERENCES services(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(guest_id) REFERENCES guests(id)
  );
`);

// Seed Data
const seedData = () => {
  const serviceCount = db.prepare("SELECT COUNT(*) as count FROM services").get() as any;
  if (serviceCount.count === 0) {
    const insertService = db.prepare("INSERT INTO services (name, duration, price) VALUES (?, ?, ?)");
    insertService.run("Swedish Massage", 60, 120);
    insertService.run("Deep Tissue Massage", 90, 150);
    insertService.run("Facial", 45, 100);
    insertService.run("Aromatherapy", 60, 130);

    const insertTherapist = db.prepare("INSERT INTO therapists (name) VALUES (?)");
    insertTherapist.run("Alice");
    insertTherapist.run("Bob");
    insertTherapist.run("Charlie");

    const insertRoom = db.prepare("INSERT INTO rooms (name) VALUES (?)");
    insertRoom.run("Serenity Room");
    insertRoom.run("Zen Suite");

    const insertGuest = db.prepare("INSERT INTO guests (name, is_vip) VALUES (?, ?)");
    insertGuest.run("John Doe", 1);
    insertGuest.run("Jane Smith", 0);
  }
};
seedData();

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.get("/api/services", (req, res) => {
    const services = db.prepare("SELECT * FROM services").all();
    res.json(services);
  });

  app.get("/api/therapists", (req, res) => {
    const therapists = db.prepare("SELECT * FROM therapists").all();
    res.json(therapists);
  });

  app.get("/api/rooms", (req, res) => {
    const rooms = db.prepare("SELECT * FROM rooms").all();
    res.json(rooms);
  });

  app.post("/api/slots/generate", (req, res) => {
    const { date } = req.body; // YYYY-MM-DD
    const startHour = 9;
    const endHour = 19;
    const interval = 30;

    // Clear existing slots for this date if needed or just return them
    // For simplicity, we generate them on the fly or store them.
    // Let's store them for the day.
    const slots = [];
    let current = parse(`${date} 09:00`, "yyyy-MM-dd HH:mm", new Date());
    const end = parse(`${date} 19:00`, "yyyy-MM-dd HH:mm", new Date());

    const insertSlot = db.prepare("INSERT INTO slots (start_time, end_time, is_peak) VALUES (?, ?, ?)");
    
    while (current < end) {
      const slotStart = format(current, "yyyy-MM-dd HH:mm");
      const slotEnd = format(addMinutes(current, interval), "yyyy-MM-dd HH:mm");
      const hour = current.getHours();
      const isPeak = (hour >= 11 && hour <= 14) || (hour >= 16 && hour <= 18) ? 1 : 0;
      
      // Check if slot already exists
      const existing = db.prepare("SELECT id FROM slots WHERE start_time = ?").get(slotStart);
      if (!existing) {
        insertSlot.run(slotStart, slotEnd, isPeak);
      }
      
      slots.push({ start_time: slotStart, end_time: slotEnd, is_peak: isPeak });
      current = addMinutes(current, interval);
    }
    res.json({ message: "Slots generated", slots });
  });

  app.get("/api/slots", (req, res) => {
    const slots = db.prepare("SELECT * FROM slots").all();
    res.json(slots);
  });

  // AI Scoring Logic
  const calculateSlotScore = (slot: any, therapistId: number, roomId: number) => {
    let score = 100;
    const explanations = [];

    if (slot.is_peak) {
      score -= 20;
      explanations.push("High demand peak time (-20)");
    } else {
      score += 10;
      explanations.push("Off-peak availability bonus (+10)");
    }

    // Mock demand level check
    const bookingsAtTime = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE start_time = ? AND status = 'confirmed'").get(slot.start_time) as any;
    if (bookingsAtTime.count > 0) {
      score -= 10 * bookingsAtTime.count;
      explanations.push(`Existing bookings at this time (-${10 * bookingsAtTime.count})`);
    }

    return { score, explanation: explanations.join(", ") };
  };

  const calculateWaitlistPriority = (guest: any, service: any, preferredTime: string) => {
    let score = 50;
    const explanations = [];

    if (guest.is_vip) {
      score += 30;
      explanations.push("VIP Guest Priority (+30)");
    }

    // Service duration match (shorter services easier to fit)
    if (service.duration <= 45) {
      score += 10;
      explanations.push("Short duration service (+10)");
    }

    return { score, explanation: explanations.join(", ") };
  };

  app.post("/api/bookings", (req, res) => {
    const { guestName, serviceId, startTime, isVip, therapistId, roomId } = req.body;

    // 1. Find or create guest
    let guest = db.prepare("SELECT * FROM guests WHERE name = ?").get(guestName) as any;
    if (!guest) {
      const result = db.prepare("INSERT INTO guests (name, is_vip) VALUES (?, ?)").run(guestName, isVip ? 1 : 0);
      guest = { id: result.lastInsertRowid, name: guestName, is_vip: isVip ? 1 : 0 };
    }

    const service = db.prepare("SELECT * FROM services WHERE id = ?").get(serviceId) as any;
    if (!service) return res.status(400).json({ success: false, message: "Service not found" });

    const start = parse(startTime, "yyyy-MM-dd HH:mm", new Date());
    const endTime = format(addMinutes(start, service.duration), "yyyy-MM-dd HH:mm");

    // 2. Check Availability
    const therapists = db.prepare("SELECT * FROM therapists").all() as any[];
    const rooms = db.prepare("SELECT * FROM rooms").all() as any[];

    const getAvailableTherapists = (time: string, duration: number) => {
      const reqStart = parse(time, "yyyy-MM-dd HH:mm", new Date());
      const reqEnd = addMinutes(reqStart, duration);

      return therapists.filter(t => {
        const conflicts = db.prepare(`
          SELECT b.*, s.duration 
          FROM bookings b 
          JOIN services s ON b.service_id = s.id 
          WHERE b.therapist_id = ? AND b.status = 'confirmed'
        `).all(t.id) as any[];

        return !conflicts.some(c => {
          const bStart = parse(c.start_time, "yyyy-MM-dd HH:mm", new Date());
          const bEnd = addMinutes(bStart, c.duration);
          return isWithinInterval(reqStart, { start: bStart, end: bEnd }) || 
                 isWithinInterval(reqEnd, { start: bStart, end: bEnd }) ||
                 (reqStart <= bStart && reqEnd >= bEnd);
        });
      });
    };

    const getAvailableRooms = (time: string, duration: number) => {
      const reqStart = parse(time, "yyyy-MM-dd HH:mm", new Date());
      const reqEnd = addMinutes(reqStart, duration);

      return rooms.filter(r => {
        const conflicts = db.prepare(`
          SELECT b.*, s.duration 
          FROM bookings b 
          JOIN services s ON b.service_id = s.id 
          WHERE b.room_id = ? AND b.status = 'confirmed'
        `).all(r.id) as any[];

        return !conflicts.some(c => {
          const bStart = parse(c.start_time, "yyyy-MM-dd HH:mm", new Date());
          const bEnd = addMinutes(bStart, c.duration);
          return isWithinInterval(reqStart, { start: bStart, end: bEnd }) || 
                 isWithinInterval(reqEnd, { start: bStart, end: bEnd }) ||
                 (reqStart <= bStart && reqEnd >= bEnd);
        });
      });
    };

    const availableTherapists = getAvailableTherapists(startTime, service.duration);
    const availableRooms = getAvailableRooms(startTime, service.duration);

    let selectedTherapist = null;
    let selectedRoom = null;

    if (therapistId) {
      selectedTherapist = availableTherapists.find(t => t.id === Number(therapistId));
    } else {
      selectedTherapist = availableTherapists[0];
    }

    if (roomId) {
      selectedRoom = availableRooms.find(r => r.id === Number(roomId));
    } else {
      selectedRoom = availableRooms[0];
    }

    if (selectedTherapist && selectedRoom) {
      const result = db.prepare("INSERT INTO bookings (guest_id, service_id, therapist_id, room_id, start_time) VALUES (?, ?, ?, ?, ?)")
        .run(guest.id, serviceId, selectedTherapist.id, selectedRoom.id, startTime);
      
      db.prepare("INSERT INTO notifications (guest_id, message, type) VALUES (?, ?, ?)")
        .run(guest.id, `Booking confirmed for ${service.name} at ${startTime}.`, "confirmation");

      return res.json({ 
        success: true, 
        bookingId: result.lastInsertRowid,
        message: "Booking confirmed!",
        details: { therapist: selectedTherapist.name, room: selectedRoom.name }
      });
    } else {
      // Find alternative times
      const alternatives = [];
      let checkTime = addMinutes(start, 30);
      const limit = addDays(start, 1);

      while (alternatives.length < 3 && checkTime < limit) {
        const timeStr = format(checkTime, "yyyy-MM-dd HH:mm");
        const freeT = getAvailableTherapists(timeStr, service.duration);
        const freeR = getAvailableRooms(timeStr, service.duration);
        
        if (freeT.length > 0 && freeR.length > 0) {
          alternatives.push({
            startTime: timeStr,
            therapist: freeT[0],
            room: freeR[0]
          });
        }
        checkTime = addMinutes(checkTime, 30);
      }

      return res.status(400).json({ 
        success: false, 
        message: "Slot unavailable for the selected combination.",
        availableTherapists,
        availableRooms,
        alternatives
      });
    }
  });

  app.get("/api/bookings", (req, res) => {
    const bookings = db.prepare(`
      SELECT b.*, g.name as guest_name, s.name as service_name, s.duration as service_duration, t.name as therapist_name, r.name as room_name
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN services s ON b.service_id = s.id
      JOIN therapists t ON b.therapist_id = t.id
      JOIN rooms r ON b.room_id = r.id
      ORDER BY b.start_time DESC
    `).all();
    res.json(bookings);
  });

  app.post("/api/bookings/:id/cancel", (req, res) => {
    const { id } = req.params;
    const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as any;
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(id);

    // AI Reallocation Logic
    const waitlist = db.prepare("SELECT w.*, g.is_vip, s.duration, s.name as service_name FROM waitlist w JOIN guests g ON w.guest_id = g.id JOIN services s ON w.service_id = s.id WHERE w.status = 'waiting'").all() as any[];
    
    // Sort waitlist by priority score
    waitlist.sort((a, b) => b.priority_score - a.priority_score);

    let reallocated = false;
    for (const entry of waitlist) {
      // Check if this guest can fit in the freed slot
      // For simplicity, we just check if the start time matches or is close
      if (entry.preferred_time === booking.start_time) {
        // Try to book
        // (Re-using booking logic would be better, but for hackathon we'll do a quick check)
        db.prepare("INSERT INTO bookings (guest_id, service_id, therapist_id, room_id, start_time, reallocated) VALUES (?, ?, ?, ?, ?, 1)")
          .run(entry.guest_id, entry.service_id, booking.therapist_id, booking.room_id, booking.start_time);
        
        db.prepare("UPDATE waitlist SET status = 'reallocated' WHERE id = ?").run(entry.id);
        
        db.prepare("INSERT INTO notifications (guest_id, message, type) VALUES (?, ?, ?)")
          .run(entry.guest_id, `Great news! A slot opened up for your ${entry.service_name} at ${booking.start_time}. You've been automatically booked.`, "reallocation");
        
        reallocated = true;
        break;
      }
    }

    res.json({ message: "Booking cancelled", reallocated });
  });

  app.post("/api/waitlist", (req, res) => {
    const { guestName, serviceId, preferredTime, isVip } = req.body;
    
    let guest = db.prepare("SELECT * FROM guests WHERE name = ?").get(guestName) as any;
    if (!guest) {
      const result = db.prepare("INSERT INTO guests (name, is_vip) VALUES (?, ?)").run(guestName, isVip ? 1 : 0);
      guest = { id: result.lastInsertRowid, name: guestName, is_vip: isVip ? 1 : 0 };
    }

    const service = db.prepare("SELECT * FROM services WHERE id = ?").get(serviceId) as any;
    const { score, explanation } = calculateWaitlistPriority(guest, service, preferredTime);

    db.prepare("INSERT INTO waitlist (guest_id, service_id, preferred_time, priority_score, explanation) VALUES (?, ?, ?, ?, ?)")
      .run(guest.id, serviceId, preferredTime, score, explanation);

    db.prepare("INSERT INTO notifications (guest_id, message, type) VALUES (?, ?, ?)")
      .run(guest.id, `You've been added to the waitlist for ${service.name}. Priority Score: ${score}.`, "waitlist");

    res.json({ message: "Added to waitlist", score, explanation });
  });

  app.get("/api/waitlist", (req, res) => {
    const waitlist = db.prepare(`
      SELECT w.*, g.name as guest_name, s.name as service_name
      FROM waitlist w
      JOIN guests g ON w.guest_id = g.id
      JOIN services s ON w.service_id = s.id
      ORDER BY w.priority_score DESC
    `).all();
    res.json(waitlist);
  });

  app.get("/api/recommendations", (req, res) => {
    const { date } = req.query;
    const slots = db.prepare("SELECT * FROM slots WHERE start_time LIKE ?").all(date + "%") as any[];
    
    const recommendations = slots.map(slot => {
      const { score, explanation } = calculateSlotScore(slot, 0, 0); // Simplified
      return { ...slot, score, explanation };
    }).sort((a, b) => b.score - a.score).slice(0, 5);

    res.json(recommendations);
  });

  app.get("/api/notifications", (req, res) => {
    const notifications = db.prepare(`
      SELECT n.*, g.name as guest_name
      FROM notifications n
      JOIN guests g ON n.guest_id = g.id
      ORDER BY n.created_at DESC
    `).all();
    res.json(notifications);
  });

  app.get("/api/dashboard", (req, res) => {
    const totalBookings = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'confirmed'").get() as any;
    const cancelledBookings = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'cancelled'").get() as any;
    const waitlisted = db.prepare("SELECT COUNT(*) as count FROM waitlist WHERE status = 'waiting'").get() as any;
    const reallocatedCount = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE reallocated = 1").get() as any;
    
    const totalSlots = db.prepare("SELECT COUNT(*) as count FROM slots").get() as any;
    const utilization = totalSlots.count > 0 ? (totalBookings.count / (totalSlots.count * 2)) * 100 : 0; // 2 rooms

    const peakDemand = db.prepare("SELECT COUNT(*) as count FROM bookings b JOIN slots s ON b.start_time = s.start_time WHERE s.is_peak = 1").get() as any;
    const offPeakDemand = db.prepare("SELECT COUNT(*) as count FROM bookings b JOIN slots s ON b.start_time = s.start_time WHERE s.is_peak = 0").get() as any;

    res.json({
      totalBookings: totalBookings.count,
      cancelledBookings: cancelledBookings.count,
      waitlisted: waitlisted.count,
      utilization: utilization.toFixed(2),
      reallocatedCount: reallocatedCount.count,
      peakDemand: peakDemand.count,
      offPeakDemand: offPeakDemand.count
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(3000, "0.0.0.0", () => {
    console.log("Server running on http://localhost:3000");
  });
}

startServer();
