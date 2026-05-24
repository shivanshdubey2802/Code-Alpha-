import { useState, useEffect } from "react";

// ═══════════════════════════════════════════
//  OOP CORE CLASSES
// ═══════════════════════════════════════════

class Room {
  constructor(id, number, category, price, floor, amenities, maxGuests, description) {
    this.id = id;
    this.number = number;
    this.category = category; // Standard | Deluxe | Suite | Presidential
    this.price = price; // per night
    this.floor = floor;
    this.amenities = amenities;
    this.maxGuests = maxGuests;
    this.description = description;
    this.available = true;
  }

  isAvailableFor(checkIn, checkOut, bookings) {
    const ci = new Date(checkIn), co = new Date(checkOut);
    return !bookings.some(b =>
      b.roomId === this.id &&
      b.status !== "Cancelled" &&
      new Date(b.checkIn) < co &&
      new Date(b.checkOut) > ci
    );
  }

  getNights(checkIn, checkOut) {
    return Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000));
  }

  getTotal(checkIn, checkOut) {
    return this.getNights(checkIn, checkOut) * this.price;
  }
}

class Guest {
  constructor(name, email, phone) {
    this.id = `g-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    this.name = name;
    this.email = email;
    this.phone = phone;
  }
}

class Payment {
  constructor(amount, method, cardLast4 = null) {
    this.id = `pay-${Date.now()}`;
    this.amount = amount;
    this.method = method; // Credit Card | Debit Card | UPI | Cash
    this.cardLast4 = cardLast4;
    this.status = "Completed";
    this.timestamp = new Date().toISOString();
  }

  getReceipt() {
    return {
      id: this.id,
      amount: this.amount,
      method: this.method,
      status: this.status,
      paidAt: new Date(this.timestamp).toLocaleString(),
    };
  }
}

class Booking {
  constructor(roomId, roomNumber, category, guest, checkIn, checkOut, guests, payment, totalAmount) {
    this.id = `BKG-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    this.roomId = roomId;
    this.roomNumber = roomNumber;
    this.category = category;
    this.guest = guest;
    this.checkIn = checkIn;
    this.checkOut = checkOut;
    this.guests = guests;
    this.payment = payment;
    this.totalAmount = totalAmount;
    this.status = "Confirmed"; // Confirmed | Cancelled | Checked-In | Checked-Out
    this.createdAt = new Date().toISOString();
  }

  cancel() {
    if (this.status === "Confirmed" || this.status === "Checked-In") {
      this.status = "Cancelled";
      return true;
    }
    return false;
  }

  checkIn_() {
    if (this.status === "Confirmed") { this.status = "Checked-In"; return true; }
    return false;
  }

  checkOut_() {
    if (this.status === "Checked-In") { this.status = "Checked-Out"; return true; }
    return false;
  }

  getNights() {
    return Math.max(1, Math.round((new Date(this.checkOut) - new Date(this.checkIn)) / 86400000));
  }
}

// ═══════════════════════════════════════════
//  HOTEL DATA
// ═══════════════════════════════════════════

const ROOMS_DATA = [
  new Room("r1","101","Standard",3500,1,["WiFi","TV","AC","Hot Water"],2,"Cozy room with garden view and all modern comforts."),
  new Room("r2","102","Standard",3500,1,["WiFi","TV","AC","Hot Water"],2,"Bright room with city view, perfect for solo travellers."),
  new Room("r3","201","Deluxe",6500,2,["WiFi","TV","AC","Mini Bar","Balcony","King Bed"],2,"Spacious deluxe room with private balcony and city panorama."),
  new Room("r4","202","Deluxe",6500,2,["WiFi","TV","AC","Mini Bar","Balcony","King Bed"],3,"Corner deluxe room with dual balcony and extra space."),
  new Room("r5","203","Deluxe",7500,2,["WiFi","TV","AC","Mini Bar","Sea View","Jacuzzi"],2,"Premium deluxe with sea-facing view and in-room jacuzzi."),
  new Room("r6","301","Suite",14000,3,["WiFi","55\" TV","AC","Mini Bar","Living Room","King Bed","Jacuzzi","Butler"],3,"Elegant suite with separate living area and premium amenities."),
  new Room("r7","302","Suite",14000,3,["WiFi","55\" TV","AC","Bar","Dining Area","King Bed","Steam Room"],4,"Family suite with dining area and private steam room."),
  new Room("r8","401","Presidential",35000,4,["WiFi","75\" TV","AC","Full Bar","2 Bedrooms","Private Pool","Chef","Limo"],6,"The crown jewel — 2-bedroom presidential suite with private pool."),
];

