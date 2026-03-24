// src/pages/ListingDetailsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { FaCamera, FaWhatsapp, FaCalendarAlt } from "react-icons/fa";
import { FaBed, FaBath, FaCar, FaRulerCombined } from "react-icons/fa";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./listingDetailsPage.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const TILE_URL_EN = "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png";
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

/* ================= FX ================= */
const FX_SYMBOLS = ["USD", "EUR", "AED"];
const FX_PROVIDER_FRANKFURTER = "https://api.frankfurter.app"; // base: EUR
const FX_PROVIDER_ERAPI = "https://open.er-api.com/v6/latest/EUR"; // base: EUR

function toMoneyNumber(v) {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;

  const s = String(v).trim();
  if (!s) return null;

  const cleaned = s.replace(/[^\d.,-]/g, "").replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatInt(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "-";
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(num);
  } catch {
    return num.toLocaleString();
  }
}

function formatPriceLabel({ listingType, currency, amount }) {
  const a = toMoneyNumber(amount);
  if (!a || a <= 0) return "Price on request";

  const ccy = (currency || "USD").toUpperCase();
  const num = formatInt(a);

  if (listingType === "FOR_RENT") return `${ccy} ${num} / month`;
  if (listingType === "OFF_PLAN") return `From ${ccy} ${num}`;
  return `${ccy} ${num}`;
}

function convertViaEur(amount, from, to, ratesEurBased) {
  const a = toMoneyNumber(amount);
  if (a == null || a <= 0) return null;

  const f = String(from || "EUR").toUpperCase();
  const t = String(to || "EUR").toUpperCase();
  if (f === t) return a;

  const eurTo = (ccy) => {
    if (ccy === "EUR") return 1;
    const r = toMoneyNumber(ratesEurBased?.[ccy]);
    return r && r > 0 ? r : null;
  };

  const eurToFrom = eurTo(f);
  const eurToTo = eurTo(t);
  if (!eurToFrom || !eurToTo) return null;

  const inEur = a / eurToFrom;
  return inEur * eurToTo;
}

