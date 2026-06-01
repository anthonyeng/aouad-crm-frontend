// src/components/Header.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logo from "./assets/logo_real_state_gold.png";
import "./header.css";

// ✅ WhatsApp
const WHATSAPP_URL =
    "https://wa.me/9613070383?text=" +
    encodeURIComponent("Hello, I’m interested in your real estate services.");

export default function Header() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [openAcc, setOpenAcc] = useState(null); // "listings" | "regions" | "company" | null

    useEffect(() => {
        if (!mobileOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => (document.body.style.overflow = prev);
    }, [mobileOpen]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") {
                setMobileOpen(false);
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    const toggleAcc = (key) => setOpenAcc((v) => (v === key ? null : key));

    const closeMobile = () => {
        setMobileOpen(false);
        setOpenAcc(null);
    };

    return (
        <header className="header">
            <div className="header-inner">
                {/* MOBILE: burger */}
                <button
                    className="m-burger"
                    type="button"
                    aria-label="Open menu"
                    aria-expanded={mobileOpen}
                    aria-controls="mobile-drawer"
                    onClick={() => setMobileOpen(true)}
                >
                    <BurgerIcon />
                </button>

                {/* LOGO */}
                <div className="brand">
                    <Link to="/" aria-label="Home">
                        <img src={logo} alt="Logo" className="brand-logo-img" />
                    </Link>
                </div>

                {/* DESKTOP NAV */}
                <nav className="nav">
                    {/* Listings (small dropdown) */}
                    <div className="nav-dd nav-dd--menu">
                        <a
                            className="nav-item nav-item--pill"
                            href="#"
                            onClick={(e) => e.preventDefault()}
                        >
                            Listings <CaretDown />
                        </a>

                        <div className="dropdown dropdown--menu">
                            <Link className="menu-item" to="/off-plan">
                                <div className="menu-title">Off-Plan</div>
                                <div className="menu-subtitle">
                                    New developments under construction
                                </div>
                            </Link>

                            <Link className="menu-item" to="/sale">
                                <div className="menu-title">For Sale</div>
                                <div className="menu-subtitle">Apartment and villas for sale</div>
                            </Link>

                            {/* <Link className="menu-item" to="/rent">
                                <div className="menu-title">For Rent</div>
                                <div className="menu-subtitle">Apartment and villas for rent</div>
                            </Link> */}

                            <Link className="menu-item" to="/sell">
                                <div className="menu-title">Sell Your Property</div>
                                <div className="menu-subtitle">List your property with our agent</div>
                            </Link>
                        </div>
                    </div>

                    {/* Regions (mega) */}
                    <div className="nav-dd nav-dd--mega">
                        <a
                            className="nav-item nav-item--pill"
                            href="#"
                            onClick={(e) => e.preventDefault()}
                        >
                            Regions <CaretDown />
                        </a>

                        <div className="dropdown dropdown--mega">
                            <div className="mega-grid">
                                {/* Middle East */}
                                <div className="mega-col">
                                    <div className="mega-section">
                                        <div className="mega-h">Middle East</div>

                                        <Link className="mega-link" to="/listings?country=dubai">
                                            Dubai
                                        </Link>
                                        <Link className="mega-link" to="/listings?country=lebanon">
                                            Lebanon
                                        </Link>
                                        <Link
                                            className="mega-link"
                                            to="/listings?country=saudi-arabia"
                                        >
                                            Saudi Arabia
                                        </Link>
                                    </div>
                                </div>

                                {/* Europe */}
                                <div className="mega-col">
                                    <div className="mega-section">
                                        <div className="mega-h">Europe</div>

                                        <Link className="mega-link" to="/listings?country=greece">
                                            Greece
                                        </Link>
                                        <Link className="mega-link" to="/listings?country=cyprus">
                                            Cyprus
                                        </Link>
                                        <Link className="mega-link" to="/listings?country=france">
                                            France
                                        </Link>
                                        <Link className="mega-link" to="/listings?country=spain">
                                            Spain
                                        </Link>
                                        <Link className="mega-link" to="/listings?country=italy">
                                            Italy
                                        </Link>
                                    </div>
                                </div>

                                <div className="mega-col">
                                    <div className="mega-section">
                                        <div className="mega-h">More</div>
                                        <div
                                            className="mega-link"
                                            style={{ opacity: 0.6, pointerEvents: "none" }}
                                        >
                                            Coming soon…
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Company */}
                    <div className="nav-dd nav-dd--menu">
                        <a
                            className="nav-item nav-item--pill"
                            href="#"
                            onClick={(e) => e.preventDefault()}
                        >
                            Company <CaretDown />
                        </a>

                        <div className="dropdown dropdown--menu">
                            <Link className="menu-item" to="/why-aouad">
                                <div className="menu-title">Why Aouad?</div>
                                <div className="menu-subtitle">
                                    Discover Why We’re Different in Real Estate
                                </div>
                            </Link>

                            <Link className="menu-item" to="/our-team">
                                <div className="menu-title">Our Team</div>
                                <div className="menu-subtitle">
                                    Meet the Experts Behind Our Success
                                </div>
                            </Link>

                            <Link className="menu-item" to="/careers">
                                <div className="menu-title">Careers</div>
                                <div className="menu-subtitle">
                                    Become Part of Our Growing Team
                                </div>
                            </Link>

                            <Link className="menu-item" to="/contact">
                                <div className="menu-title">Contact</div>
                                <div className="menu-subtitle">
                                    Contact Us and Start Your Journey Today
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Schedule a Call */}
                    <Link
                        to="/schedule-call"
                        className="nav-item nav-item--pill"
                        onClick={() => window.scrollTo(0, 0)}
                    >
                        Schedule a Call
                    </Link>

                    {/* Sell Your Property */}
                    <Link
                        to="/sell"
                        className="nav-item nav-item--pill"
                        onClick={() => window.scrollTo(0, 0)}
                    >
                        Sell Your Property
                    </Link>
                </nav>

                {/* ACTIONS */}
                <div className="actions">
                    {/* ✅ Currency dropdown REMOVED */}

                    <button
                        className="pill cta"
                        type="button"
                        onClick={() => window.open(WHATSAPP_URL, "_blank")}
                    >
                        Get in Touch
                        <span className="wa">
                            <WhatsAppIcon />
                        </span>
                    </button>

                    {/* MOBILE: whatsapp square */}
                    <button
                        className="m-wa"
                        type="button"
                        aria-label="WhatsApp"
                        onClick={() => window.open(WHATSAPP_URL, "_blank")}
                    >
                        <WhatsAppIcon />
                    </button>
                </div>
            </div>

            {/* MOBILE DRAWER */}
            <div
                className={"m-overlay" + (mobileOpen ? " is-open" : "")}
                onClick={closeMobile}
            />

            <aside
                id="mobile-drawer"
                className={"m-drawer" + (mobileOpen ? " is-open" : "")}
                role="dialog"
                aria-modal="true"
                aria-label="Mobile menu"
                aria-hidden={!mobileOpen}
            >
                <div className="m-top">
                    <img src={logo} alt="Logo" className="m-logo" />
                    <button
                        className="m-close"
                        type="button"
                        aria-label="Close menu"
                        onClick={closeMobile}
                    >
                        <CloseIcon />
                    </button>
                </div>

                <div className="m-sep" />

                <div className="m-acc">
                    <MobileAccRow
                        label="Listings"
                        open={openAcc === "listings"}
                        onToggle={() => toggleAcc("listings")}
                    >
                        <Link className="m-sub m-sub--desc" to="/off-plan" onClick={closeMobile}>
                            Off-Plan <span>New developments under construction</span>
                        </Link>
                        <Link className="m-sub m-sub--desc" to="/sale" onClick={closeMobile}>
                            For Sale <span>Apartment and villas for sale</span>
                        </Link>
                        {/* <Link className="m-sub m-sub--desc" to="/rent" onClick={closeMobile}>
                            For Rent <span>Apartment and villas for rent</span>
                        </Link> */}
                        <Link className="m-sub m-sub--desc" to="/sell" onClick={closeMobile}>
                            Sell Your Property <span>List your property with our agent</span>
                        </Link>
                    </MobileAccRow>

                    <MobileAccRow
                        label="Regions"
                        open={openAcc === "regions"}
                        onToggle={() => toggleAcc("regions")}
                    >
                        <div className="m-groups">
                            <div className="m-group">
                                <div className="m-gh">Middle East</div>
                                <Link className="m-sub" to="/listings?country=dubai" onClick={closeMobile}>
                                    Dubai
                                </Link>
                                <Link className="m-sub" to="/listings?country=lebanon" onClick={closeMobile}>
                                    Lebanon
                                </Link>
                                <Link
                                    className="m-sub"
                                    to="/listings?country=saudi-arabia"
                                    onClick={closeMobile}
                                >
                                    Saudi Arabia
                                </Link>
                            </div>

                            <div className="m-group">
                                <div className="m-gh">Europe</div>
                                <Link className="m-sub" to="/listings?country=greece" onClick={closeMobile}>
                                    Greece
                                </Link>
                                <Link className="m-sub" to="/listings?country=cyprus" onClick={closeMobile}>
                                    Cyprus
                                </Link>
                                <Link className="m-sub" to="/listings?country=france" onClick={closeMobile}>
                                    France
                                </Link>
                                <Link className="m-sub" to="/listings?country=spain" onClick={closeMobile}>
                                    Spain
                                </Link>
                                <Link className="m-sub" to="/listings?country=italy" onClick={closeMobile}>
                                    Italy
                                </Link>
                            </div>
                        </div>
                    </MobileAccRow>

                    <MobileAccRow
                        label="Company"
                        open={openAcc === "company"}
                        onToggle={() => toggleAcc("company")}
                    >
                        <Link className="m-sub" to="/why-aouad" onClick={closeMobile}>
                            Why Us?
                        </Link>
                        <Link className="m-sub" to="/our-team" onClick={closeMobile}>
                            Our Team
                        </Link>
                        <Link className="m-sub" to="/careers" onClick={closeMobile}>
                            Careers
                        </Link>
                        <Link className="m-sub" to="/contact" onClick={closeMobile}>
                            Contact
                        </Link>
                    </MobileAccRow>

                    <Link className="m-main-btn" to="/schedule-call" onClick={closeMobile}>
                        Schedule a Call
                    </Link>

                    <Link className="m-main-btn" to="/sell" onClick={closeMobile}>
                        Sell Your Property
                    </Link>
                </div>

                <div className="m-sep" />

                <div className="m-contact">
                    <div className="m-contact-row">
                        <MapIcon />
                        <div>Floor 11, Tower 44, Dekwaneh, Beirut</div>
                    </div>

                    <div className="m-contact-row--split">
                        <div className="m-contact-item">
                            <MailIcon />
                            <div>info@aouad.com</div>
                        </div>
                        <div className="m-contact-item">
                            <PhoneIcon />
                            <div>+961 3 02 03 39</div>
                        </div>
                    </div>
                </div>

                <div className="m-socials">
                    <a className="m-soc" href="#" aria-label="Facebook">
                        <FbIcon />
                    </a>
                    <a className="m-soc" href="https://www.instagram.com/aouadandco?igsh=MTlmc3N1eHA3ZjI3NQ==" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                        <IgIcon />
                    </a>
                    <a className="m-soc" href="#" aria-label="LinkedIn">
                        <InIcon />
                    </a>

                    <a
                        className="m-soc"
                        href={WHATSAPP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="WhatsApp"
                    >
                        <WhatsAppIcon />
                    </a>
                </div>
            </aside>
        </header>
    );
}

