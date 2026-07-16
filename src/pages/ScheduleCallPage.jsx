import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import "./scheduleCallPage.css";
import { fbTrack } from "../lib/fbpixel.js";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function todayLocalYMD() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function initials(name) {
    const parts = String(name || "")
        .trim()
        .split(/\s+/)
        .slice(0, 2);
    if (!parts.length) return "A";
    return parts.map((p) => p[0]?.toUpperCase()).join("");
}

function toWaNumber(raw) {
    const cleaned = String(raw || "")
        .trim()
        .replace(/[^\d+]/g, "");
    if (!cleaned) return "";
    return cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
}

function displayDate(ymd) {
    if (!ymd) return "";
    const d = new Date(`${ymd}T12:00:00`);
    if (Number.isNaN(d.getTime())) return ymd;
    return d.toLocaleDateString(undefined, {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function getTzOffsetMinForBackend() {
    return -new Date().getTimezoneOffset();
}

export default function ScheduleCallPage() {
    const location = useLocation();
    const qs = useMemo(() => new URLSearchParams(location.search), [location.search]);

    const lockedAgentId = qs.get("agentId") || "";
    const lockedAgentSlug = qs.get("agentSlug") || "";
    const listingId = qs.get("listingId") || "";

    const [agents, setAgents] = useState([]);
    const [agentsLoading, setAgentsLoading] = useState(true);

    const [agentId, setAgentId] = useState("");
    const selectedAgent = useMemo(
        () => agents.find((a) => a.id === agentId) || null,
        [agents, agentId]
    );

    const [q, setQ] = useState("");
    const [date, setDate] = useState(todayLocalYMD());

    const [slots, setSlots] = useState([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [slotsError, setSlotsError] = useState("");

    const [selectedSlot, setSelectedSlot] = useState(null);

    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        note: "",
    });

    const [submitLoading, setSubmitLoading] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [submitSuccess, setSubmitSuccess] = useState("");

    const filteredAgents = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return agents;
        return agents.filter((a) => a.name.toLowerCase().includes(s));
    }, [agents, q]);

    const isLocked = !!lockedAgentId || !!lockedAgentSlug;

    useEffect(() => {
        let alive = true;

        async function loadAgents() {
            try {
                setAgentsLoading(true);

                const res = await fetch(`${API_BASE}/public/agents`);
                const data = res.ok ? await res.json() : null;
                const list = Array.isArray(data) ? data : data?.items || data?.agents || [];

                const normalized = list.map((a) => ({
                    id: String(a.id || ""),
                    slug: String(a.slug || ""),
                    name: a.name || a.fullName || "Agent",
                    title: a.title || a.roleTitle || "Property Advisor",
                    channel: a.channel || "WhatsApp",
                    avatarUrl: a.avatarUrl || a.imageUrl || a.photoUrl || "",
                    phone: a.phone || a.whatsapp || "",
                }));

                let finalList = normalized;

                if (lockedAgentId) {
                    finalList = normalized.filter((a) => a.id === lockedAgentId);
                } else if (lockedAgentSlug) {
                    finalList = normalized.filter((a) => a.slug === lockedAgentSlug);
                }

                if (!alive) return;

                setAgents(finalList);

                if (finalList.length) {
                    setAgentId(finalList[0].id);
                } else {
                    setAgentId("");
                }
            } catch (e) {
                console.error(e);
                if (!alive) return;
                setAgents([]);
                setAgentId("");
            } finally {
                if (!alive) return;
                setAgentsLoading(false);
            }
        }

        loadAgents();

        return () => {
            alive = false;
        };
    }, [lockedAgentId, lockedAgentSlug]);

    useEffect(() => {
        let alive = true;

        async function loadAvailability() {
            if (!selectedAgent?.slug || !date) {
                setSlots([]);
                setSelectedSlot(null);
                setSlotsError(
                    selectedAgent && !selectedAgent.slug
                        ? "Selected agent is missing slug in /public/agents response."
                        : ""
                );
                return;
            }

            try {
                setSlotsLoading(true);
                setSlotsError("");
                setSubmitError("");
                setSubmitSuccess("");
                setSelectedSlot(null);

                const tzOffsetMin = getTzOffsetMinForBackend();
                const url =
                    `${API_BASE}/public/agents/${encodeURIComponent(selectedAgent.slug)}/availability` +
                    `?date=${encodeURIComponent(date)}` +
                    `&tzOffsetMin=${encodeURIComponent(String(tzOffsetMin))}` +
                    `&durationMin=30`;

                const res = await fetch(url);
                const data = await res.json().catch(() => ({}));

                if (!res.ok) {
                    throw new Error(data?.error || "Failed to load availability");
                }

                if (!alive) return;
                setSlots(Array.isArray(data?.slots) ? data.slots : []);
            } catch (e) {
                console.error(e);
                if (!alive) return;
                setSlots([]);
                setSlotsError(e?.message || "Failed to load availability");
            } finally {
                if (!alive) return;
                setSlotsLoading(false);
            }
        }

        loadAvailability();

        return () => {
            alive = false;
        };
    }, [selectedAgent?.slug, date]);

    async function submitBooking(e) {
        e.preventDefault();

        if (!selectedAgent?.slug) {
            setSubmitError("Please pick an agent.");
            return;
        }

        if (!selectedSlot?.startAtUtc) {
            setSubmitError("Please choose an available time.");
            return;
        }

        try {
            setSubmitLoading(true);
            setSubmitError("");
            setSubmitSuccess("");

            const res = await fetch(
                `${API_BASE}/public/agents/${encodeURIComponent(selectedAgent.slug)}/book`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        startAtUtc: selectedSlot.startAtUtc,
                        durationMin: Number(selectedSlot.durationMin) || 30,
                        firstName: form.firstName.trim(),
                        lastName: form.lastName.trim(),
                        email: form.email.trim() || null,
                        phone: form.phone.trim(),
                        note: form.note.trim() || null,
                        listingId: listingId || undefined,
                        pageUrl: window.location.href,
                    }),
                }
            );

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data?.error || "Failed to book meeting");
            }

            fbTrack("Schedule", {
                content_name: "Schedule a Call",
                content_category: selectedAgent?.slug || undefined,
            });
            fbTrack("Lead", { content_name: "Schedule a Call" });

            setSubmitSuccess("Meeting booked successfully.");
            setForm({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                note: "",
            });
            setSelectedSlot(null);

            const tzOffsetMin = getTzOffsetMinForBackend();
            const refreshRes = await fetch(
                `${API_BASE}/public/agents/${encodeURIComponent(selectedAgent.slug)}/availability` +
                `?date=${encodeURIComponent(date)}` +
                `&tzOffsetMin=${encodeURIComponent(String(tzOffsetMin))}` +
                `&durationMin=30`
            );
            const refreshData = await refreshRes.json().catch(() => ({}));
            if (refreshRes.ok) {
                setSlots(Array.isArray(refreshData?.slots) ? refreshData.slots : []);
            }
        } catch (e) {
            console.error(e);
            setSubmitError(e?.message || "Failed to book meeting");
        } finally {
            setSubmitLoading(false);
        }
    }

    return (
        <div className="os-page">
            <div className="os-wrap">
                <header className="os-header">
                    <div>
                        <h1 className="os-title">Schedule a Call</h1>
                        <p className="os-subtitle">
                            Pick an agent, choose an available time, and book your meeting.
                        </p>
                    </div>

                    <div className="os-timezone">
                        <span>Your timezone</span>
                        <strong>{Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time"}</strong>
                    </div>
                </header>

                <div className="os-grid">
                    <aside className="os-panel os-agent-panel">
                        <div className="os-agent-card">
                            <div className="os-agent-top">
                                <div className="os-agent-avatar">
                                    {selectedAgent?.avatarUrl ? (
                                        <img src={selectedAgent.avatarUrl} alt={selectedAgent.name} />
                                    ) : (
                                        <div className="os-agent-fallback">
                                            {initials(selectedAgent?.name || "Agent")}
                                        </div>
                                    )}
                                </div>

                                <div className="os-agent-details">
                                    <div className="os-agent-name">{selectedAgent?.name || "Pick an agent"}</div>
                                    <div className="os-agent-role">{selectedAgent?.title || ""}</div>
                                    <div className="os-agent-channel">{selectedAgent?.channel || "WhatsApp"}</div>
                                </div>
                            </div>

                            {selectedAgent?.phone ? (
                                <button
                                    type="button"
                                    className="os-wa-btn"
                                    onClick={() => {
                                        const wa = toWaNumber(selectedAgent.phone);
                                        if (!wa) return;

                                        const msg = encodeURIComponent(
                                            `Hi ${selectedAgent.name}, I’m interested in ${listingId ? "listing " + listingId : "your available opportunities"
                                            }. Can you share details?`
                                        );

                                        window.open(
                                            `https://wa.me/${wa}?text=${msg}`,
                                            "_blank",
                                            "noopener,noreferrer"
                                        );
                                    }}
                                >
                                    WhatsApp agent
                                </button>
                            ) : (
                                <button type="button" className="os-wa-btn" disabled>
                                    WhatsApp unavailable
                                </button>
                            )}
                        </div>

                        {!isLocked && (
                            <>
                                <div className="os-panel-head">
                                    <div className="os-panel-title">Pick an agent</div>
                                    <input
                                        className="os-input"
                                        placeholder="Search agent..."
                                        value={q}
                                        onChange={(e) => setQ(e.target.value)}
                                    />
                                </div>

                                <div className="os-agent-list">
                                    {agentsLoading
                                        ? Array.from({ length: 6 }).map((_, i) => (
                                            <div key={i} className="os-agent-row os-skel" />
                                        ))
                                        : filteredAgents.map((a) => (
                                            <button
                                                key={a.id}
                                                type="button"
                                                className={`os-agent-row ${a.id === agentId ? "is-active" : ""}`}
                                                onClick={() => setAgentId(a.id)}
                                            >
                                                <div className="os-agent-row-name">{a.name}</div>
                                                <div className="os-agent-row-sub">{a.title}</div>
                                            </button>
                                        ))}
                                </div>
                            </>
                        )}

                        {isLocked && (
                            <div className="os-locked-note">You’re contacting this agent only.</div>
                        )}
                    </aside>

                    <section className="os-panel os-slots-panel">
                        <div className="os-panel-head">
                            <div className="os-panel-title">Available time</div>
                            <input
                                className="os-input os-date-input"
                                type="date"
                                value={date}
                                min={todayLocalYMD()}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>

                        <div className="os-date-label">{displayDate(date)}</div>

                        {slotsError ? <div className="os-error">{slotsError}</div> : null}

                        {slotsLoading ? (
                            <div className="os-slots-grid">
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} className="os-slot os-skel" />
                                ))}
                            </div>
                        ) : slots.length === 0 ? (
                            <div className="os-empty">No available times for this date.</div>
                        ) : (
                            <div className="os-slots-grid">
                                {slots.map((slot) => {
                                    const active = selectedSlot?.startAtUtc === slot.startAtUtc;
                                    return (
                                        <button
                                            key={slot.startAtUtc}
                                            type="button"
                                            className={`os-slot ${active ? "is-active" : ""}`}
                                            onClick={() => setSelectedSlot(slot)}
                                        >
                                            {slot.labelLocal}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <aside className="os-panel os-book-panel">
                        <div className="os-panel-title">Book meeting</div>

                        {selectedSlot ? (
                            <div className="os-picked-slot">
                                Selected <strong>{displayDate(date)}</strong> at{" "}
                                <strong>{selectedSlot.labelLocal}</strong>
                            </div>
                        ) : (
                            <div className="os-muted">Choose a time slot first.</div>
                        )}

                        {submitError ? <div className="os-error">{submitError}</div> : null}
                        {submitSuccess ? <div className="os-success">{submitSuccess}</div> : null}

                        <form className="os-form" onSubmit={submitBooking}>
                            <div className="os-form-grid">
                                <input
                                    className="os-input"
                                    placeholder="First name"
                                    value={form.firstName}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, firstName: e.target.value }))
                                    }
                                    required
                                />
                                <input
                                    className="os-input"
                                    placeholder="Last name"
                                    value={form.lastName}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, lastName: e.target.value }))
                                    }
                                    required
                                />
                            </div>

                            <input
                                className="os-input"
                                type="email"
                                placeholder="Email"
                                value={form.email}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, email: e.target.value }))
                                }
                            />

                            <input
                                className="os-input"
                                placeholder="Phone"
                                value={form.phone}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                                }
                                required
                            />

                            <textarea
                                className="os-input os-textarea"
                                placeholder="Note (optional)"
                                value={form.note}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, note: e.target.value }))
                                }
                                rows={5}
                            />

                            <button
                                type="submit"
                                className="os-book-btn"
                                disabled={submitLoading || !selectedSlot || !selectedAgent?.slug}
                            >
                                {submitLoading ? "Booking..." : "Book meeting"}
                            </button>
                        </form>
                    </aside>
                </div>
            </div>
        </div>
    );
}