async function fetchJsonWithTimeout(url, { signal, timeoutMs = 8000 } = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);

  const onAbort = () => ac.abort();
  if (signal) {
    if (signal.aborted) ac.abort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    const res = await fetch(url, {
      signal: ac.signal,
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
    return data;
  } finally {
    clearTimeout(t);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

async function loadFxRatesEurBased(signal) {
  // 1) Backend proxy (optional)
  try {
    const proxyUrl = `${API_BASE}/fx/latest?from=EUR&to=USD,AED`;
    const d = await fetchJsonWithTimeout(proxyUrl, { signal, timeoutMs: 5000 });
    const rates = d?.rates || d;
    if (rates?.USD && rates?.AED) return rates;
  } catch {
    // ignore
  }

  // 2) Frankfurter
  try {
    const url = `${FX_PROVIDER_FRANKFURTER}/latest?from=EUR&to=USD,AED`;
    const d = await fetchJsonWithTimeout(url, { signal });
    if (d?.rates?.USD && d?.rates?.AED) return d.rates;
  } catch {
    // ignore
  }

  // 3) ER-API fallback (base EUR)
  const d2 = await fetchJsonWithTimeout(FX_PROVIDER_ERAPI, { signal });
  const r2 = d2?.rates;
  if (r2?.USD && r2?.AED) return { USD: r2.USD, AED: r2.AED };

  throw new Error("FX unavailable (all providers failed)");
}

export default function ListingDetailsPage() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [item, setItem] = useState(null);

  const [lbOpen, setLbOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);

  const [fxTo, setFxTo] = useState("USD");
  const [fx, setFx] = useState({ loading: true, err: "", rates: {} });

  /* =========================
     ✅ Schedule-a-call lead form state
  ========================= */
  const [leadForm, setLeadForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    note: "",
  });
  const [leadSending, setLeadSending] = useState(false);
  const [leadSent, setLeadSent] = useState(false);
  const [leadErr, setLeadErr] = useState("");

  // ✅ fetch FX once (robust: multiple providers)
  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      setFx((s) => ({ ...s, loading: true, err: "" }));
      try {
        const rates = await loadFxRatesEurBased(ac.signal);
        setFx({ loading: false, err: "", rates: rates || {} });
      } catch (e) {
        if (ac.signal.aborted) return;
        setFx({ loading: false, err: e?.message || "FX unavailable", rates: {} });
      }
    })();

    return () => ac.abort();
  }, []);

  // ✅ fetch listing
  useEffect(() => {
    let alive = true;

    function normalizeOne(data) {
      const raw =
        data?.item ||
        data?.listing ||
        data?.data ||
        (data && typeof data === "object" && !Array.isArray(data) ? data : null);

      if (!raw) return null;

      return {
        ...raw,
        mainImageUrl: raw.mainImageUrl || raw.coverImageUrl || raw.heroImageUrl || raw.imageUrl || "",
        images: Array.isArray(raw.images)
          ? raw.images
          : Array.isArray(raw.gallery)
            ? raw.gallery
            : Array.isArray(raw.media)
              ? raw.media
              : [],
        developerName: raw.developerName || raw.developer || raw.developer_name || "",
        locationLabel:
          raw.locationLabel ||
          raw.location ||
          raw.addressText ||
          raw.address ||
          [raw.country, raw.city, raw.area].filter(Boolean).join(", "),
        startingPrice: raw.startingPrice ?? raw.priceFrom ?? raw.price ?? raw.starting_price,
        currency: raw.currency || raw.ccy || raw.priceCurrency || raw.currencyCode || "USD",
        paymentPlan: raw.paymentPlan || raw.payment_plan || raw.plan || "",
        completionYear: raw.completionYear || raw.handover || raw.completion_date || "",
        addressText: raw.addressText || raw.address || raw.location || "",
        community: raw.community || raw.area || "",

        // ✅ brochure url normalization (supports multiple possible backend field names)
        brochureUrl:
          raw.brochureUrl ||
          raw.brochureURL ||
          raw.brochure ||
          raw.brochureLink ||
          raw.pdfUrl ||
          raw.pdfURL ||
          null,
      };
    }

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const res = await fetch(`${API_BASE}/public/listings/${id}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to load listing");
        if (!alive) return;

        const normalized = normalizeOne(data);
        if (!normalized) {
          setItem(null);
          setErr("Listing not found (empty response).");
          return;
        }

        setItem(normalized);
      } catch (e) {
        if (!alive) return;
        setItem(null);
        setErr(e?.message || "Failed to load listing");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  const imgs = useMemo(() => {
    if (!item) return [];
    const arr = [];
    if (item.mainImageUrl) arr.push(item.mainImageUrl);

    const candidates = Array.isArray(item.images) ? item.images : [];
    candidates.forEach((im) => {
      const u = typeof im === "string" ? im : im?.url;
      if (u && u !== item.mainImageUrl) arr.push(u);
    });

    return Array.from(new Set(arr));
  }, [item]);

  const main = imgs[0];
  const sideTop = imgs[1];
  const sideBottom = imgs[2];

  const breadcrumbLabel = useMemo(() => {
    const t = item?.listingType;
    if (t === "OFF_PLAN") return "Off-Plan";
    if (t === "FOR_SALE") return "For Sale";
    if (t === "FOR_RENT") return "For Rent";
    return "Listing";
  }, [item?.listingType]);

  const breadcrumbLink = useMemo(() => {
    const t = item?.listingType;
    if (t === "OFF_PLAN") return "/off-plan";
    if (t === "FOR_SALE") return "/sale";
    if (t === "FOR_RENT") return "/rent";
    return "/";
  }, [item?.listingType]);

  const open = (i) => {
    if (!imgs.length) return;
    setLbIndex(i);
    setLbOpen(true);
    document.body.style.overflow = "hidden";
  };

  const close = () => {
    setLbOpen(false);
    document.body.style.overflow = "";
  };

  const next = () => setLbIndex((i) => (i + 1) % imgs.length);
  const prev = () => setLbIndex((i) => (i - 1 + imgs.length) % imgs.length);

  useEffect(() => {
    if (!lbOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lbOpen, imgs.length]);

  const formatSize = (it) => {
    const sqm = it?.sizeSqm != null && it?.sizeSqm !== "" ? Number(it.sizeSqm) : null;
    const sqft = it?.sizeSqft != null && it?.sizeSqft !== "" ? Number(it.sizeSqft) : null;

    const sqmOk = sqm != null && !Number.isNaN(sqm) && sqm > 0;
    const sqftOk = sqft != null && !Number.isNaN(sqft) && sqft > 0;

    if (sqmOk && sqftOk) return `${sqm.toLocaleString()} m² (${sqft.toLocaleString()} sqft)`;
    if (sqmOk) return `${sqm.toLocaleString()} m²`;
    if (sqftOk) return `${sqft.toLocaleString()} sqft`;
    return null;
  };

  const showFacts = useMemo(() => {
    if (!item) return false;
    return (
      item.bedrooms != null ||
      item.bathrooms != null ||
      item.parking != null ||
      item.sizeSqm != null ||
      item.sizeSqft != null
    );
  }, [item]);

  const lat = item?.latitude != null && item.latitude !== "" ? Number(item.latitude) : null;
  const lng = item?.longitude != null && item.longitude !== "" ? Number(item.longitude) : null;
  const hasMap = Number.isFinite(lat) && Number.isFinite(lng);
  const googleMapsUrl = hasMap ? `https://www.google.com/maps?q=${lat},${lng}` : null;

  const baseCcy = useMemo(() => String(item?.currency || "USD").toUpperCase(), [item?.currency]);
  const baseAmount = useMemo(() => toMoneyNumber(item?.startingPrice), [item?.startingPrice]);

  useEffect(() => {
    if (!item) return;
    setFxTo(FX_SYMBOLS.includes(baseCcy) ? baseCcy : "USD");
  }, [item, baseCcy]);

  const canConvert = useMemo(() => {
    return !!baseAmount && baseAmount > 0 && FX_SYMBOLS.includes(baseCcy);
  }, [baseAmount, baseCcy]);

  const displayPrice = useMemo(() => {
    if (!canConvert) return null;

    if (fx.loading || fx.err) return { currency: baseCcy, amount: baseAmount };

    if (!FX_SYMBOLS.includes(fxTo)) return { currency: baseCcy, amount: baseAmount };
    if (fxTo === baseCcy) return { currency: baseCcy, amount: baseAmount };

    const conv = convertViaEur(baseAmount, baseCcy, fxTo, fx.rates);
    if (!conv) return { currency: baseCcy, amount: baseAmount };

    return { currency: fxTo, amount: conv };
  }, [canConvert, baseAmount, baseCcy, fxTo, fx.loading, fx.err, fx.rates]);

  // ✅ BROCHURE: reliable click handler
  const onBrochure = () => {
    const url = String(item?.brochureUrl || "").trim();
    if (!url) return;

    // remove later if you want:
    console.log("Downloading brochure:", url);

    // try open in new tab
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) return;

    // fallback: programmatic click
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.download = "brochure.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (loading) {
    return (
      <section className="ld">
        <div className="ld-inner">
          <div className="ld-crumbs">Loading…</div>
        </div>
      </section>
    );
  }

  if (err) {
    return (
      <section className="ld">
        <div className="ld-inner">
          <nav className="ld-crumbs">
            <Link to="/" className="ld-crumb">
              Aouad Real Estate
            </Link>
            <span className="ld-sep">›</span>
            <span className="ld-crumb ld-crumb--active">Error</span>
          </nav>

          <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 12 }}>{err}</div>
        </div>
      </section>
    );
  }

  if (!item) return null;

  const agentObj = item.assignedAgent || item.agent || null;

  const agentName = agentObj?.fullName || "Agent Name";
  const agentTitle = agentObj?.title || "Property Consultant";
  const agentPhoto = agentObj?.photoUrl || "https://via.placeholder.com/64x64?text=Agent";
  const sizeLabel = formatSize(item);

  const agentId = pickAgentId(item);
  const listingId = item?.id || id || "";
  const waPhone = pickAgentPhone(item);

  const onScheduleCall = () => {
    if (!agentId) {
      window.location.href = "/schedule-call";
      return;
    }
    window.location.href = `/schedule-call?agentId=${encodeURIComponent(agentId)}&listingId=${encodeURIComponent(
      listingId
    )}`;
  };

  const onWhatsApp = () => {
    if (!waPhone) return;

    const shareUrl = `https://aouad-crm-backend.onrender.com/listing/${item?.id || id}`;
    const msg = encodeURIComponent(
      `Hi, I'm interested in this property (${item?.title || "listing"}). Could you please share more details?\n\n${shareUrl}`
    );

    window.open(`https://wa.me/${waPhone}?text=${msg}`, "_blank", "noopener,noreferrer");
  };
  const onSubmitLead = async (e) => {
    e.preventDefault();
    setLeadErr("");
    setLeadSent(false);

    try {
      setLeadSending(true);

      const payload = {
        listingId,
        agentId,
        ...leadForm,
        pageUrl: window.location.href,
      };

      const res = await fetch(`${API_BASE}/public/leads/schedule-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to submit");

      setLeadSent(true);
      setLeadForm({ firstName: "", lastName: "", email: "", phone: "", note: "" });
    } catch (err) {
      setLeadErr(err?.message || "Failed to submit");
    } finally {
      setLeadSending(false);
    }
  };

  return (
    <section className="ld">
      <div className="ld-inner">
        <nav className="ld-crumbs">
          <Link to="/" className="ld-crumb">
            Aouad Real Estate
          </Link>
          <span className="ld-sep">›</span>
          <Link to={breadcrumbLink} className="ld-crumb">
            {breadcrumbLabel}
          </Link>
          <span className="ld-sep">›</span>
          <span className="ld-crumb ld-crumb--active">{item.title}</span>
        </nav>

        <div className="ld-gallery">
          <button className="ld-main" onClick={() => open(0)} type="button" disabled={!main}>
            {main ? <img src={main} alt={item.title} /> : <div className="ld-mainEmpty" />}
          </button>

          <div className="ld-side">
            {sideTop && (
              <button className="ld-thumb" onClick={() => open(1)} type="button">
                <img src={sideTop} alt="" />
              </button>
            )}

            {sideBottom && (
              <button className="ld-thumb" onClick={() => open(2)} type="button">
                <img src={sideBottom} alt="" />
                <span className="ld-pill">
                  <FaCamera />
                  +{Math.max(0, imgs.length - 2)}
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="ld-content">
          <div className="ld-left">
            <span className="ld-typebadge">{item.propertyType || item.listingType || "Property"}</span>

            <h1 className="ld-title">{item.title}</h1>
            <div className="ld-sub">{item.developerName || ""}</div>

            {/* PRICE + converter */}
            <div className="ld-fromRow">
              <div className="ld-fromText">
                {baseAmount && baseAmount > 0 && displayPrice
                  ? formatPriceLabel({
                    listingType: item?.listingType,
                    currency: displayPrice.currency,
                    amount: displayPrice.amount,
                  })
                  : "Price on request"}
              </div>

              {canConvert ? (
                <div className="ld-fxInline" aria-label="Currency converter">
                  <div className="ld-fxSeg" role="tablist" aria-label="Convert currency">
                    {FX_SYMBOLS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={"ld-fxSegBtn" + (fxTo === c ? " is-active" : "")}
                        onClick={() => setFxTo(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}></div>
                </div>
              ) : null}
            </div>

            {showFacts && (
              <div className="ld-facts">
                {item.bedrooms != null && (
                  <div className="ld-fact">
                    <FaBed className="ld-factIcon" />
                    <span className="ld-factVal">{item.bedrooms}</span>
                  </div>
                )}
                {item.bathrooms != null && (
                  <div className="ld-fact">
                    <FaBath className="ld-factIcon" />
                    <span className="ld-factVal">{item.bathrooms}</span>
                  </div>
                )}
                {item.parking != null && (
                  <div className="ld-fact">
                    <FaCar className="ld-factIcon" />
                    <span className="ld-factVal">{item.parking}</span>
                  </div>
                )}
                {sizeLabel && (
                  <div className="ld-fact">
                    <FaRulerCombined className="ld-factIcon" />
                    <span className="ld-factVal">{sizeLabel}</span>
                  </div>
                )}
              </div>
            )}

            <div className="ld-pay">
              <span className="ld-paylabel">Payment Terms:</span>
              <span className="ld-payvalue">{item.paymentPlan || "-"}</span>
              <span className="ld-paydot">i</span>
            </div>

            <div className="ld-actionsRow">
              {item.brochureUrl ? (
                <button className="ld-btn" type="button" onClick={onBrochure}>
                  Download Brochure
                </button>
              ) : (
                <button className="ld-btn" type="button" disabled title="No brochure uploaded">
                  Download Brochure
                </button>
              )}

              <div className="ld-actionsIcons">
                <button className="ld-ico-btn" type="button" onClick={onScheduleCall} title="Schedule a call">
                  <FaCalendarAlt className="ld-ico" />
                </button>

                <button
                  className={"ld-ico-btn" + (waPhone ? "" : " is-disabled")}
                  type="button"
                  onClick={onWhatsApp}
                  disabled={!waPhone}
                  title={waPhone ? "WhatsApp agent" : "WhatsApp number not set"}
                >
                  <FaWhatsapp className="ld-ico" />
                </button>
              </div>
            </div>

            <div className="ld-section">
              <h2 className="ld-h2">About</h2>
              <p className="ld-p">{item.description || "-"}</p>
            </div>

            <div className="ld-section">
              <h2 className="ld-h2">Location</h2>

              {item.addressText && googleMapsUrl ? (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ marginBottom: 10, opacity: 0.8, display: "inline-block" }}
                >
                  {item.addressText}
                </a>
              ) : item.addressText ? (
                <div style={{ marginBottom: 10, opacity: 0.8 }}>{item.addressText}</div>
              ) : null}

              <div className="ld-map" style={{ overflow: "hidden", borderRadius: 14 }}>
                {hasMap ? (
                  <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
                    <MapContainer
                      center={[lat, lng]}
                      zoom={14}
                      style={{ height: 280, width: "100%" }}
                      scrollWheelZoom={false}
                    >
                      <TileLayer attribution="&copy; OpenStreetMap contributors" url={TILE_URL_EN} />
                      <Marker position={[lat, lng]} />
                    </MapContainer>
                  </a>
                ) : (
                  <div className="ld-mapEmpty">Map not set</div>
                )}
              </div>
            </div>
          </div>

          <aside className="ld-right">
            <div className="ld-rightSticky">
              <div className="ld-card">
                <div className="ld-agent">
                  <img
                    className="ld-agentimg"
                    src={agentPhoto}
                    alt={agentName}
                    onError={(e) => {
                      e.currentTarget.src = "https://via.placeholder.com/64x64?text=Agent";
                    }}
                  />
                  <div className="ld-agentmeta">
                    <div className="ld-agentname">{agentName}</div>
                    <div className="ld-agentrole">{agentTitle}</div>
                  </div>
                </div>

                <div className="ld-cardtitle">SCHEDULE A CALL</div>
                <div className="ld-cardsub">
                  Fill out the form below, and one of our experts will contact you shortly with more details.
                </div>

                <div className="ld-divider" />

                <form className="ld-form" onSubmit={onSubmitLead}>
                  <div className="ld-row2">
                    <label className="ld-field">
                      <span>First Name *</span>
                      <input
                        value={leadForm.firstName}
                        onChange={(e) => setLeadForm((s) => ({ ...s, firstName: e.target.value }))}
                        required
                      />
                    </label>
                    <label className="ld-field">
                      <span>Last Name *</span>
                      <input
                        value={leadForm.lastName}
                        onChange={(e) => setLeadForm((s) => ({ ...s, lastName: e.target.value }))}
                        required
                      />
                    </label>
                  </div>

                  <label className="ld-field">
                    <span>Email</span>
                    <input
                      value={leadForm.email}
                      onChange={(e) => setLeadForm((s) => ({ ...s, email: e.target.value }))}
                      type="email"
                      placeholder="name@email.com"
                    />
                  </label>

                  <label className="ld-field">
                    <span>Phone *</span>
                    <input
                      value={leadForm.phone}
                      onChange={(e) => setLeadForm((s) => ({ ...s, phone: e.target.value }))}
                      placeholder="+961"
                      required
                    />
                  </label>

                  <label className="ld-field">
                    <span>Note</span>
                    <input
                      value={leadForm.note}
                      onChange={(e) => setLeadForm((s) => ({ ...s, note: e.target.value }))}
                      placeholder="Preferred time / questions…"
                    />
                  </label>

                  {leadErr ? <div style={{ marginTop: 10, color: "crimson" }}>{leadErr}</div> : null}
                  {leadSent ? (
                    <div style={{ marginTop: 10, color: "green" }}>Submitted — we’ll contact you shortly.</div>
                  ) : null}

                  <button className="ld-submit" type="submit" disabled={leadSending}>
                    {leadSending ? "Submitting…" : "Submit"}
                  </button>
                </form>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {lbOpen ? (
        <div className="lb" onClick={close}>
          <button className="lb-x" onClick={close} type="button">
            ✕
          </button>

          {imgs.length > 1 ? (
            <>
              <button className="lb-nav lb-prev" type="button" onClick={(e) => (e.stopPropagation(), prev())}>
                ‹
              </button>
              <button className="lb-nav lb-next" type="button" onClick={(e) => (e.stopPropagation(), next())}>
                ›
              </button>
            </>
          ) : null}

          <img className="lb-img" src={imgs[lbIndex]} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}
    </section>
  );
}

function pickAgentId(p) {
  return p?.assignedAgent?.id || p?.assignedAgentId || p?.agent?.id || p?.agentId || "";
}

function pickAgentPhone(p) {
  const raw =
    p?.assignedAgent?.phone ||
    p?.assignedAgent?.whatsapp ||
    p?.agent?.phone ||
    p?.agent?.whatsapp ||
    p?.agentPhone ||
    p?.whatsapp ||
    p?.phone ||
    "";

  const cleaned = String(raw).trim().replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  return cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
}