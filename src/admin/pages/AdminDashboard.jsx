// src/admin/pages/AdminDashboard.jsx
import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

function tokenOrThrow() {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Missing token. Please login again.");
  return token;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function iso10(v) {
  if (!v) return null;
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function money(n) {
  if (n == null) return "—";
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return new Intl.NumberFormat("en-US").format(x);
}

function fmtBudget(min, max) {
  const a = Number(min);
  const b = Number(max);
  const aOk = Number.isFinite(a) && a > 0;
  const bOk = Number.isFinite(b) && b > 0;
  if (!aOk && !bOk) return "—";
  return `${aOk ? money(a) : "?"} – ${bOk ? money(b) : "?"}`;
}

function safeText(v, fallback = "—") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

function chip(v) {
  const x = String(v || "—").toUpperCase();
  return <span className={`adm-chip adm-chip--${x.toLowerCase()}`}>{x}</span>;
}

function agentLabel(l) {
  return (
    l?.agentAssigned?.fullName ||
    l?.agentAssignedName ||
    l?.agent ||
    (l?.agentAssignedId ? "Assigned" : "—")
  );
}

/**
 * WhatsApp needs E.164 digits only: https://wa.me/<digits>
 * Lebanon examples:
 * - "+961 81 943 946" -> "96181943946"
 * - "081943946" -> "96181943946"
 * - "81 943 946" -> "96181943946"
 * - "00961 81 943 946" -> "96181943946"
 */
function normalizePhoneToWaMe(phone, defaultCountryCode = "961") {
  if (!phone) return null;
  const raw = String(phone).trim();
  if (!raw) return null;

  // If already has +, strip to digits
  if (raw.startsWith("+")) {
    const digits = raw.replace(/[^\d]/g, "");
    return digits.length >= 8 ? digits : null;
  }

  let digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;

  // "00<country><num>" -> remove 00
  if (digits.startsWith("00")) digits = digits.slice(2);

  // already country-coded
  if (digits.startsWith(defaultCountryCode)) {
    return digits.length >= 8 ? digits : null;
  }

  // local leading 0
  if (digits.startsWith("0")) digits = digits.slice(1);

  const out = `${defaultCountryCode}${digits}`;
  return out.length >= 8 ? out : null;
}

// Determine a due date even if nextFollowUpAt is missing.
function getFollowUpDueISO(l, today) {
  const explicit =
    iso10(l?.nextFollowUpAt) ||
    iso10(l?.followUpAt) ||
    iso10(l?.nextFollowUpDate);

  if (explicit) return explicit;

  const status = String(l?.status || "").toUpperCase();
  if (status === "FOLLOW_UP") return today;

  return null;
}

/** Inline style so <a> does NOT look like a link */
function miniBtnStyle(disabled) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid rgba(15, 23, 42, 0.14)",
    background: "#fff",
    fontWeight: 700,
    fontSize: 14,
    lineHeight: 1,
    cursor: disabled ? "not-allowed" : "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    textDecoration: "none", // ✅ kills underline
    color: "inherit", // ✅ kills blue
    opacity: disabled ? 0.5 : 1,
  };
}

