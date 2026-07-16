import { useEffect, useState } from "react";
import "./sellPropertyPage.css";
import { FaEnvelope, FaPhoneAlt, FaMapMarkerAlt } from "react-icons/fa";
import heroBg from "../assets/sell-hero.jpg";
import { fbTrack } from "../lib/fbpixel.js";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

export default function SellPropertyPage() {
    const [agent, setAgent] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        fetch(`${API_BASE}/public/agents`)
            .then((r) => r.json())
            .then((data) => {
                const agents = data.items || [];
                if (agents.length) setAgent(agents[0]);
            })
            .catch(() => {});
    }, []);

    const agentName = agent?.fullName || "Andrew Aouad";
    const agentTitle = agent?.title || "Owner & Licensed Real Estate Agent";
    const agentPhone = agent?.phone || "+9613070383";
    const agentEmail = agent?.email || "info@aouad.co";
    const agentPhoto = agent?.photoUrl;
    const agentInitials = agentName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const waUrl =
        "https://wa.me/" +
        agentPhone.replace(/[\s+\-()]/g, "") +
        "?text=" +
        encodeURIComponent("Hello, I'd like to sell my property. Can we discuss?");

    return (
        <main className="sell">
            {/* HERO + FORM OVERLAP */}
            <section
                className="sell-hero"
                style={{ backgroundImage: `url(${heroBg})` }}
            >
                <div className="sell-hero__overlay" />

                <div className="sell-hero__grid">
                    {/* LEFT — hero text */}
                    <div className="sell-hero__text">
                        <div className="sell-hero__eyebrow">AOUAD.CO</div>
                        <h1 className="sell-hero__title">SELL YOUR PROPERTY</h1>
                        <p className="sell-hero__sub">
                            Let our experts handle the sale — from valuation to closing.
                            We bring market expertise, an extensive buyer network, and a
                            personalized approach to get your property sold.
                        </p>

                        {/* agent inline */}
                        <div className="sell-hero__agent">
                            {agentPhoto ? (
                                <img className="sell-hero__agent-photo" src={agentPhoto} alt={agentName} />
                            ) : (
                                <div className="sell-hero__agent-avatar">{agentInitials}</div>
                            )}
                            <div>
                                <div className="sell-hero__agent-name">{agentName}</div>
                                <div className="sell-hero__agent-role">{agentTitle}</div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT — form card */}
                    <aside className="sell-card">
                        <div className="sell-card__inner">
                            <div className="sell-card__title">LIST YOUR PROPERTY</div>
                            <div className="sell-card__sub">
                                Fill out the form and {agentName} will contact you to discuss
                                selling your property.
                            </div>

                            <div className="sell-card__hr" />

                            <form
                                className="sell-form"
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (submitting) return;
                                    setSubmitting(true);
                                    const fd = new FormData(e.target);
                                    const firstName = fd.get("firstName");
                                    const lastName = fd.get("lastName");
                                    const email = fd.get("email");
                                    const phoneCode = fd.get("phoneCode");
                                    const phone = fd.get("phone");
                                    const propertyType = fd.get("propertyType");
                                    const propertyLocation = fd.get("propertyLocation");
                                    const details = fd.get("details");

                                    fbTrack("Lead", {
                                        content_name: "Sell Property Request",
                                        content_category: propertyType || undefined,
                                    });

                                    const waPhone = agentPhone.replace(/[\s+\-()]/g, "");
                                    const msg = [
                                        `Hello ${agentName},`,
                                        ``,
                                        `I'd like to list my property for sale.`,
                                        ``,
                                        `*Name:* ${firstName} ${lastName}`,
                                        `*Email:* ${email}`,
                                        `*Phone:* ${phoneCode} ${phone}`,
                                        `*Property Type:* ${propertyType}`,
                                        `*Location:* ${propertyLocation}`,
                                        details ? `*Details:* ${details}` : "",
                                    ].filter(Boolean).join("\n");

                                    window.open(
                                        `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`,
                                        "_blank"
                                    );
                                    setSubmitting(false);
                                }}
                            >
                                {submitted ? (
                                    <div className="sell-success">
                                        <div className="sell-success__icon">&#10003;</div>
                                        <div className="sell-success__title">Request Submitted</div>
                                        <div className="sell-success__text">
                                            {agentName} will contact you shortly to discuss your property.
                                        </div>
                                        <button
                                            className="sell-submit"
                                            type="button"
                                            onClick={() => setSubmitted(false)}
                                        >
                                            Submit Another
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="sell-form__row2">
                                            <div className="sell-field">
                                                <label className="sell-label">First Name *</label>
                                                <input className="sell-input" name="firstName" required />
                                            </div>
                                            <div className="sell-field">
                                                <label className="sell-label">Last Name *</label>
                                                <input className="sell-input" name="lastName" required />
                                            </div>
                                        </div>

                                        <div className="sell-field">
                                            <label className="sell-label">Email *</label>
                                            <input className="sell-input" name="email" type="email" required />
                                        </div>

                                        <div className="sell-field">
                                            <label className="sell-label">Phone *</label>
                                            <div className="sell-phone">
                                                <select className="sell-select sell-phone__select" name="phoneCode" defaultValue="+961">
                                                    <option value="+961">+961</option>
                                                    <option value="+971">+971</option>
                                                    <option value="+966">+966</option>
                                                    <option value="+974">+974</option>
                                                    <option value="+973">+973</option>
                                                    <option value="+968">+968</option>
                                                    <option value="+965">+965</option>
                                                    <option value="+962">+962</option>
                                                    <option value="+964">+964</option>
                                                    <option value="+20">+20</option>
                                                    <option value="+90">+90</option>
                                                    <option value="+357">+357</option>
                                                    <option value="+30">+30</option>
                                                    <option value="+33">+33</option>
                                                    <option value="+34">+34</option>
                                                    <option value="+39">+39</option>
                                                    <option value="+44">+44</option>
                                                    <option value="+49">+49</option>
                                                    <option value="+1">+1</option>
                                                    <option value="+61">+61</option>
                                                    <option value="+55">+55</option>
                                                    <option value="+234">+234</option>
                                                    <option value="+27">+27</option>
                                                    <option value="+91">+91</option>
                                                    <option value="+86">+86</option>
                                                    <option value="+81">+81</option>
                                                </select>
                                                <input className="sell-input sell-phone__input" name="phone" required />
                                            </div>
                                        </div>

                                        <div className="sell-field">
                                            <label className="sell-label">Property Type *</label>
                                            <select className="sell-select" name="propertyType" required defaultValue="">
                                                <option value="" disabled>Select type</option>
                                                <option>Apartment</option>
                                                <option>Villa</option>
                                                <option>Townhouse</option>
                                                <option>Penthouse</option>
                                                <option>Land</option>
                                                <option>Commercial</option>
                                                <option>Other</option>
                                            </select>
                                        </div>

                                        <div className="sell-field">
                                            <label className="sell-label">Property Location *</label>
                                            <input className="sell-input" name="propertyLocation" placeholder="e.g. Dekwaneh, Beirut" required />
                                        </div>

                                        <div className="sell-field">
                                            <label className="sell-label">Additional Details</label>
                                            <textarea
                                                className="sell-textarea"
                                                name="details"
                                                placeholder="Bedrooms, size, condition, asking price..."
                                                rows={3}
                                            />
                                        </div>

                                        <button className="sell-submit" type="submit" disabled={submitting}>
                                            {submitting ? "Submitting..." : "Request a Callback"}
                                        </button>

                                        <div className="sell-mini">
                                            <span><FaEnvelope /> {agentEmail}</span>
                                            <span><FaPhoneAlt /> {agentPhone}</span>
                                            <span><FaMapMarkerAlt /> Dekwaneh, Beirut</span>
                                        </div>
                                    </>
                                )}
                            </form>
                        </div>
                    </aside>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <div className="sell-inner">
                <h2 className="sell-h2">How It Works</h2>

                <div className="sell-steps-grid">
                    <div className="sell-step-card">
                        <div className="sell-step__num">1</div>
                        <div className="sell-step__title">Submit Your Request</div>
                        <div className="sell-step__desc">
                            Fill out the form with your property details. Our team will
                            review your submission promptly.
                        </div>
                    </div>

                    <div className="sell-step-card">
                        <div className="sell-step__num">2</div>
                        <div className="sell-step__title">Property Evaluation</div>
                        <div className="sell-step__desc">
                            {agentName} will personally assess your property and provide a
                            competitive market valuation.
                        </div>
                    </div>

                    <div className="sell-step-card">
                        <div className="sell-step__num">3</div>
                        <div className="sell-step__title">Listing & Marketing</div>
                        <div className="sell-step__desc">
                            We list your property across our platforms and leverage our
                            buyer network to find the right match.
                        </div>
                    </div>

                    <div className="sell-step-card">
                        <div className="sell-step__num">4</div>
                        <div className="sell-step__title">Close the Deal</div>
                        <div className="sell-step__desc">
                            We handle negotiations and paperwork so you can close with
                            confidence and peace of mind.
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
