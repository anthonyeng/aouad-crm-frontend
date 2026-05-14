// src/agent/AgentApp.jsx
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
    FaBars,
    FaTimes,
    FaHome,
    FaUsers,
    FaBuilding,
    FaCalendarAlt,
    FaCog,
    FaSearch,
    FaTag,
} from "react-icons/fa";
import "./agent.css";
import { decodeJwt, logout } from "../lib/auth";

const NAV = [
    { to: "/agent", label: "Dashboard", icon: FaHome, end: true },
    { to: "/agent/leads", label: "Leads", icon: FaUsers },
    { to: "/agent/listings", label: "My Listings", icon: FaBuilding },
    { to: "/agent/sell-requests", label: "Sell Requests", icon: FaTag },
    { to: "/agent/schedule", label: "Schedule", icon: FaCalendarAlt },
    { to: "/agent/settings", label: "Settings", icon: FaCog },
];

function initialsFromName(nameOrEmail) {
    const s = String(nameOrEmail || "").trim();
    if (!s) return "AG";
    const parts = s.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function usePageTitle() {
    const { pathname } = useLocation();

    return useMemo(() => {
        if (pathname === "/agent") return "Dashboard";
        if (pathname.startsWith("/agent/leads")) return "Leads";
        if (pathname.startsWith("/agent/listings")) return "My Listings";
        if (pathname.startsWith("/agent/sell-requests")) return "Sell Requests";
        if (pathname.startsWith("/agent/schedule")) return "Schedule";
        if (pathname.startsWith("/agent/settings")) return "Settings";
        return "Agent";
    }, [pathname]);
}

export default function AgentApp() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const title = usePageTitle();
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const [search, setSearch] = useState("");

    const token = localStorage.getItem("token");
    const payload = token ? decodeJwt(token) : null;

    // Hard guard: only AGENT
    useEffect(() => {
        if (!payload || payload.role !== "AGENT") {
            logout();
            navigate("/login", { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => setSidebarOpen(false), [pathname]);

    useEffect(() => {
        if (!sidebarOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => (document.body.style.overflow = prev);
    }, [sidebarOpen]);

    function submitTopSearch(e) {
        e.preventDefault();
        const q = search.trim();
        navigate(q ? `/agent/listings?q=${encodeURIComponent(q)}` : "/agent/listings");
    }

    const nameOrEmail = payload?.name || payload?.email || "Agent";
    const initials = initialsFromName(nameOrEmail);

    return (
        <div className="agt">
            {sidebarOpen && (
                <button
                    className="agt-backdrop"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close sidebar"
                />
            )}

            <aside className={`agt-side ${sidebarOpen ? "is-open" : ""}`}>
                <div className="agt-sideTop">
                    <div className="agt-brand">
                        <div className="agt-brandMark">A</div>
                        <div className="agt-brandText">
                            <div className="agt-brandName">Agent</div>
                            <div className="agt-brandSub">CRM / Productivity</div>
                        </div>
                    </div>

                    <button
                        className="agt-close"
                        onClick={() => setSidebarOpen(false)}
                        aria-label="Close sidebar"
                    >
                        <FaTimes />
                    </button>
                </div>

                <nav className="agt-nav">
                    {NAV.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                className={({ isActive }) =>
                                    `agt-navLink ${isActive ? "is-active" : ""}`
                                }
                            >
                                <span className="agt-navIcon">
                                    <Icon />
                                </span>
                                <span>{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="agt-sideFoot">
                    <div className="agt-user">
                        <div className="agt-avatar">{initials}</div>
                        <div className="agt-userMeta">
                            <div className="agt-userName">{payload?.email || "Agent"}</div>
                            <div className="agt-userRole">Agent access</div>
                        </div>
                    </div>
                </div>
            </aside>

            <div className="agt-main">
                <header className="agt-top">
                    <div className="agt-topLeft">
                        <button
                            className="agt-burger"
                            onClick={() => setSidebarOpen(true)}
                            aria-label="Open sidebar"
                        >
                            <FaBars />
                        </button>

                        <div className="agt-titleWrap">
                            <div className="agt-title">{title}</div>
                            <div className="agt-crumbs">Agent / {title}</div>
                        </div>
                    </div>

                    <div className="agt-topRight">
                        <form className="agt-search" onSubmit={submitTopSearch}>
                            <FaSearch className="agt-searchIcon" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search my listings (title, area, developer...)"
                            />
                        </form>

                        <button
                            className="agt-btn"
                            type="button"
                            onClick={() => navigate("/agent/leads")}
                            title="Open my leads"
                        >
                            My Leads
                        </button>
                    </div>
                </header>

                <main className="agt-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