export default function AdminDashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [views, setViews] = useState(null);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [q, setQ] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const token = tokenOrThrow();
        const [clientsRes, viewsRes] = await Promise.all([
          fetch(`${API_BASE}/admin/clients?limit=500`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/admin/pageviews`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const data = await clientsRes.json().catch(() => ({}));
        if (!clientsRes.ok) throw new Error(data?.error || "Failed to load dashboard");
        setItems(Array.isArray(data?.items) ? data.items : []);

        const viewsData = await viewsRes.json().catch(() => null);
        if (viewsRes.ok && viewsData) setViews(viewsData);
      } catch (e) {
        console.error(e);
        setErr(e?.message || "Failed to load dashboard");
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const today = todayISO();

  const filtered = useMemo(() => {
    const qq = String(q || "").trim().toLowerCase();

    return items.filter((l) => {
      if (statusFilter !== "ALL" && String(l?.status) !== statusFilter) return false;
      if (!qq) return true;

      const hay = `${l?.name || ""} ${l?.phone || ""} ${l?.email || ""} ${l?.source || ""} ${l?.interestedArea || ""
        } ${agentLabel(l) || ""}`.toLowerCase();

      return hay.includes(qq);
    });
  }, [items, q, statusFilter]);

  const stats = useMemo(() => {
    const open = items.filter((l) => l.status === "OPEN").length;
    const follow = items.filter((l) => l.status === "FOLLOW_UP").length;
    const hot = items.filter((l) => l.urgency === "HOT").length;
    const closed = items.filter((l) => l.status === "CLOSED").length;
    return { open, follow, hot, closed, total: items.length };
  }, [items]);

  const followUpsDue = useMemo(() => {
    return items
      .map((l) => {
        const dueISO = getFollowUpDueISO(l, today);
        return dueISO ? { ...l, __dueISO: dueISO } : null;
      })
      .filter(Boolean)
      .filter((l) => String(l.status || "").toUpperCase() !== "CLOSED")
      .filter((l) => l.__dueISO <= today)
      .sort((a, b) => (a.__dueISO > b.__dueISO ? 1 : -1))
      .slice(0, 6);
  }, [items, today]);

  const recentLeads = useMemo(() => {
    return [...filtered]
      .sort((a, b) => {
        const aa = new Date(a?.createdAt || a?.dateContacted || 0).getTime();
        const bb = new Date(b?.createdAt || b?.dateContacted || 0).getTime();
        return bb - aa;
      })
      .slice(0, 8);
  }, [filtered]);

  const bySource = useMemo(() => {
    const m = new Map();
    for (const l of items) {
      const src = String(l?.source || "OTHER").toUpperCase();
      m.set(src, (m.get(src) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [items]);

  const byStatus = useMemo(() => {
    const statuses = ["OPEN", "FOLLOW_UP", "CLOSED"];
    return statuses.map((s) => ({
      status: s,
      count: items.filter((l) => l.status === s).length,
    }));
  }, [items]);

  if (loading) return <div className="dash-loading">Loading dashboard…</div>;
  if (err) return <div className="dash-error">{err}</div>;

  return (
    <div className="dash">
      {/* Website Visitors */}
      {views && (
        <div className="dash-kpis">
          <KPI label="Visitors Today" value={money(views.today)} sub="Page views" />
          <KPI label="Last 7 Days" value={money(views.week)} sub="Page views" />
          <KPI label="Last 30 Days" value={money(views.month)} sub="Page views" />
          <KPI label="All Time" value={money(views.total)} sub="Total page views" />
        </div>
      )}

      {/* KPIs */}
      <div className="dash-kpis">
        <KPI label="Open Leads" value={stats.open} sub={`${stats.total} total`} />
        <KPI label="Follow Ups" value={stats.follow} sub={`Due today: ${followUpsDue.length}`} />
        <KPI label="Hot" value={stats.hot} sub="High priority" />
        <KPI label="Closed" value={stats.closed} sub="Won deals" />
      </div>

      {/* Controls */}
      <div className="dash-controls">
        <input
          className="adm-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name / phone / email / source / country / agent…"
        />
        <select className="adm-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="FOLLOW_UP">FOLLOW_UP</option>
          <option value="CLOSED">CLOSED</option>
        </select>
      </div>

      {/* Main grid */}
      <div className="dash-grid">
        {/* Follow-ups due */}
        <div className="adm-card dash-card">
          <div className="dash-head">
            <div>
              <div className="dash-title">Follow-ups due</div>
              <div className="dash-sub">People you should contact today</div>
            </div>
            <div className="dash-headRight">
              <span className="adm-muted">{followUpsDue.length} due</span>
            </div>
          </div>

          {followUpsDue.length === 0 ? (
            <div className="dash-empty">No follow-ups due.</div>
          ) : (
            <div className="dash-list">
              {followUpsDue.map((l) => {
                const waDigits = normalizePhoneToWaMe(l?.phone, "961");
                const wa = waDigits ? `https://wa.me/${waDigits}` : null;
                const dueISO = l.__dueISO || null;

                return (
                  <div key={l.id} className="dash-item">
                    <div className="dash-itemLeft">
                      <div className="dash-itemName">{safeText(l?.name)}</div>
                      <div className="dash-itemMeta">
                        {safeText(l?.phone)} · {safeText(l?.interestedArea)} · {safeText(l?.source)}
                        {dueISO ? ` · Due: ${dueISO}` : ""}
                      </div>
                    </div>

                    <div className="dash-itemRight">
                      {chip(l?.urgency)}

                      {wa ? (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          style={miniBtnStyle(false)}
                          aria-label={`WhatsApp ${safeText(l?.name, "lead")}`}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(15, 23, 42, 0.04)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#fff";
                          }}
                        >
                          WhatsApp
                        </a>
                      ) : (
                        <button type="button" disabled style={miniBtnStyle(true)}>
                          WhatsApp
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent leads table */}
        <div className="adm-card dash-card dash-span2">
          <div className="dash-head">
            <div>
              <div className="dash-title">Recent leads</div>
              <div className="dash-sub">Latest created records</div>
            </div>
          </div>

          <div className="adm-tableWrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th className="adm-th">Name</th>
                  <th className="adm-th">Country</th>
                  <th className="adm-th">Budget</th>
                  <th className="adm-th">Urgency</th>
                  <th className="adm-th">Status</th>
                  <th className="adm-th">Agent</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((l) => (
                  <tr key={l.id} className="adm-row">
                    <td className="adm-td" style={{ fontWeight: 700 }}>
                      {safeText(l?.name)}
                      <div className="adm-muted" style={{ marginTop: 2 }}>
                        {safeText(l?.phone)} · {safeText(l?.source).toUpperCase()}
                        {l?.createdAt ? ` · ${iso10(l.createdAt)}` : ""}
                      </div>
                    </td>
                    <td className="adm-td">{safeText(l?.interestedArea)}</td>
                    <td className="adm-td">{fmtBudget(l?.budgetMin, l?.budgetMax)}</td>
                    <td className="adm-td">{chip(l?.urgency)}</td>
                    <td className="adm-td">{safeText(l?.status).toUpperCase()}</td>
                    <td className="adm-td">{agentLabel(l)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top sources */}
        <div className="adm-card dash-card">
          <div className="dash-head">
            <div>
              <div className="dash-title">Top sources</div>
              <div className="dash-sub">Where leads come from</div>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="dash-empty">No data.</div>
          ) : (
            <div className="dash-bars">
              {bySource.map(([src, count]) => (
                <div key={src} className="dash-barRow">
                  <div className="dash-barLabel">{src}</div>
                  <div className="dash-barTrack">
                    <div className="dash-barFill" style={{ width: `${(count / items.length) * 100}%` }} />
                  </div>
                  <div className="dash-barVal">{count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pipeline */}
        <div className="adm-card dash-card">
          <div className="dash-head">
            <div>
              <div className="dash-title">Pipeline</div>
              <div className="dash-sub">Status distribution</div>
            </div>
          </div>

          <div className="dash-pills">
            {byStatus.map((s) => (
              <div key={s.status} className="dash-pill">
                <div className="dash-pillLabel">{s.status}</div>
                <div className="dash-pillVal">{s.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Pages */}
        {views?.topPages?.length > 0 && (
          <div className="adm-card dash-card">
            <div className="dash-head">
              <div>
                <div className="dash-title">Top Pages</div>
                <div className="dash-sub">Most visited pages</div>
              </div>
            </div>

            <div className="dash-bars">
              {views.topPages.map((p) => (
                <div key={p.path} className="dash-barRow">
                  <div className="dash-barLabel" style={{ minWidth: 120 }}>{p.path}</div>
                  <div className="dash-barTrack">
                    <div
                      className="dash-barFill"
                      style={{ width: `${(p.count / views.topPages[0].count) * 100}%` }}
                    />
                  </div>
                  <div className="dash-barVal">{money(p.count)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Daily Views Chart */}
        {views?.daily?.length > 0 && (
          <div className="adm-card dash-card dash-span2">
            <div className="dash-head">
              <div>
                <div className="dash-title">Daily Visitors</div>
                <div className="dash-sub">Page views per day (last 30 days)</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 120, padding: "12px 0" }}>
              {views.daily.map((d) => {
                const max = Math.max(...views.daily.map((x) => x.count), 1);
                const h = Math.max((d.count / max) * 100, 2);
                const dateStr = String(d.date).slice(0, 10);
                return (
                  <div
                    key={dateStr}
                    title={`${dateStr}: ${d.count} views`}
                    style={{
                      flex: 1,
                      height: `${h}%`,
                      background: "var(--accent, #0f172a)",
                      borderRadius: 2,
                      minWidth: 4,
                      cursor: "default",
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({ label, value, sub }) {
  return (
    <div className="dash-kpi">
      <div className="dash-kpiLabel">{label}</div>
      <div className="dash-kpiValue">{value}</div>
      {sub ? <div className="adm-muted">{sub}</div> : null}
    </div>
  );
}