const CATEGORY_CONFIG = {
  Standard:      { color: "#8B7355", bg: "#FDF6EE", icon: "🛏", gradient: "from-amber-50 to-orange-50" },
  Deluxe:        { color: "#2C5F8A", bg: "#EEF4FD", icon: "✨", gradient: "from-blue-50 to-sky-50" },
  Suite:         { color: "#6B3FA0", bg: "#F5EEFF", icon: "👑", gradient: "from-purple-50 to-violet-50" },
  Presidential:  { color: "#8B1A1A", bg: "#FFF0F0", icon: "🏆", gradient: "from-red-50 to-rose-50" },
};

const STORAGE_KEY = "hotel_res_v2";

const fmt = (n) => `₹${n.toLocaleString("en-IN")}`;
const today = () => new Date().toISOString().split("T")[0];
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().split("T")[0]; };

// ═══════════════════════════════════════════
//  COMPONENTS
// ═══════════════════════════════════════════

function Badge({ status }) {
  const map = {
    Confirmed:   { bg: "#DCFCE7", color: "#166534" },
    "Checked-In":{ bg: "#DBEAFE", color: "#1e40af" },
    "Checked-Out":{ bg: "#F3F4F6", color: "#374151" },
    Cancelled:   { bg: "#FEE2E2", color: "#991B1B" },
  };
  const s = map[status] || map.Confirmed;
  return <span style={{ background: s.bg, color: s.color, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>{status}</span>;
}

function StarRating({ category }) {
  const stars = { Standard: 3, Deluxe: 4, Suite: 5, Presidential: 5 }[category] || 3;
  return <span style={{ color: "#D4AF37", fontSize: 12 }}>{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span>;
}

// ═══════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════

export default function App() {
  const [bookings, setBookings] = useState([]);
  const [view, setView] = useState("home"); // home | search | book | mybookings | detail | payment | confirm
  const [searchParams, setSearchParams] = useState({ checkIn: today(), checkOut: tomorrow(), guests: 1, category: "All" });
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [bookingForm, setBookingForm] = useState({ name: "", email: "", phone: "", guests: 1, specialReq: "" });
  const [paymentForm, setPaymentForm] = useState({ method: "Credit Card", cardNumber: "", expiry: "", cvv: "", upiId: "" });
  const [currentBooking, setCurrentBooking] = useState(null);
  const [detailBooking, setDetailBooking] = useState(null);
  const [msg, setMsg] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setBookings(JSON.parse(saved));
    } catch {}
  }, []);

  const save = (b) => { setBookings(b); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(b)); } catch {} };

  const searchRooms = () => {
    const { checkIn, checkOut, guests, category } = searchParams;
    if (!checkIn || !checkOut || new Date(checkOut) <= new Date(checkIn)) {
      setMsg({ type: "error", text: "Please select valid check-in and check-out dates." }); return;
    }
    const results = ROOMS_DATA.filter(r =>
      r.maxGuests >= guests &&
      (category === "All" || r.category === category) &&
      r.isAvailableFor(checkIn, checkOut, bookings)
    );
    setFilteredRooms(results);
    setView("search");
    setMsg(null);
  };

  const startBooking = (room) => {
    setSelectedRoom(room);
    setBookingForm({ name: "", email: "", phone: "", guests: searchParams.guests, specialReq: "" });
    setView("book");
  };

  const proceedToPayment = () => {
    const { name, email, phone } = bookingForm;
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setMsg({ type: "error", text: "Please fill all required fields." }); return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setMsg({ type: "error", text: "Invalid email address." }); return;
    }
    setMsg(null);
    setView("payment");
  };

  const confirmPayment = () => {
    const { method, cardNumber, expiry, cvv, upiId } = paymentForm;
    if (method !== "Cash" && method !== "UPI" && (!cardNumber || cardNumber.replace(/\s/g,"").length < 16)) {
      setMsg({ type: "error", text: "Enter valid 16-digit card number." }); return;
    }
    if (method === "UPI" && !upiId.includes("@")) {
      setMsg({ type: "error", text: "Enter valid UPI ID (e.g. name@upi)." }); return;
    }

    const guest = new Guest(bookingForm.name, bookingForm.email, bookingForm.phone);
    const total = selectedRoom.getTotal(searchParams.checkIn, searchParams.checkOut);
    const payment = new Payment(total, method, method !== "Cash" && method !== "UPI" ? cardNumber.slice(-4) : null);
    const booking = new Booking(
      selectedRoom.id, selectedRoom.number, selectedRoom.category,
      guest, searchParams.checkIn, searchParams.checkOut,
      bookingForm.guests, payment.getReceipt(), total
    );

    const updated = [...bookings, booking];
    save(updated);
    setCurrentBooking(booking);
    setMsg(null);
    setView("confirm");
  };

  const cancelBooking = (id) => {
    const updated = bookings.map(b => {
      if (b.id === id) { const nb = { ...b }; nb.status = "Cancelled"; return nb; }
      return b;
    });
    save(updated);
    if (detailBooking?.id === id) setDetailBooking({ ...detailBooking, status: "Cancelled" });
  };

  const updateStatus = (id, newStatus) => {
    const updated = bookings.map(b => b.id === id ? { ...b, status: newStatus } : b);
    save(updated);
    if (detailBooking?.id === id) setDetailBooking({ ...detailBooking, status: newStatus });
  };

  const filteredBookings = bookings.filter(b => filterStatus === "All" || b.status === filterStatus);

  // ── STYLES ──
  const C = {
    gold: "#C9A84C",
    dark: "#1A1008",
    cream: "#FDF8F0",
    text: "#2D1B00",
    muted: "#8B7355",
    border: "#E8DCC8",
    white: "#FFFFFF",
  };

  const card = { background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" };
  const input = { width: "100%", padding: "11px 14px", border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 14, color: C.text, background: "#FEFCF8", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
  const btnGold = { background: `linear-gradient(135deg, #C9A84C, #A8872A)`, color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: 0.5, fontFamily: "inherit" };
  const btnOutline = { background: "transparent", color: C.gold, border: `1.5px solid ${C.gold}`, borderRadius: 10, padding: "10px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };

  // ══════════════════════════════
  //  VIEWS
  // ══════════════════════════════

  // HOME
  if (view === "home") return (
    <div style={{ minHeight: "100vh", background: C.cream, fontFamily: "'Cormorant Garamond', 'Georgia', serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Jost:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; }`}</style>

      {/* Header */}
      <header style={{ background: C.dark, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <div style={{ color: C.gold, fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>🏨 GRAND VELOUR</div>
        <nav style={{ display: "flex", gap: 24 }}>
          {[["My Bookings", "mybookings"]].map(([l,v]) => (
            <button key={v} onClick={() => setView(v)} style={{ background: "none", border: "none", color: "#D4B896", fontSize: 13, cursor: "pointer", fontFamily: "'Jost'", letterSpacing: 1 }}>{l}</button>
          ))}
        </nav>
      </header>

      {/* Hero */}
      <div style={{ background: `linear-gradient(160deg, #1A1008 0%, #3D2B1A 50%, #1A1008 100%)`, padding: "64px 32px 56px", textAlign: "center" }}>
        <div style={{ color: C.gold, fontSize: 12, letterSpacing: 4, fontFamily: "'Jost'", marginBottom: 16 }}>LUXURY HOSPITALITY SINCE 1952</div>
        <h1 style={{ color: "#FDF8F0", fontSize: 48, fontWeight: 300, margin: "0 0 12px", lineHeight: 1.1 }}>Where Every Stay<br />Becomes a Memory</h1>
        <p style={{ color: "#A89070", fontSize: 16, fontWeight: 300, margin: "0 0 40px" }}>Grand Velour Hotel — Indore's Finest Address</p>

        {/* Search Box */}
        <div style={{ background: C.white, borderRadius: 16, padding: "28px 32px", maxWidth: 820, margin: "0 auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          {msg && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13, fontFamily: "'Jost'" }}>{msg.text}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 140px", gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: "'Jost'", letterSpacing: 1, marginBottom: 6 }}>CHECK-IN</div>
              <input type="date" min={today()} value={searchParams.checkIn} onChange={e => setSearchParams(p => ({...p, checkIn: e.target.value}))} style={input} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: "'Jost'", letterSpacing: 1, marginBottom: 6 }}>CHECK-OUT</div>
              <input type="date" min={searchParams.checkIn || today()} value={searchParams.checkOut} onChange={e => setSearchParams(p => ({...p, checkOut: e.target.value}))} style={input} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: "'Jost'", letterSpacing: 1, marginBottom: 6 }}>GUESTS</div>
              <select value={searchParams.guests} onChange={e => setSearchParams(p => ({...p, guests: +e.target.value}))} style={input}>
                {[1,2,3,4,5,6].map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: "'Jost'", letterSpacing: 1, marginBottom: 6 }}>ROOM TYPE</div>
              <select value={searchParams.category} onChange={e => setSearchParams(p => ({...p, category: e.target.value}))} style={input}>
                {["All","Standard","Deluxe","Suite","Presidential"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <button onClick={searchRooms} style={{ ...btnGold, width: "100%", padding: "14px", fontSize: 15, letterSpacing: 2 }}>SEARCH AVAILABLE ROOMS</button>
        </div>
      </div>

      {/* Room Categories */}
      <div style={{ padding: "56px 32px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ color: C.gold, fontSize: 11, letterSpacing: 4, fontFamily: "'Jost'" }}>OUR ACCOMMODATIONS</div>
          <h2 style={{ fontSize: 36, fontWeight: 400, color: C.text, margin: "8px 0 0" }}>Room Categories</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {Object.entries(CATEGORY_CONFIG).map(([cat, cfg]) => {
            const rooms = ROOMS_DATA.filter(r => r.category === cat);
            const minPrice = Math.min(...rooms.map(r => r.price));
            return (
              <div key={cat} onClick={() => { setSearchParams(p => ({...p, category: cat})); searchRooms(); }}
                style={{ ...card, cursor: "pointer", padding: "28px 24px", textAlign: "center", transition: "transform 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{cfg.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 4 }}>{cat}</div>
                <StarRating category={cat} />
                <div style={{ color: C.muted, fontSize: 13, fontFamily: "'Jost'", margin: "8px 0 4px" }}>From</div>
                <div style={{ color: cfg.color, fontSize: 22, fontWeight: 700, fontFamily: "'Jost'" }}>{fmt(minPrice)}<span style={{ fontSize: 12, fontWeight: 400 }}>/night</span></div>
                <div style={{ color: C.muted, fontSize: 12, fontFamily: "'Jost'", marginTop: 6 }}>{rooms.length} rooms available</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div style={{ background: C.dark, padding: "40px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", maxWidth: 800, margin: "0 auto", gap: 0 }}>
          {[["8","Room Types"],["24/7","Concierge"],["4.9★","Guest Rating"],["1952","Est. Year"]].map(([n,l]) => (
            <div key={l} style={{ textAlign: "center", borderRight: "1px solid #3D2B1A" }}>
              <div style={{ color: C.gold, fontSize: 32, fontWeight: 600 }}>{n}</div>
              <div style={{ color: "#A89070", fontSize: 12, fontFamily: "'Jost'", letterSpacing: 1 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // SEARCH RESULTS
  if (view === "search") return (
    <div style={{ minHeight: "100vh", background: C.cream, fontFamily: "'Jost', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Jost:wght@300;400;500;600&display=swap');`}</style>
      <header style={{ background: C.dark, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <button onClick={() => setView("home")} style={{ color: C.gold, background: "none", border: "none", cursor: "pointer", fontSize: 14, letterSpacing: 1 }}>← GRAND VELOUR</button>
        <button onClick={() => setView("mybookings")} style={{ color: "#D4B896", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>My Bookings</button>
      </header>

      <div style={{ padding: "32px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond'", fontSize: 30, color: C.text, margin: "0 0 6px" }}>
            {filteredRooms.length} Room{filteredRooms.length !== 1 ? "s" : ""} Available
          </h2>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
            {new Date(searchParams.checkIn).toDateString()} → {new Date(searchParams.checkOut).toDateString()} · {searchParams.guests} Guest{searchParams.guests > 1 ? "s" : ""}
          </p>
        </div>

        {filteredRooms.length === 0 ? (
          <div style={{ ...card, padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <h3 style={{ fontFamily: "'Cormorant Garamond'", fontSize: 24, color: C.text }}>No rooms available</h3>
            <p style={{ color: C.muted }}>Try different dates or fewer guests.</p>
            <button onClick={() => setView("home")} style={btnGold}>Modify Search</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
            {filteredRooms.map(room => {
              const cfg = CATEGORY_CONFIG[room.category];
              const nights = room.getNights(searchParams.checkIn, searchParams.checkOut);
              return (
                <div key={room.id} style={{ ...card, transition: "transform 0.2s, box-shadow 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow="0 8px 32px rgba(0,0,0,0.12)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.06)"; }}>
                  {/* Room Header */}
                  <div style={{ background: cfg.bg, padding: "24px 24px 20px", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 11, color: cfg.color, letterSpacing: 2, fontWeight: 600, marginBottom: 4 }}>{room.category.toUpperCase()}</div>
                        <div style={{ fontFamily: "'Cormorant Garamond'", fontSize: 22, fontWeight: 600, color: C.text }}>Room {room.number}</div>
                        <StarRating category={room.category} />
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: cfg.color }}>{fmt(room.price)}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>per night</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: "20px 24px" }}>
                    <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.6, margin: "0 0 16px" }}>{room.description}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                      {room.amenities.slice(0,5).map(a => (
                        <span key={a} style={{ background: "#F5F0E8", color: C.muted, padding: "3px 10px", borderRadius: 20, fontSize: 11 }}>{a}</span>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                      <div>
                        <div style={{ fontSize: 12, color: C.muted }}>Floor {room.floor} · Up to {room.maxGuests} guests</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginTop: 2 }}>{fmt(room.getTotal(searchParams.checkIn, searchParams.checkOut))} <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>for {nights} night{nights>1?"s":""}</span></div>
                      </div>
                      <button onClick={() => startBooking(room)} style={btnGold}>Book Now</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // BOOKING FORM
  if (view === "book" && selectedRoom) {
    const nights = selectedRoom.getNights(searchParams.checkIn, searchParams.checkOut);
    const total = selectedRoom.getTotal(searchParams.checkIn, searchParams.checkOut);
    const cfg = CATEGORY_CONFIG[selectedRoom.category];
    return (
      <div style={{ minHeight: "100vh", background: C.cream, fontFamily: "'Jost', sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Jost:wght@400;500;600&display=swap');`}</style>
        <header style={{ background: C.dark, padding: "0 32px", display: "flex", alignItems: "center", height: 56 }}>
          <button onClick={() => setView("search")} style={{ color: C.gold, background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>← Back to Results</button>
        </header>
        <div style={{ padding: "32px", maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond'", fontSize: 32, color: C.text, marginBottom: 24 }}>Guest Details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24 }}>
            {/* Form */}
            <div style={card}>
              <div style={{ padding: "24px 28px" }}>
                {msg && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{msg.text}</div>}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {[["Full Name *","name","text"],["Email Address *","email","email"],["Phone Number *","phone","tel"]].map(([l,k,t]) => (
                    <div key={k} style={{ gridColumn: k === "name" ? "1/-1" : "auto" }}>
                      <label style={{ fontSize: 11, color: C.muted, letterSpacing: 1, display: "block", marginBottom: 6 }}>{l.toUpperCase()}</label>
                      <input type={t} value={bookingForm[k]} onChange={e => setBookingForm(p => ({...p, [k]: e.target.value}))} style={input} placeholder={l.replace(" *","")} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 11, color: C.muted, letterSpacing: 1, display: "block", marginBottom: 6 }}>GUESTS</label>
                    <select value={bookingForm.guests} onChange={e => setBookingForm(p => ({...p, guests: +e.target.value}))} style={input}>
                      {Array.from({length: selectedRoom.maxGuests}, (_,i) => i+1).map(n => <option key={n}>{n}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={{ fontSize: 11, color: C.muted, letterSpacing: 1, display: "block", marginBottom: 6 }}>SPECIAL REQUESTS</label>
                    <textarea value={bookingForm.specialReq} onChange={e => setBookingForm(p => ({...p, specialReq: e.target.value}))} style={{ ...input, height: 80, resize: "vertical" }} placeholder="Early check-in, dietary needs, etc." />
                  </div>
                </div>
                <button onClick={proceedToPayment} style={{ ...btnGold, width: "100%", marginTop: 20, padding: "14px" }}>PROCEED TO PAYMENT</button>
              </div>
            </div>

            {/* Summary */}
            <div>
              <div style={{ ...card, padding: "24px" }}>
                <div style={{ background: cfg.bg, borderRadius: 10, padding: "16px", marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: cfg.color, letterSpacing: 2, fontWeight: 600 }}>{selectedRoom.category.toUpperCase()}</div>
                  <div style={{ fontFamily: "'Cormorant Garamond'", fontSize: 22, fontWeight: 600, color: C.text }}>Room {selectedRoom.number}</div>
                  <StarRating category={selectedRoom.category} />
                </div>
                {[
                  ["Check-in", new Date(searchParams.checkIn).toDateString()],
                  ["Check-out", new Date(searchParams.checkOut).toDateString()],
                  ["Duration", `${nights} night${nights>1?"s":""}`],
                  ["Floor", `Floor ${selectedRoom.floor}`],
                ].map(([l,v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 14 }}>
                    <span style={{ color: C.muted }}>{l}</span>
                    <span style={{ color: C.text, fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0 0", fontSize: 16 }}>
                  <span style={{ fontWeight: 700, color: C.text }}>Total</span>
                  <span style={{ fontWeight: 700, color: C.gold, fontSize: 20 }}>{fmt(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PAYMENT
  if (view === "payment" && selectedRoom) {
    const total = selectedRoom.getTotal(searchParams.checkIn, searchParams.checkOut);
    return (
      <div style={{ minHeight: "100vh", background: C.cream, fontFamily: "'Jost', sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Jost:wght@400;500;600&display=swap');`}</style>
        <header style={{ background: C.dark, padding: "0 32px", display: "flex", alignItems: "center", height: 56 }}>
          <button onClick={() => setView("book")} style={{ color: C.gold, background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>← Back to Guest Details</button>
        </header>
        <div style={{ padding: "32px", maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond'", fontSize: 32, color: C.text, marginBottom: 8 }}>Secure Payment</h2>
          <p style={{ color: C.muted, marginBottom: 24, fontSize: 13 }}>🔒 Your payment details are simulated and secure.</p>
          <div style={card}>
            <div style={{ padding: "24px 28px" }}>
              {msg && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{msg.text}</div>}

              {/* Payment Method */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: C.muted, letterSpacing: 1, display: "block", marginBottom: 10 }}>PAYMENT METHOD</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                  {["Credit Card","Debit Card","UPI","Cash"].map(m => (
                    <button key={m} onClick={() => setPaymentForm(p => ({...p, method: m}))}
                      style={{ padding: "10px 8px", borderRadius: 8, border: `2px solid ${paymentForm.method === m ? C.gold : C.border}`, background: paymentForm.method === m ? "#FDF3DC" : C.white, color: paymentForm.method === m ? C.gold : C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      {m === "Credit Card" ? "💳 Credit" : m === "Debit Card" ? "🏦 Debit" : m === "UPI" ? "📱 UPI" : "💵 Cash"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Fields */}
              {(paymentForm.method === "Credit Card" || paymentForm.method === "Debit Card") && (
                <div style={{ display: "grid", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 11, color: C.muted, letterSpacing: 1, display: "block", marginBottom: 6 }}>CARD NUMBER</label>
                    <input value={paymentForm.cardNumber} onChange={e => setPaymentForm(p => ({...p, cardNumber: e.target.value.replace(/\D/g,"").replace(/(.{4})/g,"$1 ").trim().slice(0,19)}))}
                      placeholder="1234 5678 9012 3456" style={input} maxLength={19} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <label style={{ fontSize: 11, color: C.muted, letterSpacing: 1, display: "block", marginBottom: 6 }}>EXPIRY DATE</label>
                      <input value={paymentForm.expiry} onChange={e => setPaymentForm(p => ({...p, expiry: e.target.value}))} placeholder="MM/YY" style={input} maxLength={5} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: C.muted, letterSpacing: 1, display: "block", marginBottom: 6 }}>CVV</label>
                      <input type="password" value={paymentForm.cvv} onChange={e => setPaymentForm(p => ({...p, cvv: e.target.value}))} placeholder="•••" style={input} maxLength={3} />
                    </div>
                  </div>
                </div>
              )}

              {paymentForm.method === "UPI" && (
                <div>
                  <label style={{ fontSize: 11, color: C.muted, letterSpacing: 1, display: "block", marginBottom: 6 }}>UPI ID</label>
                  <input value={paymentForm.upiId} onChange={e => setPaymentForm(p => ({...p, upiId: e.target.value}))} placeholder="yourname@upi" style={input} />
                </div>
              )}

              {paymentForm.method === "Cash" && (
                <div style={{ background: "#FFF9EC", border: "1px solid #E8D5A0", borderRadius: 10, padding: "16px", fontSize: 14, color: C.muted }}>
                  💵 Please pay at the front desk upon check-in. Booking will be held for 24 hours.
                </div>
              )}

              {/* Total + Confirm */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize: 12, color: C.muted }}>Total Amount</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: C.gold }}>{fmt(total)}</div>
                </div>
                <button onClick={confirmPayment} style={{ ...btnGold, padding: "14px 32px", fontSize: 15 }}>CONFIRM & PAY</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // BOOKING CONFIRMATION
  if (view === "confirm" && currentBooking) return (
    <div style={{ minHeight: "100vh", background: C.cream, fontFamily: "'Jost', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Jost:wght@400;500;600&display=swap');`}</style>
      <div style={{ ...card, maxWidth: 540, width: "100%", overflow: "visible" }}>
        <div style={{ background: `linear-gradient(135deg, #C9A84C, #A8872A)`, padding: "32px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond'", color: "#fff", fontSize: 28, margin: "0 0 6px" }}>Booking Confirmed!</h2>
          <div style={{ color: "#FFE8A0", fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>{currentBooking.id}</div>
        </div>
        <div style={{ padding: "28px 32px" }}>
          {[
            ["Guest", currentBooking.guest.name],
            ["Room", `${currentBooking.category} — Room ${currentBooking.roomNumber}`],
            ["Check-in", new Date(currentBooking.checkIn).toDateString()],
            ["Check-out", new Date(currentBooking.checkOut).toDateString()],
            ["Duration", `${currentBooking.getNights()} nights`],
            ["Payment", `${currentBooking.payment.method}${currentBooking.payment.cardLast4 ? ` ····${currentBooking.payment.cardLast4}` : ""}`],
            ["Amount Paid", fmt(currentBooking.totalAmount)],
          ].map(([l,v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${C.border}`, fontSize: 14 }}>
              <span style={{ color: C.muted }}>{l}</span>
              <span style={{ color: C.text, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button onClick={() => { setDetailBooking(currentBooking); setView("detail"); }} style={{ ...btnOutline, flex: 1 }}>View Details</button>
            <button onClick={() => { setView("home"); setMsg(null); }} style={{ ...btnGold, flex: 1 }}>Back to Home</button>
          </div>
        </div>
      </div>
    </div>
  );

  // MY BOOKINGS
  if (view === "mybookings") return (
    <div style={{ minHeight: "100vh", background: C.cream, fontFamily: "'Jost', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Jost:wght@400;500;600&display=swap');`}</style>
      <header style={{ background: C.dark, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <button onClick={() => setView("home")} style={{ color: C.gold, background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>← GRAND VELOUR</button>
      </header>
      <div style={{ padding: "32px", maxWidth: 960, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond'", fontSize: 32, color: C.text, marginBottom: 20 }}>My Reservations</h2>

        {/* Filter */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          {["All","Confirmed","Checked-In","Checked-Out","Cancelled"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{ ...filterStatus === s ? btnGold : btnOutline, padding: "7px 16px", fontSize: 12 }}>{s}</button>
          ))}
        </div>

        {filteredBookings.length === 0 ? (
          <div style={{ ...card, padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <h3 style={{ fontFamily: "'Cormorant Garamond'", fontSize: 24, color: C.text }}>No reservations found</h3>
            <button onClick={() => setView("home")} style={{ ...btnGold, marginTop: 16 }}>Make a Reservation</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {filteredBookings.slice().reverse().map(b => (
              <div key={b.id} style={{ ...card, padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                      <span style={{ fontFamily: "'Cormorant Garamond'", fontSize: 18, fontWeight: 600, color: C.text }}>Room {b.roomNumber} — {b.category}</span>
                      <Badge status={b.status} />
                    </div>
                    <div style={{ display: "flex", gap: 24, fontSize: 13, color: C.muted }}>
                      <span>👤 {b.guest.name}</span>
                      <span>📅 {new Date(b.checkIn).toLocaleDateString()} → {new Date(b.checkOut).toLocaleDateString()}</span>
                      <span>🌙 {b.getNights()} nights</span>
                      <span style={{ color: C.gold, fontWeight: 600 }}>{fmt(b.totalAmount)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Booking ID: {b.id}</div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {b.status === "Confirmed" && (
                      <>
                        <button onClick={() => updateStatus(b.id, "Checked-In")} style={{ ...btnOutline, padding: "6px 14px", fontSize: 12, color: "#166534", borderColor: "#166534" }}>Check In</button>
                        <button onClick={() => cancelBooking(b.id)} style={{ ...btnOutline, padding: "6px 14px", fontSize: 12, color: "#991B1B", borderColor: "#991B1B" }}>Cancel</button>
                      </>
                    )}
                    {b.status === "Checked-In" && (
                      <button onClick={() => updateStatus(b.id, "Checked-Out")} style={{ ...btnOutline, padding: "6px 14px", fontSize: 12 }}>Check Out</button>
                    )}
                    <button onClick={() => { setDetailBooking(b); setView("detail"); }} style={{ ...btnGold, padding: "8px 18px", fontSize: 12 }}>View</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // BOOKING DETAIL
  if (view === "detail" && detailBooking) {
    const b = detailBooking;
    const cfg = CATEGORY_CONFIG[b.category] || CATEGORY_CONFIG.Standard;
    return (
      <div style={{ minHeight: "100vh", background: C.cream, fontFamily: "'Jost', sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Jost:wght@400;500;600&display=swap');`}</style>
        <header style={{ background: C.dark, padding: "0 32px", display: "flex", alignItems: "center", height: 56 }}>
          <button onClick={() => setView("mybookings")} style={{ color: C.gold, background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>← My Bookings</button>
        </header>
        <div style={{ padding: "32px", maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond'", fontSize: 32, color: C.text, margin: 0 }}>Booking Details</h2>
            <Badge status={b.status} />
          </div>

          {/* Booking Card */}
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ background: cfg.bg, padding: "20px 24px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 11, color: cfg.color, letterSpacing: 2, fontWeight: 600 }}>{b.category.toUpperCase()}</div>
                  <div style={{ fontFamily: "'Cormorant Garamond'", fontSize: 24, fontWeight: 600, color: C.text }}>Room {b.roomNumber}</div>
                  <StarRating category={b.category} />
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: C.gold }}>{fmt(b.totalAmount)}</div>
              </div>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 32px" }}>
                {[
                  ["Booking ID", b.id],
                  ["Status", b.status],
                  ["Guest Name", b.guest.name],
                  ["Email", b.guest.email],
                  ["Phone", b.guest.phone],
                  ["Guests", b.guests],
                  ["Check-in", new Date(b.checkIn).toDateString()],
                  ["Check-out", new Date(b.checkOut).toDateString()],
                  ["Duration", `${b.getNights()} nights`],
                  ["Booked On", new Date(b.createdAt).toLocaleString()],
                ].map(([l,v]) => (
                  <div key={l} style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
                    <div style={{ fontSize: 11, color: C.muted, letterSpacing: 0.5, marginBottom: 2 }}>{l.toUpperCase()}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Receipt */}
          <div style={{ ...card, marginBottom: 20 }}>
            <div style={{ padding: "20px 24px" }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond'", fontSize: 20, color: C.text, margin: "0 0 16px" }}>Payment Receipt</h3>
              {[
                ["Payment ID", b.payment.id],
                ["Method", `${b.payment.method}${b.payment.cardLast4 ? ` ····${b.payment.cardLast4}` : ""}`],
                ["Status", b.payment.status],
                ["Amount", fmt(b.payment.amount)],
                ["Paid At", b.payment.paidAt],
              ].map(([l,v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 14 }}>
                  <span style={{ color: C.muted }}>{l}</span>
                  <span style={{ color: l === "Amount" ? C.gold : C.text, fontWeight: l === "Amount" ? 700 : 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12 }}>
            {b.status === "Confirmed" && (
              <>
                <button onClick={() => updateStatus(b.id, "Checked-In")} style={{ ...btnOutline, flex: 1, color: "#166534", borderColor: "#166534" }}>Check In</button>
                <button onClick={() => cancelBooking(b.id)} style={{ ...btnOutline, flex: 1, color: "#991B1B", borderColor: "#991B1B" }}>Cancel Booking</button>
              </>
            )}
            {b.status === "Checked-In" && (
              <button onClick={() => updateStatus(b.id, "Checked-Out")} style={{ ...btnOutline, flex: 1 }}>Check Out</button>
            )}
            <button onClick={() => setView("home")} style={{ ...btnGold, flex: 1 }}>Back to Home</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
