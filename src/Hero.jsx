// src/components/Hero.jsx
import { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaChevronDown, FaSearch } from "react-icons/fa";
import "./hero.css";

/* ✅ ONLY ONE IMAGE */
import img1 from "./assets/carousel2.webp";

const IMAGES = [img1];

const LISTING_TYPES = ["Off plan", "For sale", "For rent"];
const PROPERTY_TYPES = ["Any type", "Apartment", "Villa", "Townhouse", "Penthouse"];

const COUNTRIES = [
    { label: "Dubai", value: "dubai" },
    { label: "Lebanon", value: "lebanon" },
    { label: "Saudi Arabia", value: "saudi-arabia" },
    { label: "Greece", value: "greece" },
    { label: "Cyprus", value: "cyprus" },
    { label: "France", value: "france" },
    { label: "Spain", value: "spain" },
    { label: "Italy", value: "italy" },
];

const MAP_LISTING_TYPE = {
    "Off plan": "OFF_PLAN",
    "For sale": "FOR_SALE",
    "For rent": "FOR_RENT",
};

const MAP_PROPERTY_TYPE = {
    "Any type": "",
    Apartment: "APARTMENT",
    Villa: "VILLA",
    Townhouse: "TOWNHOUSE",
    Penthouse: "PENTHOUSE",
};

export default function Hero() {
    const navigate = useNavigate();
    const rootRef = useRef(null);

    /* still works, but always returns carousel2 */
    const bgImage = useMemo(
        () => IMAGES[Math.floor(Math.random() * IMAGES.length)],
        []
    );

    const [listingType, setListingType] = useState(LISTING_TYPES[0]);
    const [propertyType, setPropertyType] = useState(PROPERTY_TYPES[0]);

    const [country, setCountry] = useState("dubai");
    const [countryLabel, setCountryLabel] = useState("Dubai");

    const [open, setOpen] = useState(null);

    /* close dropdowns (iOS-safe) */
    useEffect(() => {
        const close = (e) => {
            if (!rootRef.current?.contains(e.target)) setOpen(null);
        };
        const esc = (e) => e.key === "Escape" && setOpen(null);

        document.addEventListener("click", close, { capture: true });
        document.addEventListener("keydown", esc);

        return () => {
            document.removeEventListener("click", close, { capture: true });
            document.removeEventListener("keydown", esc);
        };
    }, []);

    const onSearch = () => {
        const params = new URLSearchParams();

        params.set("country", country);

        const lt = MAP_LISTING_TYPE[listingType];
        if (lt) params.set("listingType", lt);

        const pt = MAP_PROPERTY_TYPE[propertyType];
        if (pt) params.set("propertyType", pt);

        navigate(`/listings?${params.toString()}`);
    };

    return (
        <section className="hero">
            <div className="hero-bg">
                <img
                    className="hero-slide"
                    src={bgImage}
                    alt=""
                    fetchpriority="high"
                    loading="eager"
                    decoding="async"
                />
                <div className="hero-overlay" />
            </div>

            <div className="hero-inner">
                <div className="hero-eyebrow">
                    Strategic Real Estate Guidance for Lasting Wealth
                </div>

                <h1 className="hero-title">
                    <span>Discover Exceptional Properties Across Global Markets</span>
                </h1>

                <p className="hero-subtitle">
                    Secure your next property with a trusted real estate partner.
                </p>

                <div className="hero-search" ref={rootRef}>
                    {/* Listing Type */}
                    <Dropdown
                        value={listingType}
                        open={open === "listing"}
                        onToggle={() => setOpen(open === "listing" ? null : "listing")}
                        options={LISTING_TYPES}
                        onSelect={(v) => {
                            setListingType(v);
                            setOpen(null);
                        }}
                    />

                    <div className="hero-divider" />

                    {/* Country */}
                    <div className={`hero-dd hero-dd--grow ${open === "country" ? "is-open" : ""}`}>
                        <button
                            className="hero-field"
                            type="button"
                            onClick={() => setOpen(open === "country" ? null : "country")}
                        >
                            <span className="hero-field-text">{countryLabel}</span>
                            <FaChevronDown />
                        </button>

                        <div className="hero-menu">
                            {COUNTRIES.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    className={`hero-opt ${country === c.value ? "is-active" : ""}`}
                                    onClick={() => {
                                        setCountry(c.value);
                                        setCountryLabel(c.label);
                                        setOpen(null);
                                    }}
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="hero-divider" />

                    {/* Property Type */}
                    <Dropdown
                        grow
                        value={propertyType}
                        open={open === "type"}
                        onToggle={() => setOpen(open === "type" ? null : "type")}
                        options={PROPERTY_TYPES}
                        onSelect={(v) => {
                            setPropertyType(v);
                            setOpen(null);
                        }}
                    />

                    <button className="hero-btn" type="button" onClick={onSearch}>
                        Search <FaSearch />
                    </button>
                </div>
            </div>
        </section>
    );
}

/* ===== Reusable Dropdown ===== */
function Dropdown({ value, options, open, onToggle, onSelect, grow }) {
    return (
        <div className={`hero-dd ${grow ? "hero-dd--grow" : ""} ${open ? "is-open" : ""}`}>
            <button className="hero-field" type="button" onClick={onToggle}>
                <span className="hero-field-text">{value}</span>
                <FaChevronDown />
            </button>

            <div className="hero-menu">
                {options.map((opt) => (
                    <button
                        key={opt}
                        type="button"
                        className={`hero-opt ${opt === value ? "is-active" : ""}`}
                        onClick={() => onSelect(opt)}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );
}