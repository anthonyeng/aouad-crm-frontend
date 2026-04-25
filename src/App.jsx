// src/App.jsx
import { Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";

/* ===== PUBLIC LAYOUT (has Header/Footer) ===== */
import Header from "./Header.jsx";
import Footer from "./components/Footer.jsx";

/* ===== ADMIN ROUTES WRAPPER (renders AdminApp + nested pages) ===== */
import AdminRoutes from "./admin/AdminRoutes.jsx";

/* ===== HOME SECTIONS ===== */
import Hero from "./Hero.jsx";
import LatestOffPlanSection from "./components/LatestOffPlanSection.jsx";
import FeaturedOffPlanProjects from "./components/FeaturedOffPlanProjects.jsx";
import LatestListingsSection from "./components/LatestListingsSection.jsx";
import FeaturedDevelopersSection from "./components/FeaturedDevelopersSection.jsx";
import OurTeam from "./components/OurTeam.jsx";
import ClientStories from "./components/ClientStories.jsx";
import ScheduleCallSection from "./components/ScheduleCallSection.jsx";
import PopularCountries from "./components/PopularCountries.jsx";
import ScheduleCallPage from "./pages/ScheduleCallPage";

/* ===== PAGES ===== */
import ContactPage from "./pages/ContactPage.jsx";
import WhyAouadPage from "./pages/WhyAouadPage.jsx";
import OffPlanPage from "./pages/OffPlanPage.jsx";
import ForRentPage from "./pages/ForRentPage.jsx";
import ForSalePage from "./pages/ForSalePage.jsx";
import ListingsPage from "./pages/ListingsPage.jsx";
import CareersPage from "./pages/CareersPage.jsx";
import OurTeamPage from "./pages/OurTeamPage.jsx";
import MortgageCalculatorPage from "./pages/MortgageCalculatorPage.jsx";
import ListingDetailsPage from "./pages/ListingDetailsPage.jsx";
import TeamMemberPage from "./pages/TeamMemberPage.jsx";

/* ===== AUTH ===== */
import LoginPage from "./pages/LoginPage.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

/* ===== AGENT APP + PAGES ===== */
import AgentApp from "./agent/AgentApp.jsx";
import AgentDashboardPage from "./agent/pages/AgentDashboardPage.jsx";
import AgentLeadsPage from "./agent/pages/AgentLeadsPage.jsx";
import AgentListingsPage from "./agent/pages/AgentListingsPage.jsx";
import AgentSchedulePage from "./agent/pages/AgentSchedulePage.jsx";
import AgentSettingsPage from "./agent/pages/AgentSettingsPage.jsx";

/* ===== HOME PAGE ===== */
function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    const listingId = sessionStorage.getItem("_goto_listing");
    if (listingId) {
      sessionStorage.removeItem("_goto_listing");
      navigate(`/listing/${listingId}`, { replace: true });
    }
  }, [navigate]);

  return (
    <>
      <Hero />
      <LatestOffPlanSection />
      <FeaturedDevelopersSection />
      <LatestListingsSection />
      <OurTeam />
      <PopularCountries />
      <ClientStories />
      <ScheduleCallSection />
    </>
  );
}

/* ===== PUBLIC APP (keeps your existing behavior) ===== */
function PublicApp() {
  return (
    <>
      <Header />

      <Routes>
        {/* HOME */}
        <Route path="/" element={<HomePage />} />

        {/* LISTINGS */}
        <Route path="/off-plan" element={<OffPlanPage />} />
        <Route path="/rent" element={<ForRentPage />} />
        <Route path="/sale" element={<ForSalePage />} />
        <Route path="/listings" element={<ListingsPage />} />

        {/* Listing details */}
        <Route path="/listing/:id" element={<ListingDetailsPage />} />

        {/* COMPANY */}
        <Route path="/why-aouad" element={<WhyAouadPage />} />
        <Route path="/careers" element={<CareersPage />} />
        <Route path="/our-team" element={<OurTeamPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/mortgage-calculator" element={<MortgageCalculatorPage />} />
        <Route path="/team/:slug" element={<TeamMemberPage />} />
        <Route path="/schedule-call" element={<ScheduleCallPage />} />

        {/* 404 inside public layout */}
        <Route
          path="*"
          element={
            <div style={{ padding: 40, maxWidth: 1200, margin: "0 auto" }}>
              <h2 style={{ margin: 0 }}>Page not found</h2>
              <p style={{ color: "rgb(107,114,128)" }}>
                The page you are looking for doesn’t exist.
              </p>
            </div>
          }
        />
      </Routes>

      <Footer />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      {/* AUTH */}
      <Route path="/login" element={<LoginPage />} />

      {/* ADMIN (no public Header/Footer) */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <AdminRoutes />
          </ProtectedRoute>
        }
      />

      {/* AGENT (no public Header/Footer) */}
      <Route
        path="/agent/*"
        element={
          <ProtectedRoute roles={["AGENT", "ADMIN"]}>
            <AgentApp />
          </ProtectedRoute>
        }
      >
        {/* ✅ Agent nested pages */}
        <Route index element={<AgentDashboardPage />} />
        <Route path="leads" element={<AgentLeadsPage />} />
        <Route path="listings" element={<AgentListingsPage />} />
        <Route path="schedule" element={<AgentSchedulePage />} />
        <Route path="settings" element={<AgentSettingsPage />} />
      </Route>

      {/* EVERYTHING ELSE is your current website */}
      <Route path="/*" element={<PublicApp />} />
    </Routes>
  );
}
