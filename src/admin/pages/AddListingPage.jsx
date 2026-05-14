// src/admin/pages/AddListingPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import "./AddListingPage.css";
import LocationPicker from "../components/LocationPicker.jsx";
// ✅ local fallback (no network)
const FALLBACK_THUMB = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
    <rect width="100%" height="100%" fill="#f2f2f2"/>
    <path d="M20 54l10-12 10 12 10-14 10 14" fill="none" stroke="#b5b5b5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="30" cy="30" r="6" fill="#b5b5b5"/>
    <text x="50%" y="72%" text-anchor="middle" font-family="Arial" font-size="10" fill="#8a8a8a">No Image</text>
  </svg>
`)}`;
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

const MAX_BYTES = 100 * 1024 * 1024; // 100MB images
const MAX_PDF_BYTES = 50 * 1024 * 1024; // brochures: 50MB

const LISTING_TYPES = [
  { value: "OFF_PLAN", label: "Off-Plan" },
  { value: "FOR_SALE", label: "For Sale" },
  { value: "FOR_RENT", label: "For Rent" },
];

const CURRENCIES = ["USD", "AED", "EUR"];

const PROPERTY_TYPES = [
  { value: "APARTMENT", label: "Apartment" },
  { value: "VILLA", label: "Villa" },
  { value: "TOWNHOUSE", label: "Townhouse" },
  { value: "PENTHOUSE", label: "Penthouse" },
  { value: "LAND", label: "Land" },
];

const CATEGORIES = [
  { value: "OFF_PLAN", label: "Off-Plan" },
  { value: "READY", label: "Ready" },
  { value: "SECONDARY", label: "Secondary" },
];

const COUNTRIES = [
  { name: "Dubai", slug: "dubai", center: { lat: 25.2048, lng: 55.2708 } },
  { name: "Lebanon", slug: "lebanon", center: { lat: 33.8938, lng: 35.5018 } },
  { name: "Saudi Arabia", slug: "saudi-arabia", center: { lat: 24.7136, lng: 46.6753 } },
  { name: "Greece", slug: "greece", center: { lat: 37.9838, lng: 23.7275 } },
  { name: "Cyprus", slug: "cyprus", center: { lat: 35.1856, lng: 33.3823 } },
  { name: "France", slug: "france", center: { lat: 48.8566, lng: 2.3522 } },
  { name: "Spain", slug: "spain", center: { lat: 40.4168, lng: -3.7038 } },
  { name: "Italy", slug: "italy", center: { lat: 41.9028, lng: 12.4964 } },
];

function fileExt(file) {
  const name = file?.name || "";
  const dot = name.lastIndexOf(".");
  if (dot === -1) return "bin";
  return name.slice(dot + 1).toLowerCase();
}

/**
 * Compress an image file using canvas.
 * Skips non-image files (e.g. PDFs).
 * Max dimension 2048px, JPEG quality 0.8 → typically < 1 MB.
 */
function compressImage(file, maxDim = 2048, quality = 0.8) {
  if (!file.type.startsWith("image/")) return Promise.resolve(file);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim && file.size < 2 * 1024 * 1024) {
        URL.revokeObjectURL(img.src);
        return resolve(file); // already small enough
      }
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(img.src);
          if (!blob) return resolve(file);
          const compressed = new File([blob], file.name, {
            type: "image/jpeg",
            lastModified: file.lastModified,
          });
          resolve(compressed);
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(file);
    };
    img.src = URL.createObjectURL(file);
  });
}

async function putToSignedUrl(uploadUrl, file) {
  const toUpload = await compressImage(file);
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": toUpload.type || "application/octet-stream" },
    body: toUpload,
  });
  if (!res.ok) throw new Error("Failed to upload file to storage");
}

function coverUrl(listing) {
  const imgs = listing?.images || [];
  const cover = imgs.find((x) => x.isCover) || imgs[0];
  return cover?.url || "";
}

function badgeLabel(type) {
  return LISTING_TYPES.find((x) => x.value === type)?.label || type || "-";
}

function isHidden(listing) {
  return !!(listing?.isHidden || listing?.hidden);
}

function hasLocation(listing) {
  return (
    listing?.latitude != null &&
    listing?.longitude != null &&
    listing.latitude !== "" &&
    listing.longitude !== ""
  );
}

function pickBrochureUrl(listing) {
  return (
    listing?.brochureUrl ||
    listing?.brochurePDF ||
    listing?.brochurePdfUrl ||
    listing?.brochure ||
    ""
  );
}

function fmtBytes(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v) || v <= 0) return "";
  const mb = v / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
  const kb = v / 1024;
  return `${kb.toFixed(kb >= 10 ? 0 : 1)} KB`;
}

