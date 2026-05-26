// src/components/LatestOffPlanSection.jsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./latestOffPlanSection.css";

import {
  FaWhatsapp,
  FaChevronRight,
  FaStar,
  FaMapMarkerAlt,
  FaRegCircle,
  FaCalendarAlt,
} from "react-icons/fa";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const PAGE_LIMIT = 12;

export default function LatestOffPlanSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function fetchJson(url) {
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Failed to fetch: ${res.status}`);
      return data;
    }

    function normalizeList(data) {
      const list = Array.isArray(data) ? data : data?.items;
      return Array.isArray(list) ? list : [];
    }

    // ✅ fallback sorting if backend doesn't sort yet
    function sortFeatured(list) {
      return [...list].sort((a, b) => {
        const af = a?.featured ? 1 : 0;
        const bf = b?.featured ? 1 : 0;
        if (af !== bf) return bf - af; // featured first

        const ao = Number(a?.featuredOrder ?? 0);
        const bo = Number(b?.featuredOrder ?? 0);
        if (ao !== bo) return ao - bo; // lower order = higher priority

        const ad = new Date(a?.createdAt || a?.updatedAt || 0).getTime() || 0;
        const bd = new Date(b?.createdAt || b?.updatedAt || 0).getTime() || 0;
        return bd - ad; // newest first as tie-breaker
      });
    }

    async function load() {
      try {
        setLoading(true);

        // ✅ best: backend sorts by featuredOrder
        const candidates = [
          `${API_BASE}/public/listings?listingType=OFF_PLAN&featured=true&sort=featuredOrder&limit=${PAGE_LIMIT}`,
          `${API_BASE}/public/listings?listingType=OFF_PLAN&featured=true&orderBy=featuredOrder&limit=${PAGE_LIMIT}`,
          `${API_BASE}/public/listings?listingType=OFF_PLAN&featured=true&limit=${PAGE_LIMIT}`,

          // your old fallbacks
          `${API_BASE}/public/listings?listingType=OFFPLAN&featured=true&limit=${PAGE_LIMIT}`,
          `${API_BASE}/public/listings?category=OFF_PLAN&featured=true&limit=${PAGE_LIMIT}`,
          `${API_BASE}/public/listings?projectType=OFF_PLAN&featured=true&limit=${PAGE_LIMIT}`,
          `${API_BASE}/public/listings?isOffPlan=true&featured=true&limit=${PAGE_LIMIT}`,
        ];

        let list = [];
        let lastErr = null;

        for (const url of candidates) {
          try {
            const data = await fetchJson(url);
            const arr = normalizeList(data);
            if (arr.length) {
              list = arr;
              break;
            }
          } catch (e) {
            lastErr = e;
          }
        }

        if (!alive) return;

        // ✅ only sort client-side as a fallback
        setItems(sortFeatured(list));
        void lastErr;
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setItems([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="lop">
      <div className="lop-inner">
        <div className="lop-top">
          <h2 className="lop-title">TOP PROJECTS</h2>

          <Link
            to="/off-plan"
            className="lop-viewall"
            onClick={() => window.scrollTo(0, 0)}
          >
            View all <FaChevronRight className="lop-chev" />
          </Link>
        </div>

        {loading ? <CardsSkeleton /> : <CardsCarousel items={items} />}
      </div>
    </section>
  );
}

/* ================= SKELETON ================= */
function CardsSkeleton() {
  return (
    <div className="lop-scroll">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="lop-card" style={{ pointerEvents: "none" }}>
          <div className="lop-media" style={{ background: "#eee" }} />
          <div className="lop-body">
            <div style={{ height: 18, width: "70%", background: "#eee", borderRadius: 6 }} />
            <div style={{ height: 12, width: "50%", background: "#f0f0f0", borderRadius: 6, marginTop: 10 }} />
            <div style={{ height: 12, width: "60%", background: "#f0f0f0", borderRadius: 6, marginTop: 8 }} />
            <div className="lop-line" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ height: 14, width: 120, background: "#eee", borderRadius: 6 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ width: 38, height: 38, background: "#eee", borderRadius: 10 }} />
                <div style={{ width: 38, height: 38, background: "#eee", borderRadius: 10 }} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================= CARDS CAROUSEL ================= */
function CardsCarousel({ items }) {
  const viewportRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(4);

  const getVisibleCount = () => {
    const el = viewportRef.current;
    if (!el) return 4;
    const card = el.querySelector(".lop-card");
    if (!card) return 4;

    const cardW = card.getBoundingClientRect().width;
    const vpW = el.getBoundingClientRect().width;

    return Math.max(1, Math.round(vpW / cardW));
  };

  useEffect(() => {
    const update = () => setVisibleCount(getVisibleCount());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const maxIndex = Math.max(0, items.length - visibleCount);

  const onScroll = () => {
    const el = viewportRef.current;
    if (!el) return;

    const card = el.querySelector(".lop-card");
    if (!card) return;

    const cardW = card.getBoundingClientRect().width;
    const gap = 26;
    const step = cardW + gap;

    const nextIndex = Math.round(el.scrollLeft / step);
    setIndex(Math.max(0, Math.min(maxIndex, nextIndex)));
  };

  return (
    <>
      <div className="lop-scroll" ref={viewportRef} onScroll={onScroll}>
        {items.map((p) => {
          const imgUrl =
            p.mainImageUrl ||
            p.images?.[0]?.url ||
            p.images?.[0]?.imageUrl ||
            p.images?.[0]?.src ||
            null;

          return (
            <Link
              key={p.id}
              to={`/listing/${p.id}`}
              className="lop-card"
              onClick={() => window.scrollTo(0, 0)}
              aria-label={`Open listing: ${p.title || p.location || p.id}`}
            >
              <div className="lop-media">
                {imgUrl ? (
                  <img
                    className="lop-img"
                    src={imgUrl}
                    alt={p.title || "Off-plan property"}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="lop-img" style={{ background: "#eee" }} />
                )}

                <div className="lop-badges">
                  {p.featured && (
                    <div className="lop-badge lop-badge--light">
                      Featured <FaStar className="lop-star" />
                    </div>
                  )}

                  {p.handover && (
                    <div className="lop-badge lop-badge--dark">{p.handover}</div>
                  )}

                  {(p.developerName || p.developer) && (
                    <div className="lop-badge lop-badge--black">
                      {p.developerName || p.developer}
                    </div>
                  )}
                </div>
              </div>

              <div className="lop-body">
                <h3 className="lop-card-title">{p.title || "Off-plan Property"}</h3>

                <div className="lop-meta">
                  <div className="lop-meta-row">
                    <FaMapMarkerAlt className="lop-mini" />
                    <span>
                      {(() => {
                        const parts = (p.location || [p.country, p.city, p.area].filter(Boolean).join(", ") || "-").split(", ");
                        const unique = parts.filter((v, i) => parts.findIndex(p => p.toLowerCase() === v.toLowerCase()) === i);
                        return unique.join(", ");
                      })()}
                    </span>
                  </div>

                  <div className="lop-meta-row">
                    <FaRegCircle className="lop-mini" />
                    <span>Payment Plan: {p.paymentPlan || "-"}</span>
                  </div>
                </div>

                <div className="lop-line" />

                <div className="lop-bottom">
                  <span className="lop-from">{formatFromPrice(p)}</span>

                  <div className="lop-actions">
                    <button
                      className="lop-ico-btn"
                      aria-label="Schedule a call"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        const agentId =
                          p?.assignedAgent?.id ||
                          p?.assignedAgentId ||
                          p?.agent?.id ||
                          p?.agentId ||
                          "";

                        const listingId = p?.id || "";

                        if (!agentId) {
                          window.location.href = "/schedule-call";
                          return;
                        }

                        window.location.href = `/schedule-call?agentId=${encodeURIComponent(
                          agentId
                        )}&listingId=${encodeURIComponent(listingId)}`;
                      }}
                    >
                      <FaCalendarAlt className="lop-action-ico" />
                    </button>

                    <button
                      className="lop-ico-btn"
                      aria-label="WhatsApp agent"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        const phone = pickAgentPhone(p);
                        if (!phone) return;

                        const msg = encodeURIComponent(
                          `Hi, I'm interested in this property. Could you please share more details?`
                        );

                        window.open(
                          `https://wa.me/${phone}?text=${msg}`,
                          "_blank",
                          "noopener,noreferrer"
                        );
                      }}
                    >
                      <FaWhatsapp className="lop-action-ico" />
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {maxIndex > 0 && (
        <div className="lop-section-dots" aria-hidden="true">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <span
              key={i}
              className={"lop-section-dot" + (i === index ? " is-active" : "")}
            />
          ))}
        </div>
      )}
    </>
  );
}

/* ================= helpers ================= */
function formatFromPrice(p) {
  const cur = p.currency || "USD";
  const n = Number(p.priceFrom ?? p.startingPrice ?? p.price ?? 0) || 0;
  if (!n) return "Price on request";
  return `From ${cur} ${n.toLocaleString()}`;
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