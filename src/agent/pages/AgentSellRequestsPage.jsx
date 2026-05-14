import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import "./agentSellRequestsPage.css";

const STATUSES = ["NEW", "CONTACTED", "IN_PROGRESS", "CLOSED"];

function statusBadge(s) {
    const map = {
        NEW: "sr-badge sr-badge--new",
        CONTACTED: "sr-badge sr-badge--contacted",
        IN_PROGRESS: "sr-badge sr-badge--progress",
        CLOSED: "sr-badge sr-badge--closed",
    };
    return map[s] || "sr-badge";
}

function fmtDate(d) {
    if (!d) return "—";
    try {
        return new Date(d).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    } catch {
        return "—";
    }
}

export default function AgentSellRequestsPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [filter, setFilter] = useState("ALL");
    const [saving, setSaving] = useState(false);

    async function load() {
        try {
            const { data } = await api.get("/agent/sell-requests?limit=500");
            setItems(data.items || []);
        } catch {
            /* silent */
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    const filtered =
        filter === "ALL" ? items : items.filter((x) => x.status === filter);

    const sel = selected ? items.find((x) => x.id === selected) : null;

    async function patchStatus(id, status) {
        setSaving(true);
        try {
            await api.patch(`/agent/sell-requests/${id}`, { status });
            setItems((prev) =>
                prev.map((x) => (x.id === id ? { ...x, status } : x))
            );
        } catch {
            alert("Failed to update status");
        } finally {
            setSaving(false);
        }
    }

    async function patchNote(id, note) {
        try {
            await api.patch(`/agent/sell-requests/${id}`, { note });
            setItems((prev) =>
                prev.map((x) => (x.id === id ? { ...x, note } : x))
            );
        } catch {
            /* silent */
        }
    }

    async function deleteItem(id) {
        if (!window.confirm("Delete this sell request?")) return;
        try {
            await api.delete(`/agent/sell-requests/${id}`);
            setItems((prev) => prev.filter((x) => x.id !== id));
            if (selected === id) setSelected(null);
        } catch {
            alert("Failed to delete");
        }
    }

    if (loading) {
        return <div className="sr-loading">Loading sell requests...</div>;
    }

    return (
        <div className="sr">
            {/* HEADER */}
            <div className="sr-header">
                <h2 className="sr-title">
                    Sell Requests
                    <span className="sr-count">{items.length}</span>
                </h2>
                <div className="sr-filters">
                    {["ALL", ...STATUSES].map((s) => (
                        <button
                            key={s}
                            className={`sr-filterBtn ${filter === s ? "is-active" : ""}`}
                            onClick={() => setFilter(s)}
                        >
                            {s === "ALL" ? "All" : s.replace("_", " ")}
                        </button>
                    ))}
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="sr-empty">No sell requests found.</div>
            ) : (
                <div className="sr-layout">
                    {/* LIST */}
                    <div className="sr-list">
                        {filtered.map((item) => (
                            <button
                                key={item.id}
                                className={`sr-card ${selected === item.id ? "is-selected" : ""}`}
                                onClick={() => setSelected(item.id)}
                            >
                                <div className="sr-card__top">
                                    <div className="sr-card__name">
                                        {item.firstName} {item.lastName}
                                    </div>
                                    <span className={statusBadge(item.status)}>
                                        {item.status.replace("_", " ")}
                                    </span>
                                </div>
                                <div className="sr-card__type">{item.propertyType}</div>
                                <div className="sr-card__loc">{item.propertyLocation}</div>
                                <div className="sr-card__date">{fmtDate(item.createdAt)}</div>
                            </button>
                        ))}
                    </div>

                    {/* DETAIL */}
                    {sel ? (
                        <div className="sr-detail">
                            <div className="sr-detail__header">
                                <h3 className="sr-detail__name">
                                    {sel.firstName} {sel.lastName}
                                </h3>
                                <button
                                    className="sr-detail__del"
                                    onClick={() => deleteItem(sel.id)}
                                >
                                    Delete
                                </button>
                            </div>

                            <div className="sr-detail__grid">
                                <div className="sr-detail__label">Email</div>
                                <div className="sr-detail__value">
                                    {sel.email ? (
                                        <a href={`mailto:${sel.email}`}>{sel.email}</a>
                                    ) : (
                                        "—"
                                    )}
                                </div>

                                <div className="sr-detail__label">Phone</div>
                                <div className="sr-detail__value">
                                    <a href={`tel:${sel.phoneCode || ""}${sel.phone}`}>
                                        {sel.phoneCode || ""} {sel.phone}
                                    </a>
                                </div>

                                <div className="sr-detail__label">Property Type</div>
                                <div className="sr-detail__value">{sel.propertyType}</div>

                                <div className="sr-detail__label">Location</div>
                                <div className="sr-detail__value">{sel.propertyLocation}</div>

                                <div className="sr-detail__label">Details</div>
                                <div className="sr-detail__value">
                                    {sel.details || "—"}
                                </div>

                                <div className="sr-detail__label">Submitted</div>
                                <div className="sr-detail__value">{fmtDate(sel.createdAt)}</div>
                            </div>

                            <div className="sr-detail__section">
                                <div className="sr-detail__label">Status</div>
                                <div className="sr-detail__statuses">
                                    {STATUSES.map((s) => (
                                        <button
                                            key={s}
                                            className={`sr-statusBtn ${sel.status === s ? "is-active" : ""}`}
                                            disabled={saving}
                                            onClick={() => patchStatus(sel.id, s)}
                                        >
                                            {s.replace("_", " ")}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="sr-detail__section">
                                <div className="sr-detail__label">Agent Note</div>
                                <textarea
                                    className="sr-detail__note"
                                    value={sel.note || ""}
                                    placeholder="Add a note..."
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setItems((prev) =>
                                            prev.map((x) =>
                                                x.id === sel.id ? { ...x, note: val } : x
                                            )
                                        );
                                    }}
                                    onBlur={() => patchNote(sel.id, sel.note || "")}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="sr-detail sr-detail--empty">
                            Select a request to view details
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
