import "./footer.css";
import logo from "../assets/logo_real_state_gold.png";

import {
    FaFacebookF,
    FaInstagram,
    FaLinkedinIn,
    FaWhatsapp,
} from "react-icons/fa";
import { HiOutlineMail, HiOutlinePhone } from "react-icons/hi";

export default function Footer() {
    return (
        <footer className="ft">
            {/* TOP LINE */}
            <div className="ft-line" />

            <div className="ft-inner">
                {/* LOGO */}
                <img src={logo} alt="Aouad Real Estate" className="ft-logo" />

                {/* CONTACT */}
                <div className="ft-contact">
                    <a href="mailto:info@aouad.co" className="ft-link">
                        <HiOutlineMail />
                        info@aouad.co
                    </a>

                    <a href="tel:+96103070383" className="ft-link">
                        <HiOutlinePhone />
                        +961 03 07 03 83
                    </a>
                </div>

                {/* SOCIAL */}
                <div className="ft-social">
                    <a
                        href="https://www.facebook.com/share/17xPEM5ccE/?mibextid=wwXIfr"
                        className="ft-soc"
                        aria-label="Facebook"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <FaFacebookF />
                    </a>

                    <a
                        href="https://www.instagram.com/aouadandco?igsh=MTlmc3N1eHA3ZjI3NQ=="
                        className="ft-soc"
                        aria-label="Instagram"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <FaInstagram />
                    </a>

                    <a
                        href="https://www.linkedin.com"
                        className="ft-soc"
                        aria-label="LinkedIn"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <FaLinkedinIn />
                    </a>

                    <a
                        href="https://wa.me/96103070383"
                        className="ft-soc"
                        aria-label="WhatsApp"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <FaWhatsapp />
                    </a>
                </div>

                {/* COPYRIGHT */}
                <div className="ft-copy">
                    © {new Date().getFullYear()} All rights reserved. Made by{" "}
                    <span className="ft-brand">Aouad Real Estate</span>
                </div>
            </div>
        </footer>
    );
}