function MobileAccRow({ label, open, onToggle, children }) {
    return (
        <div className={"m-row" + (open ? " is-open" : "")}>
            <button className="m-row-btn" type="button" onClick={onToggle}>
                <span>{label}</span>
                <svg className="m-chev" viewBox="0 0 12 8" aria-hidden="true">
                    <path
                        d="M1 1.5L6 6.5L11 1.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>

            <div className="m-panel">{children}</div>
        </div>
    );
}

/* ===== ICONS ===== */

function CaretDown() {
    return (
        <svg className="caret" viewBox="0 0 12 8" aria-hidden="true">
            <path
                d="M1 1.5L6 6.5L11 1.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function BurgerIcon() {
    return (
        <svg className="m-burger-ic" viewBox="0 0 24 24" aria-hidden="true">
            <path
                d="M4 6h16M4 12h16M4 18h16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg className="m-close-ic" viewBox="0 0 24 24" aria-hidden="true">
            <path
                d="M6 6l12 12M18 6L6 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}

function WhatsAppIcon() {
    return (
        <svg className="wa-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
                fill="currentColor"
                d="M12.04 2C6.55 2 2.1 6.44 2.1 11.93c0 2.1.55 4.15 1.6 5.95L2 22l4.25-1.65a9.87 9.87 0 0 0 5.79 1.8c5.49 0 9.96-4.44 9.96-9.93C22 6.44 17.53 2 12.04 2Zm0 18.2c-1.75 0-3.47-.47-4.97-1.35l-.35-.2-2.52.97.98-2.45-.22-.37a8.15 8.15 0 0 1-1.3-4.42c0-4.51 3.7-8.19 8.26-8.19 4.56 0 8.26 3.68 8.26 8.19 0 4.51-3.7 8.19-8.26 8.19Zm4.53-6.17c-.25-.13-1.47-.72-1.7-.8-.23-.08-.4-.13-.56.13-.16.25-.65.8-.8.96-.15.17-.3.19-.55.06-.25-.13-1.05-.38-2-1.2-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.12-.12.25-.3.38-.45.12-.15.16-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.34-.77-1.84-.2-.48-.4-.42-.56-.43l-.47-.01c-.16 0-.42.06-.64.32-.22.25-.84.82-.84 2.01 0 1.18.86 2.33.98 2.49.12.17 1.7 2.6 4.12 3.65.58.25 1.03.4 1.38.51.58.18 1.1.15 1.52.09.46-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.29Z"
            />
        </svg>
    );
}

/* contact icons */
function MapIcon() {
    return (
        <svg className="m-ci" viewBox="0 0 24 24" aria-hidden="true">
            <path
                d="M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
            />
            <circle
                cx="12"
                cy="10"
                r="2.2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
            />
        </svg>
    );
}
function MailIcon() {
    return (
        <svg className="m-ci" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16v12H4z" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <path
                d="M4 7l8 6 8-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
            />
        </svg>
    );
}
function PhoneIcon() {
    return (
        <svg className="m-ci" viewBox="0 0 24 24" aria-hidden="true">
            <path
                d="M6.6 3.7h2.4l1.2 4-1.5 1.5a15.2 15.2 0 006 6l1.5-1.5 4 1.2v2.4c0 1-0.8 1.8-1.8 1.8A16.8 16.8 0 015 5.5c0-1 .8-1.8 1.6-1.8z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/* socials */
function FbIcon() {
    return (
        <svg className="m-si" viewBox="0 0 24 24" aria-hidden="true">
            <path
                d="M14 8h2V5h-2c-2 0-3 1.2-3 3v2H9v3h2v6h3v-6h2.2l.8-3H14V8c0-.6.3-1 1-1z"
                fill="currentColor"
            />
        </svg>
    );
}
function IgIcon() {
    return (
        <svg className="m-si" viewBox="0 0 24 24" aria-hidden="true">
            <path
                d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
            />
            <circle
                cx="12"
                cy="12"
                r="3.2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
            />
            <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" />
        </svg>
    );
}
function InIcon() {
    return (
        <svg className="m-si" viewBox="0 0 24 24" aria-hidden="true">
            <path
                d="M6 9h3v11H6zM7.5 4.5a1.7 1.7 0 110 3.4 1.7 1.7 0 010-3.4zM11 9h3v1.6c.6-1 1.6-1.9 3.4-1.9 3 0 3.6 2 3.6 4.6V20h-3v-5.8c0-1.4 0-3-1.9-3s-2.2 1.4-2.2 2.9V20h-3z"
                fill="currentColor"
            />
        </svg>
    );
}
