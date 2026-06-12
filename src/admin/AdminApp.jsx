// src/admin/AdminApp.jsx
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  FaBars,
  FaTimes,
  FaHome,
  FaUsers,
  FaUserTie,
  FaCog,
  FaSearch,
  FaPlus,
  FaBuilding,
  FaBriefcase,
  FaQuoteRight,
  FaSortAmountDown,
  FaCalendarCheck,
} from "react-icons/fa";
import "./admin.css";

/* =======================
   NAVIGATION CONFIG
======================= */
const NAV = [
  { to: "/admin", label: "Dashboard", icon: FaHome, end: true },

  // CRM
  { to: "/admin/leads", label: "Leads", icon: FaUsers },
  { to: "/admin/agents", label: "Agents", icon: FaUserTie },

  // Listings
  { to: "/admin/listings", label: "Search Listings", icon: FaBuilding },
  { to: "/admin/listing-order", label: "Listing Order", icon: FaSortAmountDown },
  { to: "/admin/add-listing", label: "Add Listing", icon: FaPlus },

  // ✅ Client Stories
  { to: "/admin/client-stories", label: "Client Stories", icon: FaQuoteRight },

  // Exhibitions
  { to: "/admin/exhibitions", label: "Exhibitions", icon: FaCalendarCheck },

  // Careers
  { to: "/admin/careers", label: "Careers", icon: FaBriefcase },

  // Settings
  { to: "/admin/settings", label: "Settings", icon: FaCog },
];

/* =======================
   PAGE TITLE HOOK
======================= */
function usePageTitle() {
  const { pathname } = useLocation();

  return useMemo(() => {
    if (pathname === "/admin") return "Dashboard";

    // CRM
    if (pathname.startsWith("/admin/leads")) return "Leads";
    if (pathname.startsWith("/admin/agents")) return "Agents";

    // Listings
    if (pathname.startsWith("/admin/listing-order")) return "Listing Order";

    if (pathname.startsWith("/admin/listings")) return "Search Listings";
    if (pathname.startsWith("/admin/add-listing")) return "Add Listing";

    // ✅ Client Stories
    if (pathname.startsWith("/admin/client-stories")) return "Client Stories";

    // Exhibitions
    if (pathname.startsWith("/admin/exhibitions")) return "Exhibitions";

    // Careers
    if (pathname.startsWith("/admin/careers")) return "Careers";

    // Settings
    if (pathname.startsWith("/admin/settings")) return "Settings";

    return "Admin";
  }, [pathname]);
}

/* =======================
   ADMIN APP
======================= */
export default function AdminApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");

  const title = usePageTitle();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // lock body scroll when sidebar open
  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, [sidebarOpen]);

  function submitTopSearch(e) {
    e.preventDefault();
    const q = search.trim();
    navigate(
      q
        ? `/admin/listings?q=${encodeURIComponent(q)}`
        : "/admin/listings"
    );
  }

  return (
    <div className="adm">
      {sidebarOpen && (
        <button
          className="adm-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      {/* =======================
          SIDEBAR
      ======================= */}
      <aside className={`adm-side ${sidebarOpen ? "is-open" : ""}`}>
        <div className="adm-sideTop">
          <div className="adm-brand">
            <div className="adm-brandMark">A</div>
            <div className="adm-brandText">
              <div className="adm-brandName">Admin</div>
              <div className="adm-brandSub">CRM / Management</div>
            </div>
          </div>

          <button
            className="adm-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <FaTimes />
          </button>
        </div>

        <nav className="adm-nav">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `adm-navLink ${isActive ? "is-active" : ""}`
                }
              >
                <span className="adm-navIcon">
                  <Icon />
                </span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="adm-sideFoot">
          <div className="adm-user">
            <div className="adm-avatar">AT</div>
            <div className="adm-userMeta">
              <div className="adm-userName">Admin</div>
              <div className="adm-userRole">Full access</div>
            </div>
          </div>
        </div>
      </aside>

      {/* =======================
          MAIN
      ======================= */}
      <div className="adm-main">
        <header className="adm-top">
          <div className="adm-topLeft">
            <button
              className="adm-burger"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <FaBars />
            </button>

            <div className="adm-titleWrap">
              <div className="adm-title">{title}</div>
              <div className="adm-crumbs">Admin / {title}</div>
            </div>
          </div>

          <div className="adm-topRight">
            <form className="adm-search" onSubmit={submitTopSearch}>
              <FaSearch className="adm-searchIcon" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search listings (title, location, agent...)"
              />
            </form>

            <button
              className="adm-btn"
              type="button"
              onClick={() => navigate("/admin/leads")}
              title="Create a new lead"
            >
              New Lead
            </button>
          </div>
        </header>

        <main className="adm-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
