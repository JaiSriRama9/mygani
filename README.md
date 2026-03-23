# SmartSpa AI – Intelligent Spa Slot Allocation and Waitlist Optimization

## Architecture Overview
SmartSpa AI is a full-stack prototype designed for resort operations. It uses a **Node.js/Express** backend with **SQLite** for data persistence and a **React** frontend for the dashboard.

### Core Components:
- **Backend (server.ts)**: Handles API requests, database management, and AI scoring logic.
- **Database (spa.db)**: SQLite database storing guests, services, therapists, rooms, slots, bookings, waitlists, and notifications.
- **AI Scoring Engine**: 
  - **Slot Recommendation Score**: Evaluates slots based on peak/off-peak status, current demand, and availability.
  - **Waitlist Priority Score**: Ranks waitlisted guests based on VIP status, service duration, and flexibility.
- **Notification Engine**: Generates context-aware messages for booking confirmations, waitlist updates, and automatic reallocations.
- **Frontend (App.tsx)**: A modern, responsive dashboard built with Tailwind CSS and Motion for a premium feel.

## AI Usage & Explainability
The system implements an **Explainable Scoring Engine**. Instead of a black-box model, it uses transparent heuristics to assign scores. Every recommendation or waitlist priority comes with a human-readable explanation (e.g., "VIP Guest Priority (+30)", "Off-peak availability bonus (+10)").

## Demo Flow & Scenarios
1. **Initial Setup**: Click "Generate Daily Slots" to populate the system with optimized time slots for the day.
2. **Booking Scenario**:
   - Try booking a service for a guest.
   - If the slot is available, you'll see a confirmation and a notification.
3. **Waitlist Scenario**:
   - Attempt to book a slot that is already full (e.g., by booking multiple guests at the same time).
   - The system will suggest joining the waitlist.
   - Join the waitlist to see the AI calculate a priority score.
4. **Cancellation & Reallocation**:
   - Cancel an existing booking.
   - The AI engine automatically scans the waitlist for the best-fit guest.
   - If a match is found, the guest is automatically reallocated, and a "Reallocation" notification is sent.

## Running Locally
1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Start Development Server**:
   ```bash
   npm run dev
   ```
3. **Access the App**: Open `http://localhost:3000` in your browser.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS 4, Lucide React, Motion.
- **Backend**: Node.js, Express, tsx.
- **Database**: SQLite (better-sqlite3).
- **Utilities**: date-fns for time manipulation.
