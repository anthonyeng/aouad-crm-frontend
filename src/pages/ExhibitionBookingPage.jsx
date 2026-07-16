import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import logo from "../assets/logo_real_state_gold.png";
import "./ExhibitionBookingPage.css";
import { fbTrack } from "../lib/fbpixel.js";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function formatDate(ymd) {
  if (!ymd) return "";
  const d = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ExhibitionBookingPage() {
  const { slug } = useParams();

  const [loading, setLoading] = useState(true);
  const [exhibition, setExhibition] = useState(null);
  const [slotCounts, setSlotCounts] = useState({});
  const [notFound, setNotFound] = useState(false);

  // form state
  const [step, setStep] = useState(1); // 1=day, 2=time, 3=info
  const [day, setDay] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/public/exhibitions/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data) => {
        setExhibition(data.exhibition);
        setSlotCounts(data.slotCounts || {});
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  function isSlotFull(d, slot) {
    const key = `${d}|${slot}`;
    return (slotCounts[key] || 0) >= (exhibition?.maxPerSlot || 5);
  }

  function handleDaySelect(d) {
    setDay(d);
    setTimeSlot("");
    setStep(2);
  }

  function handleSlotSelect(slot) {
    setTimeSlot(slot);
    setStep(3);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/public/exhibitions/${slug}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day, timeSlot, name: name.trim(), phone: phone.trim(), email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");

      fbTrack("Schedule", {
        content_name: "Exhibition Booking",
        content_category: exhibition?.title || slug,
      });
      fbTrack("Lead", { content_name: "Exhibition Booking" });

      setSuccess({
        name: name.trim(),
        day,
        dayDate: day === "day1" ? exhibition.day1Date : exhibition.day2Date,
        timeSlot,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // --- RENDER ---

  if (loading) {
    return (
      <div className="exh">
        <div className="exh-card">
          <div className="exh-header">
            <img src={logo} alt="Aouad & Co" className="exh-logoImg" />
            <p className="exh-subtitle">VIP Exhibition</p>
          </div>
          <div className="exh-body exh-loading">
            <div className="exh-spinner" />
            <p style={{ color: "#888" }}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !exhibition) {
    return (
      <div className="exh">
        <div className="exh-card">
          <div className="exh-header">
            <img src={logo} alt="Aouad & Co" className="exh-logoImg" />
            <p className="exh-subtitle">VIP Exhibition</p>
          </div>
          <div className="exh-body exh-notfound">
            <h2>Exhibition Not Found</h2>
            <p>This event may have ended or the link is invalid.</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="exh">
        <div className="exh-card">
          <div className="exh-header">
            <h1 className="exh-logo">AOUAD & CO</h1>
            <p className="exh-subtitle">{exhibition.name}</p>
          </div>
          <div className="exh-body exh-success">
            <div className="exh-success-icon">&#10003;</div>
            <h2>Appointment Confirmed!</h2>
            <p>Thank you, {success.name}. A confirmation email has been sent.</p>
            <div className="exh-detail">
              <p><strong>Exhibition:</strong> {exhibition.name}</p>
              <p><strong>Date:</strong> {formatDate(success.dayDate)} ({success.day === "day1" ? "Day 1" : "Day 2"})</p>
              <p><strong>Time:</strong> {success.timeSlot}</p>
            </div>
            <p style={{ color: "#999", fontSize: 13 }}>We look forward to welcoming you.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="exh">
      <div className="exh-card">
        <div className="exh-header">
          <h1 className="exh-logo">AOUAD & CO</h1>
          <p className="exh-subtitle">VIP Exhibition</p>
        </div>

        <div className="exh-body">
          {/* Welcome */}
          <div className="exh-welcome">
            <h2>You Have Been Selected</h2>
            <p>
              Thank you for being one of our valued VIP clients. You are cordially invited to our exclusive exhibition{" "}
              <span className="exh-eventName">{exhibition.name}</span>. Please select your preferred day and time below.
            </p>
          </div>

          {/* Progress steps */}
          <div className="exh-steps">
            <div className={`exh-step ${step >= 2 ? "is-done" : step === 1 ? "is-active" : ""}`} />
            <div className={`exh-step ${step >= 3 ? "is-done" : step === 2 ? "is-active" : ""}`} />
            <div className={`exh-step ${step === 3 ? "is-active" : ""}`} />
          </div>

          {error && <div className="exh-error">{error}</div>}

          {/* STEP 1: Choose Day */}
          {step === 1 && (
            <>
              <span className="exh-label">Choose Your Day</span>
              <div className="exh-days">
                <button type="button" className={`exh-dayBtn ${day === "day1" ? "is-selected" : ""}`} onClick={() => handleDaySelect("day1")}>
                  <strong>Day 1</strong>
                  <span>{formatDate(exhibition.day1Date)}</span>
                </button>
                <button type="button" className={`exh-dayBtn ${day === "day2" ? "is-selected" : ""}`} onClick={() => handleDaySelect("day2")}>
                  <strong>Day 2</strong>
                  <span>{formatDate(exhibition.day2Date)}</span>
                </button>
              </div>
            </>
          )}

          {/* STEP 2: Choose Time Slot */}
          {step === 2 && (
            <>
              <button type="button" className="exh-back" onClick={() => setStep(1)}>
                &#8592; Back to day selection
              </button>
              <span className="exh-label">
                Choose Your Time — {day === "day1" ? "Day 1" : "Day 2"} ({formatDate(day === "day1" ? exhibition.day1Date : exhibition.day2Date)})
              </span>
              <div className="exh-slots">
                {exhibition.timeSlots.map((slot) => {
                  const full = isSlotFull(day, slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      className={`exh-slotBtn ${timeSlot === slot ? "is-selected" : ""}`}
                      disabled={full}
                      onClick={() => handleSlotSelect(slot)}
                    >
                      {slot}
                      {full && <span className="exh-slotFull">Fully booked</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* STEP 3: Contact Info */}
          {step === 3 && (
            <>
              <button type="button" className="exh-back" onClick={() => setStep(2)}>
                &#8592; Back to time selection
              </button>
              <span className="exh-label">Your Details</span>
              <form onSubmit={handleSubmit}>
                <div className="exh-field">
                  <label>Full Name</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
                </div>
                <div className="exh-field">
                  <label>Phone Number</label>
                  <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+961 71 123 456" />
                </div>
                <div className="exh-field">
                  <label>Email Address</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
                </div>

                <button type="submit" className="exh-submit" disabled={submitting}>
                  {submitting ? "Booking..." : "CONFIRM APPOINTMENT"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
