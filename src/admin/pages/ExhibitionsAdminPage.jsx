import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import "./ExhibitionsAdminPage.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

function tokenOrThrow() {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Missing token");
  return token;
}

function formatDate(ymd) {
  if (!ymd) return "";
  const d = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

const FRONTEND_URL = "https://aouad.co";

const DEFAULT_SLOTS = [
  "10-11",
  "11-12",
  "12-1",
  "2-3",
  "3-4",
  "4-5",
  "5-6",
  "6-7",
];

function emptyForm() {
  return {
    name: "",
    description: "",
    day1Date: "",
    day2Date: "",
    timeSlots: DEFAULT_SLOTS.join(", "),
    maxPerSlot: 2,
    isActive: true,
  };
}

export default function ExhibitionsAdminPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // create/edit modal
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  // QR modal
  const [qrItem, setQrItem] = useState(null);
  const qrRef = useRef(null);

  // bookings modal
  const [bookingsExh, setBookingsExh] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookingsTab, setBookingsTab] = useState("day1");
  const [bookingsLoading, setBookingsLoading] = useState(false);

  useEffect(() => {
    loadExhibitions();
  }, []);

  async function loadExhibitions() {
    try {
      const res = await fetch(`${API_BASE}/admin/exhibitions`, {
        headers: { Authorization: `Bearer ${tokenOrThrow()}` },
      });
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditId(null);
    setForm(emptyForm());
    setShowModal(true);
  }

  function openEdit(item) {
    setEditId(item.id);
    setForm({
      name: item.name,
      description: item.description || "",
      day1Date: item.day1Date,
      day2Date: item.day2Date,
      timeSlots: (item.timeSlots || []).join(", "),
      maxPerSlot: item.maxPerSlot,
      isActive: item.isActive,
    });
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    const slots = form.timeSlots
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const body = {
      name: form.name,
      description: form.description || undefined,
      day1Date: form.day1Date,
      day2Date: form.day2Date,
      timeSlots: slots,
      maxPerSlot: Number(form.maxPerSlot) || 5,
      isActive: form.isActive,
    };

    try {
      const url = editId
        ? `${API_BASE}/admin/exhibitions/${editId}`
        : `${API_BASE}/admin/exhibitions`;

      await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenOrThrow()}`,
        },
        body: JSON.stringify(body),
      });

      setShowModal(false);
      loadExhibitions();
    } catch (e) {
      console.error(e);
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this exhibition and all its bookings?")) return;
    try {
      await fetch(`${API_BASE}/admin/exhibitions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenOrThrow()}` },
      });
      loadExhibitions();
    } catch (e) {
      console.error(e);
    }
  }

  async function openBookings(item) {
    setBookingsExh(item);
    setBookingsTab("day1");
    setBookingsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/admin/exhibitions/${item.id}`, {
        headers: { Authorization: `Bearer ${tokenOrThrow()}` },
      });
      const data = await res.json();
      setBookings(data.item?.bookings || []);
    } catch (e) {
      console.error(e);
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }

  async function cancelBooking(bookingId) {
    if (!confirm("Cancel this booking?")) return;
    try {
      await fetch(`${API_BASE}/admin/exhibition-bookings/${bookingId}/cancel`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${tokenOrThrow()}` },
      });
      // refresh
      if (bookingsExh) openBookings(bookingsExh);
    } catch (e) {
      console.error(e);
    }
  }

  function copyLink(slug) {
    const url = `${FRONTEND_URL}/exhibition/${slug}`;
    navigator.clipboard.writeText(url).catch(() => {});
  }

  function downloadQR() {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qr-${qrItem?.slug || "exhibition"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  const filteredBookings = bookings.filter((b) => b.day === bookingsTab);

  if (loading) return <div className="exhAdmin-empty">Loading exhibitions...</div>;

  return (
    <div className="exhAdmin">
      <div className="exhAdmin-toolbar">
        <span style={{ fontSize: 14, color: "#888" }}>{items.length} exhibition(s)</span>
        <button className="exhAdmin-addBtn" onClick={openCreate}>
          + New Exhibition
        </button>
      </div>

      {items.length === 0 ? (
        <div className="exhAdmin-empty">No exhibitions yet. Create one to get started.</div>
      ) : (
        <div className="exhAdmin-grid">
          {items.map((item) => (
            <div key={item.id} className="exhAdmin-item">
              <div className="exhAdmin-itemHead">
                <h3>{item.name}</h3>
                <span className={`exhAdmin-badge ${item.isActive ? "is-active" : "is-inactive"}`}>
                  {item.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="exhAdmin-itemBody">
                <div className="exhAdmin-meta">
                  <span>Day 1: {formatDate(item.day1Date)}</span>
                  <span>Day 2: {formatDate(item.day2Date)}</span>
                  <span>Bookings: {item._count?.bookings || 0}</span>
                  <span>Max per slot: {item.maxPerSlot}</span>
                </div>

                <div className="exhAdmin-link">
                  <code>{FRONTEND_URL}/exhibition/{item.slug}</code>
                  <button onClick={() => copyLink(item.slug)}>Copy</button>
                </div>

                <div className="exhAdmin-actions">
                  <button className="is-primary" onClick={() => openBookings(item)}>
                    View Bookings
                  </button>
                  <button onClick={() => setQrItem(item)}>QR Code</button>
                  <button onClick={() => openEdit(item)}>Edit</button>
                  <button className="is-danger" onClick={() => handleDelete(item.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="exhAdmin-overlay" onClick={() => setShowModal(false)}>
          <div className="exhAdmin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editId ? "Edit Exhibition" : "New Exhibition"}</h2>
            <form onSubmit={handleSave}>
              <div className="exhAdmin-formRow">
                <label>Exhibition Name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Summer Property Showcase 2026" />
              </div>
              <div className="exhAdmin-formRow">
                <label>Description (optional)</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="exhAdmin-formRow">
                  <label>Day 1 Date</label>
                  <input type="date" required value={form.day1Date} onChange={(e) => setForm({ ...form, day1Date: e.target.value })} />
                </div>
                <div className="exhAdmin-formRow">
                  <label>Day 2 Date</label>
                  <input type="date" required value={form.day2Date} onChange={(e) => setForm({ ...form, day2Date: e.target.value })} />
                </div>
              </div>
              <div className="exhAdmin-formRow">
                <label>Time Slots (comma separated)</label>
                <input required value={form.timeSlots} onChange={(e) => setForm({ ...form, timeSlots: e.target.value })} placeholder="10:00-11:00, 11:00-12:00, ..." />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="exhAdmin-formRow">
                  <label>Max Bookings Per Slot</label>
                  <input type="number" min="1" required value={form.maxPerSlot} onChange={(e) => setForm({ ...form, maxPerSlot: e.target.value })} />
                </div>
                <div className="exhAdmin-formRow" style={{ display: "flex", alignItems: "end", gap: 8, paddingBottom: 2 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 0 }}>
                    <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                    Active (accepting bookings)
                  </label>
                </div>
              </div>

              <div className="exhAdmin-formActions">
                <button type="button" className="exh-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="exh-save" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR CODE MODAL */}
      {qrItem && (
        <div className="exhAdmin-overlay" onClick={() => setQrItem(null)}>
          <div className="exhAdmin-modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
            <h2>QR Code — {qrItem.name}</h2>
            <p style={{ color: "#888", fontSize: 13, marginBottom: 20 }}>
              Scan to open the reservation page
            </p>
            <div ref={qrRef} style={{ display: "inline-block", padding: 16, background: "#fff", borderRadius: 12, border: "1px solid #eee" }}>
              <QRCodeCanvas
                value={`${FRONTEND_URL}/exhibition/${qrItem.slug}`}
                size={280}
                level="H"
                includeMargin
                bgColor="#ffffff"
                fgColor="#1a1a2e"
              />
            </div>
            <p style={{ color: "#555", fontSize: 12, marginTop: 12, wordBreak: "break-all" }}>
              {FRONTEND_URL}/exhibition/{qrItem.slug}
            </p>
            <div className="exhAdmin-formActions" style={{ justifyContent: "center", marginTop: 16 }}>
              <button type="button" className="exh-cancel" onClick={() => setQrItem(null)}>Close</button>
              <button type="button" className="exh-save" onClick={downloadQR}>Download PNG</button>
            </div>
          </div>
        </div>
      )}

      {/* BOOKINGS MODAL */}
      {bookingsExh && (
        <div className="exhAdmin-overlay" onClick={() => setBookingsExh(null)}>
          <div className="exhAdmin-modal exhAdmin-bookingsModal" onClick={(e) => e.stopPropagation()}>
            <h2>{bookingsExh.name} — Bookings</h2>

            <div className="exhAdmin-bookingsTabs">
              <button className={bookingsTab === "day1" ? "is-active" : ""} onClick={() => setBookingsTab("day1")}>
                Day 1 ({formatDate(bookingsExh.day1Date)})
              </button>
              <button className={bookingsTab === "day2" ? "is-active" : ""} onClick={() => setBookingsTab("day2")}>
                Day 2 ({formatDate(bookingsExh.day2Date)})
              </button>
            </div>

            {bookingsLoading ? (
              <div className="exhAdmin-empty">Loading bookings...</div>
            ) : filteredBookings.length === 0 ? (
              <div className="exhAdmin-empty">No bookings for this day yet.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="exhAdmin-bookingsTable">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b) => (
                      <tr key={b.id}>
                        <td><strong>{b.timeSlot}</strong></td>
                        <td>{b.name}</td>
                        <td>{b.phone}</td>
                        <td>{b.email}</td>
                        <td>
                          <span className={`exhAdmin-statusBadge is-${b.status.toLowerCase()}`}>
                            {b.status}
                          </span>
                        </td>
                        <td>
                          {b.status !== "CANCELLED" && (
                            <button className="exhAdmin-cancelBtn" onClick={() => cancelBooking(b.id)}>
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

            <div className="exhAdmin-formActions" style={{ marginTop: 16 }}>
              <button type="button" className="exh-cancel" onClick={() => setBookingsExh(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
