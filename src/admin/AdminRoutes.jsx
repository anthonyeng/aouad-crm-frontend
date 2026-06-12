// src/admin/AdminRoutes.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import AdminApp from "./AdminApp.jsx";

import AdminDashboard from "./pages/AdminDashboard.jsx";
import LeadsPage from "./pages/LeadsPage.jsx";
import AgentsPage from "./pages/AgentsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import AddListingPage from "./pages/AddListingPage.jsx";
import AdminListingsSearchPage from "./pages/AdminListingsSearchPage.jsx";
import ManageListingOrderPage from "./pages/ManageListingOrderPage.jsx";
// Developers
import DevelopersPage from "./pages/DevelopersPage.jsx";
import AddDeveloperPage from "./pages/AddDeveloperPage.jsx";

// ✅ Careers
import CareersAdminPage from "./pages/CareersAdminPage.jsx";

// ✅ Client Stories (NEW PAGE)
import ClientStoriesAdminPage from "./pages/ClientStoriesAdminPage.jsx";

// Exhibitions
import ExhibitionsAdminPage from "./pages/ExhibitionsAdminPage.jsx";

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AdminApp />}>
        {/* Dashboard */}
        <Route index element={<AdminDashboard />} />

        {/* CRM */}
        <Route path="leads" element={<LeadsPage />} />
        <Route path="agents" element={<AgentsPage />} />

        {/* Listings */}
        <Route path="listings" element={<AdminListingsSearchPage />} />
        <Route path="add-listing" element={<AddListingPage />} />

        {/* Developers */}
        <Route path="developers" element={<DevelopersPage />} />
        <Route path="add-developer" element={<AddDeveloperPage />} />
        <Route path="listing-order" element={<ManageListingOrderPage />} />
        {/* ✅ Client Stories */}
        <Route path="client-stories" element={<ClientStoriesAdminPage />} />

        {/* ✅ Careers */}
        <Route path="careers" element={<CareersAdminPage />} />

        {/* Exhibitions */}
        <Route path="exhibitions" element={<ExhibitionsAdminPage />} />

        {/* Settings */}
        <Route path="settings" element={<SettingsPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