function toIntOrNull(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function toFloatOrNull(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

// featured first, then featuredOrder asc, then newest
function compareFeatured(a, b) {
  const af = !!a?.featured;
  const bf = !!b?.featured;
  if (af !== bf) return af ? -1 : 1;

  const ao = a?.featuredOrder;
  const bo = b?.featuredOrder;

  const aHas = Number.isFinite(Number(ao));
  const bHas = Number.isFinite(Number(bo));
  if (aHas !== bHas) return aHas ? -1 : 1;

  if (aHas && bHas) {
    const diff = Number(ao) - Number(bo);
    if (diff !== 0) return diff;
  }

  const at = new Date(a?.createdAt || 0).getTime();
  const bt = new Date(b?.createdAt || 0).getTime();
  return bt - at;
}

/* =========================
   ✅ NEW: sold/rented helpers
========================= */
function isSold(listing) {
  return String(listing?.status || "").trim().toUpperCase() === "SOLD";
}
function isRented(listing) {
  const st = String(listing?.status || "").trim().toUpperCase();
  return st === "RENTED" || st === "RENTED_OUT" || st === "LEASED" || st === "TAKEN";
}

function canMarkSoldOrRented(listing) {
  const t = String(listing?.listingType || "").toUpperCase();
  return t === "FOR_SALE" || t === "FOR_RENT";
}
function statusBadge(listing) {
  const t = String(listing?.listingType || "").toUpperCase();
  if (t === "FOR_SALE" && isSold(listing)) return "Sold";
  if (t === "FOR_RENT" && isRented(listing)) return "Rented";
  return "";
}

export default function AddListingPage() {
  // list
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [statusTogglingId, setStatusTogglingId] = useState(null); // ✅ NEW

  // agents
  const [agents, setAgents] = useState([]);
  const [agentsLoading, setAgentsLoading] = useState(false);

  // filters
  const [agentFilterId, setAgentFilterId] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // listing modal
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // edit mode
  const [editingId, setEditingId] = useState(null);
  const [editingCoverUrl, setEditingCoverUrl] = useState("");
  const [editingGalleryImages, setEditingGalleryImages] = useState([]);

  // brochure popup
  const [broOpen, setBroOpen] = useState(false);
  const [broListing, setBroListing] = useState(null);
  const [broFile, setBroFile] = useState(null);
  const [broUploading, setBroUploading] = useState(false);
  const [broErr, setBroErr] = useState("");

  // order popup (kept for OFF_PLAN)
  const [ordOpen, setOrdOpen] = useState(false);
  const [ordListing, setOrdListing] = useState(null);
  const [ordValue, setOrdValue] = useState("");
  const [ordSaving, setOrdSaving] = useState(false);
  const [ordErr, setOrdErr] = useState("");

  // area suggestions
  const [areaOptions, setAreaOptions] = useState([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const areasReqSeq = useRef(0);

  const [form, setForm] = useState({
    country: "dubai",
    latitude: "",
    longitude: "",
    addressText: "",

    propertyType: "APARTMENT",
    category: "OFF_PLAN",
    city: "Dubai",
    area: "",

    listingType: "OFF_PLAN",
    featured: true,

    completionYear: "",
    developerName: "",
    locationLabel: "",

    startingPrice: "",
    currency: "USD",
    paymentPlan: "",
    description: "",

    bedrooms: "",
    bathrooms: "",
    parking: "",
    sizeSqft: "",
    sizeSqm: "",

    title: "",
    assignedAgentId: "",
  });

  const [coverFile, setCoverFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [coverPreview, setCoverPreview] = useState(null);
  const [galleryPreviews, setGalleryPreviews] = useState([]);

  const isEdit = !!editingId;

  const canSave = useMemo(() => {
    const baseOk =
      form.title.trim().length >= 2 &&
      form.area.trim().length >= 2 &&
      form.city.trim().length >= 2;

    const hasCover = !!coverFile || (isEdit && (editingCoverUrl || "").trim().length > 0);
    return baseOk && hasCover;
  }, [form.title, form.area, form.city, coverFile, isEdit, editingCoverUrl]);

  const set = (key) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [key]: val }));
  };

  const tokenOrThrow = () => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Missing token. Please login again.");
    return token;
  };

  async function loadAgents() {
    setAgentsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/public/agents`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load agents");
      setAgents(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      console.error(e);
      setAgents([]);
    } finally {
      setAgentsLoading(false);
    }
  }

  async function loadListings() {
    setLoading(true);
    setListError("");
    try {
      const token = tokenOrThrow();

      const res = await fetch(`${API_BASE}/listings?includeHidden=true&limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load listings");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      console.error(e);
      setItems([]);
      setListError(e.message || "Failed to load listings");
    } finally {
      setLoading(false);
    }
  }

  async function loadAreasFromDb({ country, city, q }) {
    const seq = ++areasReqSeq.current;
    setAreasLoading(true);

    try {
      const token = tokenOrThrow();

      const params = new URLSearchParams();
      if (country) params.set("country", String(country));
      if (city) params.set("city", String(city));
      if (q) params.set("q", String(q));
      params.set("limit", "200");

      const res = await fetch(`${API_BASE}/listings/areas?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load areas");

      if (seq !== areasReqSeq.current) return;
      setAreaOptions(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      console.error(e);
      if (seq !== areasReqSeq.current) return;
      setAreaOptions([]);
    } finally {
      if (seq === areasReqSeq.current) setAreasLoading(false);
    }
  }

  useEffect(() => {
    loadAgents();
    loadListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;

    const t = setTimeout(() => {
      loadAreasFromDb({
        country: form.country,
        city: form.city,
        q: form.area,
      });
    }, 220);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form.country, form.city, form.area]);

  const resetAll = () => {
    setError("");
    setEditingId(null);
    setEditingCoverUrl("");
    setEditingGalleryImages([]);

    setForm({
      country: "dubai",
      latitude: "",
      longitude: "",
      addressText: "",

      propertyType: "APARTMENT",
      category: "OFF_PLAN",
      city: "Dubai",
      area: "",

      listingType: "OFF_PLAN",
      featured: true,

      completionYear: "",
      developerName: "",
      locationLabel: "",

      startingPrice: "",
      currency: "USD",
      paymentPlan: "",
      description: "",

      bedrooms: "",
      bathrooms: "",
      parking: "",
      sizeSqft: "",
      sizeSqm: "",

      title: "",
      assignedAgentId: "",
    });

    setCoverFile(null);
    setGalleryFiles([]);
    setCoverPreview(null);
    setGalleryPreviews([]);

    setAreaOptions([]);
    setAreasLoading(false);
  };

  const openModalCreate = () => {
    resetAll();
    setOpen(true);
  };

  const openModalEdit = (listing) => {
    setError("");
    setEditingId(listing.id);
    setEditingCoverUrl(coverUrl(listing) || "");

    const imgs = Array.isArray(listing?.images) ? listing.images : [];
    const cover = imgs.find((x) => x.isCover) || imgs[0] || null;

    setEditingGalleryImages(
      imgs
        .filter((x) => x && x.id && x.url)
        .filter((x) => (cover?.url ? x.url !== cover.url : true))
        .map((x) => ({ id: x.id, url: x.url }))
    );

    setForm({
      country: listing.country || "dubai",
      latitude: listing.latitude ?? "",
      longitude: listing.longitude ?? "",
      addressText: listing.addressText ?? "",

      propertyType: listing.propertyType || "APARTMENT",
      category: listing.category || "OFF_PLAN",
      city: listing.city || "Dubai",
      area: listing.area || "",

      listingType: listing.listingType || "OFF_PLAN",
      featured: !!listing.featured,

      completionYear: listing.completionYear ?? "",
      developerName: listing.developerName || "",
      locationLabel: listing.locationLabel || "",

      startingPrice: listing.startingPrice ?? "",
      currency: listing.currency || "USD",
      paymentPlan: listing.paymentPlan || "",
      description: listing.description || "",

      bedrooms: listing.bedrooms ?? "",
      bathrooms: listing.bathrooms ?? "",
      parking: listing.parking ?? "",
      sizeSqft: listing.sizeSqft ?? "",
      sizeSqm: listing.sizeSqm ?? "",

      title: listing.title || "",
      assignedAgentId: listing.assignedAgentId || "",
    });

    setCoverFile(null);
    setGalleryFiles([]);

    setOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setOpen(false);
  };

  // brochure popup
  const openBrochurePopup = (listing) => {
    setBroErr("");
    setBroFile(null);
    setBroListing(listing);
    setBroOpen(true);
  };

  const closeBrochurePopup = () => {
    if (broUploading) return;
    setBroOpen(false);
    setBroListing(null);
    setBroFile(null);
    setBroErr("");
  };

  const onPickBrochure = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setBroErr("Please select a PDF file.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setBroErr(`PDF is too large. Max ${Math.round(MAX_PDF_BYTES / (1024 * 1024))}MB.`);
      e.target.value = "";
      return;
    }

    setBroErr("");
    setBroFile(file);
    e.target.value = "";
  };

  const uploadBrochure = async () => {
    if (!broListing?.id) return;
    if (!broFile) {
      setBroErr("Pick a PDF first.");
      return;
    }

    setBroUploading(true);
    setBroErr("");

    try {
      const token = tokenOrThrow();

      const presignRes = await fetch(`${API_BASE}/uploads/presign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: "listing-brochure",
          listingId: broListing.id,
          contentType: "application/pdf",
          ext: "pdf",
          sizeBytes: broFile.size,
        }),
      });

      const presignJson = await presignRes.json().catch(() => ({}));
      if (!presignRes.ok) throw new Error(presignJson?.error || "Failed to presign brochure upload");

      const u = presignJson?.uploads?.[0];
      if (!u?.uploadUrl || !u?.publicUrl || !u?.key) {
        throw new Error("Presign response missing uploadUrl/publicUrl/key");
      }

      await putToSignedUrl(u.uploadUrl, broFile);

      const saveRes = await fetch(`${API_BASE}/uploads/listing/${broListing.id}/brochure`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key: u.key, url: u.publicUrl }),
      });

      const saveJson = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) throw new Error(saveJson?.error || "Failed to save brochure to DB");

      setItems((prev) =>
        prev.map((x) => (x.id === broListing.id ? { ...x, brochureUrl: u.publicUrl, brochureKey: u.key } : x))
      );

      setBroFile(null);
      alert("✅ Brochure uploaded");
      closeBrochurePopup();
    } catch (e) {
      console.error(e);
      setBroErr(e?.message || "Failed to upload brochure");
    } finally {
      setBroUploading(false);
    }
  };

  const removeBrochure = async () => {
    if (!broListing?.id) return;
    const ok = window.confirm("Remove brochure from this listing?");
    if (!ok) return;

    setBroUploading(true);
    setBroErr("");

    try {
      const token = tokenOrThrow();

      const res = await fetch(`${API_BASE}/uploads/listing/${broListing.id}/brochure`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to remove brochure");

      setItems((prev) =>
        prev.map((x) => (x.id === broListing.id ? { ...x, brochureUrl: null, brochureKey: null } : x))
      );

      alert("✅ Brochure removed");
      closeBrochurePopup();
    } catch (e) {
      console.error(e);
      setBroErr(e?.message || "Failed to remove brochure");
    } finally {
      setBroUploading(false);
    }
  };

  // order popup (OFF_PLAN only)
  const openOrderPopup = (listing) => {
    if (!listing?.featured) {
      alert("Order is only for Featured listings.");
      return;
    }
    setOrdErr("");
    setOrdListing(listing);
    const v = listing?.featuredOrder;
    setOrdValue(v === null || v === undefined ? "" : String(v));
    setOrdOpen(true);
  };

  const closeOrderPopup = () => {
    if (ordSaving) return;
    setOrdOpen(false);
    setOrdListing(null);
    setOrdValue("");
    setOrdErr("");
  };

  const saveOrder = async () => {
    if (!ordListing?.id) return;

    const trimmed = String(ordValue ?? "").trim();
    let nextOrder = null;

    if (trimmed !== "") {
      const n = Number(trimmed);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 9999) {
        setOrdErr("Order must be an integer between 0 and 9999 (or empty to clear).");
        return;
      }
      nextOrder = n;
    }

    setOrdSaving(true);
    setOrdErr("");

    try {
      const token = tokenOrThrow();

      const res = await fetch(`${API_BASE}/listings/${ordListing.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ featuredOrder: nextOrder }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to save order");

      setItems((prev) => prev.map((x) => (x.id === ordListing.id ? { ...x, featuredOrder: nextOrder } : x)));

      alert("✅ Order saved");
      closeOrderPopup();
    } catch (e) {
      console.error(e);
      setOrdErr(e?.message || "Failed to save order");
    } finally {
      setOrdSaving(false);
    }
  };

  /* =========================
     ✅ NEW: Sold/Rented toggle
  ========================= */
  const onToggleSoldRented = async (listing) => {
    if (!listing?.id) return;
    if (statusTogglingId) return;

    const lt = String(listing?.listingType || "").toUpperCase();
    if (lt !== "FOR_SALE" && lt !== "FOR_RENT") return;

    const nextStatus =
      lt === "FOR_SALE"
        ? (isSold(listing) ? "AVAILABLE" : "SOLD")
        : (isRented(listing) ? "AVAILABLE" : "RENTED");

    const label =
      lt === "FOR_SALE"
        ? (nextStatus === "SOLD" ? "mark as SOLD" : "mark as AVAILABLE")
        : (nextStatus === "RENTED" ? "mark as RENTED" : "mark as AVAILABLE");

    const ok = window.confirm(`Are you sure you want to ${label}?\n\nListing: "${listing.title}"`);
    if (!ok) return;

    setStatusTogglingId(listing.id);
    setListError("");

    // optimistic
    setItems((prev) => prev.map((x) => (x.id === listing.id ? { ...x, status: nextStatus } : x)));

    try {
      const token = tokenOrThrow();

      const res = await fetch(`${API_BASE}/listings/${listing.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        await loadListings();
        throw new Error(json?.error || "Failed to update listing status");
      }
    } catch (e) {
      console.error(e);
      setListError(e?.message || "Failed to update status");
      await loadListings();
    } finally {
      setStatusTogglingId(null);
    }
  };

  const onCountryChange = (e) => {
    const slug = e.target.value;
    const c = COUNTRIES.find((x) => x.slug === slug);
    setForm((p) => ({
      ...p,
      country: slug,
      city: c?.name || p.city,
    }));
  };

  const onPickCover = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image is too large. Max 100MB.");
      return;
    }

    setError("");
    setCoverFile(file);
    e.target.value = "";
  };

  const onPickGallery = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const f of files) {
      if (!f.type.startsWith("image/")) {
        setError("Gallery must be image files only.");
        e.target.value = "";
        return;
      }
      if (f.size > MAX_BYTES) {
        setError("A gallery image is too large. Max 100MB each.");
        e.target.value = "";
        return;
      }
    }

    setError("");
    setGalleryFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const filtered = files.filter((f) => !existing.has(`${f.name}-${f.size}`));
      return [...prev, ...filtered];
    });

    e.target.value = "";
  };

  const removeGalleryItem = (idx) => setGalleryFiles((prev) => prev.filter((_, i) => i !== idx));
  const clearAllGallery = () => setGalleryFiles([]);

  const deleteExistingImage = async (imageId) => {
    if (!editingId || !imageId) return;
    const ok = window.confirm("Delete this photo?");
    if (!ok) return;

    try {
      const token = tokenOrThrow();

      const res = await fetch(`${API_BASE}/uploads/listing/${editingId}/images/${imageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to delete image");

      setEditingGalleryImages((prev) => prev.filter((x) => x.id !== imageId));

      setItems((prev) =>
        prev.map((l) => {
          if (l.id !== editingId) return l;
          const imgs = Array.isArray(l.images) ? l.images : [];
          return { ...l, images: imgs.filter((im) => im.id !== imageId) };
        })
      );
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to delete image");
    }
  };

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  useEffect(() => {
    galleryPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    const next = galleryFiles.map((file) => ({
      url: URL.createObjectURL(file),
      name: file.name,
    }));
    setGalleryPreviews(next);
    return () => next.forEach((p) => URL.revokeObjectURL(p.url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryFiles]);

  const onDeleteListing = async (listing) => {
    if (deletingId) return;

    const ok = window.confirm(`Delete listing "${listing.title}"?\n\nThis is a soft delete.`);
    if (!ok) return;

    setDeletingId(listing.id);
    setListError("");

    try {
      const token = tokenOrThrow();
      setItems((prev) => prev.filter((x) => x.id !== listing.id));

      const res = await fetch(`${API_BASE}/listings/${listing.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await loadListings();
        throw new Error(data?.error || "Failed to delete listing");
      }
    } catch (e) {
      console.error(e);
      setListError(e.message || "Failed to delete listing");
    } finally {
      setDeletingId(null);
    }
  };

  const onToggleHidden = async (listing) => {
    if (togglingId) return;

    const nextHidden = !isHidden(listing);
    const ok = window.confirm(`${nextHidden ? "Hide" : "Unhide"} "${listing.title}"?`);
    if (!ok) return;

    setTogglingId(listing.id);
    setListError("");

    setItems((prev) => prev.map((x) => (x.id === listing.id ? { ...x, isHidden: nextHidden } : x)));

    try {
      const token = tokenOrThrow();

      const res = await fetch(`${API_BASE}/listings/${listing.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isHidden: nextHidden }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await loadListings();
        throw new Error(data?.error || "Failed to update visibility");
      }
    } catch (e) {
      console.error(e);
      setListError(e.message || "Failed to update visibility");
      await loadListings();
    } finally {
      setTogglingId(null);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSave || saving) return;

    setSaving(true);
    setError("");

    try {
      const token = tokenOrThrow();

      const payload = {
        title: form.title,
        country: form.country,

        latitude: toFloatOrNull(form.latitude),
        longitude: toFloatOrNull(form.longitude),
        addressText: form.addressText?.trim() ? form.addressText.trim() : null,

        propertyType: form.propertyType,
        category: form.category,
        city: form.city,
        area: form.area,

        paymentPlan: form.paymentPlan || null,

        listingType: form.listingType,
        featured: !!form.featured,

        completionYear: toIntOrNull(form.completionYear),
        developerName: form.developerName || null,
        locationLabel: form.locationLabel || null,

        startingPrice: toIntOrNull(form.startingPrice),
        currency: form.currency,
        description: form.description || null,

        bedrooms: toIntOrNull(form.bedrooms),
        bathrooms: toIntOrNull(form.bathrooms),
        parking: toIntOrNull(form.parking),
        sizeSqft: toIntOrNull(form.sizeSqft),
        sizeSqm: toIntOrNull(form.sizeSqm),

        assignedAgentId: form.assignedAgentId?.trim() ? form.assignedAgentId.trim() : null,
      };

      let listingId = editingId;

      if (!editingId) {
        const createRes = await fetch(`${API_BASE}/listings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...payload, isHidden: false }),
        });

        const createJson = await createRes.json().catch(() => ({}));
        if (!createRes.ok) throw new Error(createJson?.error || "Failed to create listing");

        listingId = createJson.id;
        if (!listingId) throw new Error("Create listing response missing id");
      } else {
        const updateRes = await fetch(`${API_BASE}/listings/${editingId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const updateJson = await updateRes.json().catch(() => ({}));
        if (!updateRes.ok) throw new Error(updateJson?.error || "Failed to update listing");
      }

      const hasNewMedia = !!coverFile || galleryFiles.length > 0;

      if (!editingId || hasNewMedia) {
        // Compress images before presign so sizes/types are accurate
        const rawFiles = [...(coverFile ? [coverFile] : []), ...galleryFiles];
        const compressed = await Promise.all(rawFiles.map((f) => compressImage(f)));

        const filesForPresign = compressed.map((f, i) => ({
          contentType: f.type || "application/octet-stream",
          ext: f.type === "image/jpeg" ? "jpg" : fileExt(f),
          isCover: coverFile ? i === 0 : false,
          sizeBytes: f.size,
        }));

        if (filesForPresign.length > 0) {
          const presignRes = await fetch(`${API_BASE}/uploads/presign`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ listingId, files: filesForPresign }),
          });

          const presignJson = await presignRes.json().catch(() => ({}));
          if (!presignRes.ok) throw new Error(presignJson?.error || "Failed to presign uploads");

          const uploads = presignJson.uploads || [];
          if (!uploads.length) throw new Error("No uploads returned from presign");

          for (let i = 0; i < uploads.length; i++) {
            const res = await fetch(uploads[i].uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": compressed[i].type || "application/octet-stream" },
              body: compressed[i],
            });
            if (!res.ok) throw new Error("Failed to upload file to storage");
          }

          const saveRes = await fetch(`${API_BASE}/uploads/listing/${listingId}/images`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              images: uploads.map((u) => ({
                key: u.key,
                url: u.publicUrl,
                isCover: !!u.isCover,
              })),
            }),
          });

          const saveJson = await saveRes.json().catch(() => ({}));
          if (!saveRes.ok) throw new Error(saveJson?.error || "Failed to save images to DB");
        }
      }

      setOpen(false);
      resetAll();
      await loadListings();
      alert(editingId ? "✅ Listing updated" : "✅ Listing created");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save listing");
    } finally {
      setSaving(false);
    }
  };

  const countryCenter = useMemo(() => {
    const c = COUNTRIES.find((x) => x.slug === form.country);
    return c?.center || { lat: 25.2048, lng: 55.2708 };
  }, [form.country]);

  const locationValue =
    form.latitude !== "" && form.longitude !== ""
      ? { lat: Number(form.latitude), lng: Number(form.longitude) }
      : null;

  // filter by agent + listingType + order
  const visibleItems = useMemo(() => {
    let filtered = items;

    if (agentFilterId !== "ALL") {
      filtered = filtered.filter((l) => {
        const id = l?.assignedAgentId || l?.assignedAgent?.id || l?.agentId || l?.agent?.id || "";
        return String(id) === String(agentFilterId);
      });
    }

    if (typeFilter !== "ALL") {
      filtered = filtered.filter((l) => String(l?.listingType || "") === String(typeFilter));
    }

    return [...filtered].sort(compareFeatured);
  }, [items, agentFilterId, typeFilter]);

  return (
    <div className="al">
      <div className="al-card">
        <div className="al-top">
          <div>
            <div className="al-title">Listings</div>
            <div className="al-sub">Manage your listings and their media.</div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="al-btn al-btnGhost" type="button" onClick={loadListings} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <button className="al-btn al-btnPrimary" type="button" onClick={openModalCreate}>
              + Add Listing
            </button>
          </div>
        </div>

        {listError && <div className="al-alert">{listError}</div>}

        {/* Filters bar (Agent + Type) */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, opacity: 0.8, minWidth: 90 }}>Filter agent:</div>
          <select
            className="al-input"
            value={agentFilterId}
            onChange={(e) => setAgentFilterId(e.target.value)}
            style={{ maxWidth: 320 }}
            disabled={agentsLoading}
          >
            <option value="ALL">All agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName}
              </option>
            ))}
          </select>

          <div style={{ fontSize: 13, opacity: 0.8, minWidth: 80 }}>Type:</div>
          <select
            className="al-input"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ maxWidth: 220 }}
          >
            <option value="ALL">All</option>
            {LISTING_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <div style={{ fontSize: 13, opacity: 0.75 }}>
            {agentsLoading ? "Loading agents…" : `${visibleItems.length} shown`}
          </div>
        </div>

        {loading ? (
          <div className="al-muted" style={{ marginTop: 14 }}>
            Loading…
          </div>
        ) : (
          <div className="al-list">
            {visibleItems.length === 0 ? (
              <div className="al-empty">No listings yet.</div>
            ) : (
              visibleItems.map((l) => {
                const brochureUrl = pickBrochureUrl(l);
                const hasOrder = Number.isFinite(Number(l?.featuredOrder));
                const sr = statusBadge(l);
                const lt = String(l?.listingType || "").toUpperCase();
                const showOrder = lt === "OFF_PLAN";
                const showSoldRented = lt === "FOR_SALE" || lt === "FOR_RENT";

                const srBtnLabel =
                  lt === "FOR_SALE"
                    ? (isSold(l) ? "Mark Available" : "Sold")
                    : (isRented(l) ? "Mark Available" : "Rented");

                return (
                  <div key={l.id} className="al-row">
                    <div className="al-leftRow">
                      <img
                        className="al-thumb"
                        src={coverUrl(l) || FALLBACK_THUMB}
                        alt={l.title || "Listing"}
                        loading="lazy"
                        onError={(e) => {
                          // ✅ prevent infinite loop
                          if (e.currentTarget.src !== FALLBACK_THUMB) {
                            e.currentTarget.src = FALLBACK_THUMB;
                          }
                        }}
                      />

                      <div className="al-meta">
                        <div className="al-nameRow">
                          <div className="al-name">{l.title}</div>

                          {l.featured ? <span className="al-tag">Featured</span> : null}
                          <span className="al-tag al-tagSoft">{badgeLabel(l.listingType)}</span>

                          {/* ✅ NEW: Sold/Rented badge */}
                          {sr ? <span className="al-tag al-tagSoft">{sr}</span> : null}

                          {isHidden(l) ? <span className="al-tag al-tagHidden">Hidden</span> : null}
                          {hasLocation(l) ? <span className="al-tag al-tagSoft">Has location</span> : null}
                          {brochureUrl ? <span className="al-tag al-tagSoft">Brochure</span> : null}

                          {/* keep "Order:" pill only for OFF_PLAN */}
                          {showOrder && l.featured ? (
                            <span className="al-tag al-tagSoft">Order: {hasOrder ? Number(l.featuredOrder) : "—"}</span>
                          ) : null}
                        </div>

                        <div className="al-line">
                          {l.area} · {l.city}
                          {l.country ? ` · ${l.country}` : ""}
                        </div>

                        <div className="al-line al-lineMuted">
                          {l.developerName ? `${l.developerName} · ` : ""}
                          {l.startingPrice
                            ? `${l.currency || "USD"} ${Number(l.startingPrice).toLocaleString()}`
                            : "No price"}{" "}
                          · {Array.isArray(l.images) ? `${l.images.length} photos` : "0 photos"}
                        </div>
                      </div>
                    </div>

                    <div className="al-actionsRow">
                      <button
                        type="button"
                        className="al-btn al-btnGhost"
                        onClick={() => openModalEdit(l)}
                        title="Edit listing"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="al-btn al-btnGhost"
                        onClick={() => openBrochurePopup(l)}
                        title="Upload brochure PDF"
                      >
                        Brochure
                      </button>

                      {/* ✅ OFF_PLAN keeps Order. FOR_SALE/FOR_RENT gets Sold/Rented toggle */}
                      {showOrder ? (
                        <button
                          type="button"
                          className="al-btn al-btnGhost"
                          onClick={() => openOrderPopup(l)}
                          disabled={!l.featured}
                          title={l.featured ? "Set featured order" : "Only Featured listings can be ordered"}
                          style={!l.featured ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                        >
                          Order
                        </button>
                      ) : showSoldRented ? (
                        <button
                          type="button"
                          className="al-btn al-btnGhost"
                          onClick={() => onToggleSoldRented(l)}
                          disabled={statusTogglingId === l.id}
                          title={lt === "FOR_SALE" ? "Toggle Sold/Available" : "Toggle Rented/Available"}
                        >
                          {statusTogglingId === l.id ? "Updating…" : srBtnLabel}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="al-btn al-btnGhost"
                        disabled={togglingId === l.id}
                        onClick={() => onToggleHidden(l)}
                        title={isHidden(l) ? "Unhide listing" : "Hide listing"}
                      >
                        {togglingId === l.id ? "Updating…" : isHidden(l) ? "Unhide" : "Hide"}
                      </button>

                      <button
                        type="button"
                        className="al-btn al-btnDanger"
                        disabled={deletingId === l.id}
                        onClick={() => onDeleteListing(l)}
                        title="Delete listing"
                      >
                        {deletingId === l.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Order modal (OFF_PLAN only) */}
      {ordOpen && (
        <div className="al-modalOverlay" onClick={closeOrderPopup} role="presentation">
          <div
            className="al-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            style={{ maxWidth: 520 }}
          >
            <div className="al-modalHeader">
              <div>
                <div className="al-modalTitle">Featured Order</div>
                <div className="al-modalSub">
                  {ordListing?.title ? `Listing: ${ordListing.title}` : "Set order for featured listing"}
                </div>
              </div>

              <button className="al-btn al-btnGhost" type="button" onClick={closeOrderPopup} disabled={ordSaving}>
                Close
              </button>
            </div>

            {ordErr ? <div className="al-alert">{ordErr}</div> : null}

            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 10 }}>
                Lower number = shows earlier. Leave empty to clear ordering.
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <div className="al-label">Order</div>
                  <input
                    className="al-input"
                    value={ordValue}
                    onChange={(e) => setOrdValue(e.target.value)}
                    inputMode="numeric"
                    placeholder="e.g. 1"
                    disabled={ordSaving}
                  />
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                  <button className="al-btn al-btnPrimary" type="button" onClick={saveOrder} disabled={ordSaving}>
                    {ordSaving ? "Saving..." : "Save"}
                  </button>
                  <button className="al-btn al-btnGhost" type="button" onClick={() => setOrdValue("")} disabled={ordSaving}>
                    Clear
                  </button>
                </div>

                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>
                  Needs backend support: <code>featuredOrder</code> column + <code>PATCH /listings/:id</code> accepts{" "}
                  <code>{"{ featuredOrder }"}</code>.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Brochure modal */}
      {broOpen && (
        <div className="al-modalOverlay" onClick={closeBrochurePopup} role="presentation">
          <div className="al-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ maxWidth: 560 }}>
            <div className="al-modalHeader">
              <div>
                <div className="al-modalTitle">Brochure PDF</div>
                <div className="al-modalSub">{broListing?.title ? `Listing: ${broListing.title}` : "Upload a brochure"}</div>
              </div>

              <button className="al-btn al-btnGhost" type="button" onClick={closeBrochurePopup} disabled={broUploading}>
                Close
              </button>
            </div>

            {broErr ? <div className="al-alert">{broErr}</div> : null}

            <div style={{ padding: 14 }}>
              <div
                style={{
                  border: "1px dashed rgba(0,0,0,0.15)",
                  borderRadius: 14,
                  padding: 16,
                  background: "rgba(0,0,0,0.02)",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  {pickBrochureUrl(broListing) ? "Current brochure is set ✅" : "No brochure uploaded yet"}
                </div>

                <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 10 }}>
                  PDF only · Max {Math.round(MAX_PDF_BYTES / (1024 * 1024))}MB
                </div>

                {pickBrochureUrl(broListing) ? (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <a className="al-btn al-btnGhost" href={pickBrochureUrl(broListing)} target="_blank" rel="noreferrer">
                      Open PDF
                    </a>

                    <button className="al-btn al-btnDanger" type="button" onClick={removeBrochure} disabled={broUploading}>
                      Remove
                    </button>
                  </div>
                ) : null}
              </div>

              <div style={{ height: 14 }} />

              <div>
                <div className="al-label">Upload new brochure</div>
                <input className="al-file" type="file" accept="application/pdf" onChange={onPickBrochure} disabled={broUploading} />

                {broFile ? (
                  <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>
                    Selected: <b>{broFile.name}</b> · {fmtBytes(broFile.size)}
                  </div>
                ) : (
                  <div style={{ marginTop: 10, fontSize: 13, opacity: 0.7 }}>Choose a PDF file to upload.</div>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button className="al-btn al-btnPrimary" type="button" onClick={uploadBrochure} disabled={broUploading}>
                    {broUploading ? "Uploading..." : "Upload PDF"}
                  </button>

                  <button className="al-btn al-btnGhost" type="button" onClick={() => setBroFile(null)} disabled={broUploading}>
                    Clear
                  </button>
                </div>

                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>
                  Uses: <code>POST /uploads/presign</code> (type listing-brochure) → <code>PUT</code> →{" "}
                  <code>POST /uploads/listing/:id/brochure</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit modal */}
      {open && (
        <div className="al-modalOverlay" onClick={closeModal} role="presentation">
          <div className="al-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="al-modalHeader">
              <div>
                <div className="al-modalTitle">{isEdit ? "Edit Listing" : "Add Listing"}</div>
                <div className="al-modalSub">
                  {isEdit ? "Update fields. Media is optional unless you want to replace it." : "Create a new listing and upload cover + gallery images."}
                </div>
              </div>

              <button className="al-btn al-btnGhost" type="button" onClick={closeModal} disabled={saving}>
                Close
              </button>
            </div>

            {error && <div className="al-alert">{error}</div>}

            {/* your existing form stays the same */}
            <form onSubmit={onSubmit} className="al-form">
              <div className="al-grid">
                {/* LEFT: Media */}
                <div className="al-mediaCard">
                  <div className="al-label">Cover image {isEdit ? "(optional)" : "*"}</div>
                  <input className="al-file" type="file" accept="image/*" onChange={onPickCover} />

                  <div className="al-drop">
                    {coverPreview ? (
                      <img className="al-previewImg" src={coverPreview} alt="Cover preview" />
                    ) : isEdit && editingCoverUrl ? (
                      <img className="al-previewImg" src={editingCoverUrl} alt="Current cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                    ) : (
                      <div className="al-dropInner">
                        <div className="al-dropTitle">{isEdit ? "Keep current cover or pick a new one" : "Choose cover image"}</div>
                        <div className="al-dropHint">PNG/JPG · Max 100MB</div>
                      </div>
                    )}
                  </div>

                  <div className="al-sep" />

                  <div className="al-mediaTop">
                    <div>
                      <div className="al-label" style={{ marginBottom: 2 }}>
                        Gallery images
                      </div>
                      <div className="al-miniHint">Optional</div>
                    </div>

                    {galleryFiles.length > 0 && (
                      <button type="button" className="al-btn al-btnGhost" onClick={clearAllGallery} disabled={saving}>
                        Clear
                      </button>
                    )}
                  </div>

                  <input className="al-file" type="file" accept="image/*" multiple onChange={onPickGallery} />

                  {galleryPreviews.length > 0 ? (
                    <div className="al-galleryGrid">
                      {galleryPreviews.map((p, idx) => (
                        <div key={`${p.name}-${idx}`} className="al-galleryItem">
                          <img src={p.url} alt={p.name} />
                          <button type="button" className="al-galleryRemove" onClick={() => removeGalleryItem(idx)} aria-label="Remove image">
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : isEdit && editingGalleryImages.length > 0 ? (
                    <div className="al-galleryGrid">
                      {editingGalleryImages.map((img, idx) => (
                        <div key={`${img.id}-${idx}`} className="al-galleryItem">
                          <img src={img.url} alt={`Gallery ${idx + 1}`} onError={(e) => (e.currentTarget.style.display = "none")} />
                          <button type="button" className="al-galleryRemove" onClick={() => deleteExistingImage(img.id)} aria-label="Delete image">
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="al-emptyGallery">{isEdit ? "No gallery images for this listing yet." : "No gallery images selected."}</div>
                  )}
                </div>

                {/* RIGHT: Fields */}
                <div className="al-fieldsCard">
                  <div className="al-fieldsGrid">
                    <div className="al-span2">
                      <div className="al-label">Country *</div>
                      <select className="al-input" value={form.country} onChange={onCountryChange}>
                        {COUNTRIES.map((c) => (
                          <option key={c.slug} value={c.slug}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <div className="al-miniHint">This powers /listings?country={form.country}</div>
                    </div>

                    <div className="al-span2">
                      <div className="al-label">Title *</div>
                      <input className="al-input" value={form.title} onChange={set("title")} />
                    </div>

                    <div className="al-span2">
                      <div className="al-label">Map Location (click to drop pin)</div>
                      <LocationPicker
                        value={locationValue}
                        defaultCenter={countryCenter}
                        onChange={({ lat, lng }) => setForm((p) => ({ ...p, latitude: String(lat), longitude: String(lng) }))}
                        height={260}
                      />

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                        <div>
                          <div className="al-label">Latitude</div>
                          <input className="al-input" value={form.latitude} onChange={set("latitude")} placeholder="25.2048" />
                        </div>
                        <div>
                          <div className="al-label">Longitude</div>
                          <input className="al-input" value={form.longitude} onChange={set("longitude")} placeholder="55.2708" />
                        </div>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <div className="al-label">Address label (optional)</div>
                        <input className="al-input" value={form.addressText} onChange={set("addressText")} placeholder="Dubai Marina, near Metro..." />
                        <div className="al-miniHint" style={{ marginTop: 6 }}>
                          Leave empty if you only want pin coordinates.
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="al-label">Listing Type</div>
                      <select className="al-input" value={form.listingType} onChange={set("listingType")}>
                        {LISTING_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="al-checkWrap">
                      <div className="al-label">Featured</div>
                      <label className="al-check">
                        <input type="checkbox" checked={form.featured} onChange={set("featured")} />
                        <span>Show on homepage</span>
                      </label>
                    </div>

                    <div>
                      <div className="al-label">City *</div>
                      <input className="al-input" value={form.city} onChange={set("city")} />
                    </div>

                    <div>
                      <div className="al-label">Area / Community *</div>
                      <input className="al-input" value={form.area} onChange={set("area")} placeholder="Start typing…" list="al-area-datalist" autoComplete="off" />
                      <datalist id="al-area-datalist">
                        {areaOptions.map((a) => (
                          <option key={a} value={a} />
                        ))}
                      </datalist>
                      <div className="al-miniHint">{areasLoading ? "Searching existing areas…" : "Pick an existing area or type a new one."}</div>
                    </div>

                    <div>
                      <div className="al-label">Property Type</div>
                      <select className="al-input" value={form.propertyType} onChange={set("propertyType")}>
                        {PROPERTY_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="al-label">Category</div>
                      <select className="al-input" value={form.category} onChange={set("category")}>
                        {CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="al-label">Developer</div>
                      <input className="al-input" value={form.developerName} onChange={set("developerName")} />
                    </div>

                    <div>
                      <div className="al-label">Location Label</div>
                      <input className="al-input" value={form.locationLabel} onChange={set("locationLabel")} />
                    </div>

                    <div>
                      <div className="al-label">Completion Year</div>
                      <input className="al-input" value={form.completionYear} onChange={set("completionYear")} inputMode="numeric" />
                    </div>

                    <div>
                      <div className="al-label">Starting Price</div>
                      <input className="al-input" value={form.startingPrice} onChange={set("startingPrice")} inputMode="numeric" />
                    </div>

                    <div>
                      <div className="al-label">Currency</div>
                      <select className="al-input" value={form.currency} onChange={set("currency")}>
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="al-label">Payment Plan</div>
                      <input className="al-input" value={form.paymentPlan} onChange={set("paymentPlan")} placeholder="10/40/50" />
                    </div>

                    <div>
                      <div className="al-label">Bedrooms</div>
                      <input className="al-input" value={form.bedrooms} onChange={set("bedrooms")} inputMode="numeric" placeholder="1" />
                    </div>

                    <div>
                      <div className="al-label">Bathrooms (Toilets)</div>
                      <input className="al-input" value={form.bathrooms} onChange={set("bathrooms")} inputMode="numeric" placeholder="2" />
                    </div>

                    <div>
                      <div className="al-label">Parking</div>
                      <input className="al-input" value={form.parking} onChange={set("parking")} inputMode="numeric" placeholder="1" />
                    </div>

                    <div>
                      <div className="al-label">Size (sqft)</div>
                      <input className="al-input" value={form.sizeSqft} onChange={set("sizeSqft")} inputMode="numeric" placeholder="762" />
                    </div>

                    <div>
                      <div className="al-label">Size (m²)</div>
                      <input className="al-input" value={form.sizeSqm} onChange={set("sizeSqm")} inputMode="numeric" placeholder="71" />
                      <div className="al-miniHint">Optional. If empty, you can compute it from sqft in the public API.</div>
                    </div>

                    <div>
                      <div className="al-label">Assigned Agent</div>
                      <select className="al-input" value={form.assignedAgentId} onChange={set("assignedAgentId")}>
                        <option value="">None</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.fullName}
                          </option>
                        ))}
                      </select>
                      {agentsLoading && <div className="al-miniHint">Loading agents…</div>}
                      {!agentsLoading && agents.length === 0 && <div className="al-miniHint">No agents found.</div>}
                    </div>

                    <div className="al-span2">
                      <div className="al-label">Description</div>
                      <textarea className="al-textarea" value={form.description} onChange={set("description")} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="al-footer">
                <div className="al-footNote">
                  Required: title, city, area, {isEdit ? "cover image (existing is OK)." : "cover image."}
                </div>
                <div className="al-footerBtns">
                  <button type="button" className="al-btn al-btnGhost" onClick={closeModal} disabled={saving}>
                    Cancel
                  </button>
                  <button type="submit" className="al-btn al-btnPrimary" disabled={!canSave || saving}>
                    {saving ? "Saving..." : isEdit ? "Save Changes" : "Save Listing"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}