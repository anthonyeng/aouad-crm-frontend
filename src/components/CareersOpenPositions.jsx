import { useEffect, useMemo, useState } from "react";
import "./careersPageSections.css";
import { fbTrack } from "../lib/fbpixel.js";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

export default function CareersOpenPositions() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadErr, setLoadErr] = useState("");

    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(null);

    // form
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [letter, setLetter] = useState("");
    const [cvFile, setCvFile] = useState(null);
    const [err, setErr] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // ✅ optional: expand/collapse details per job
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                setLoading(true);
                setLoadErr("");

                const res = await fetch(`${API_BASE}/public/careers`);
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data?.error || "Failed to load jobs");

                if (!alive) return;
                setJobs(Array.isArray(data.items) ? data.items : []);
            } catch (e) {
                if (!alive) return;
                setJobs([]);
                setLoadErr(e.message || "Failed to load jobs");
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, []);

    const canSubmit = useMemo(() => {
        return (
            !!selected &&
            fullName.trim().length >= 2 &&
            email.trim().includes("@") &&
            email.trim().includes(".")
        );
    }, [selected, fullName, email]);

    const openApply = (job) => {
        setSelected(job);
        setOpen(true);
        setSuccess(false);

        setErr("");
        setFullName("");
        setEmail("");
        setPhone("");
        setLetter("");
        setCvFile(null);
    };

    const close = () => {
        if (submitting) return;
        setOpen(false);
        setSelected(null);
        setErr("");
    };

    // ESC + scroll lock
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKey = (e) => {
            if (e.key === "Escape") close();
        };
        document.addEventListener("keydown", onKey);

        return () => {
            document.body.style.overflow = prev;
            document.removeEventListener("keydown", onKey);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, submitting]);

    const onPickCV = (e) => {
        const f = e.target.files?.[0] || null;
        if (!f) return;

        const ok =
            f.type === "application/pdf" ||
            f.type === "application/msword" ||
            f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            /\.(pdf|doc|docx)$/i.test(f.name);

        if (!ok) {
            setErr("CV must be PDF / DOC / DOCX.");
            e.target.value = "";
            return;
        }
        if (f.size > 10 * 1024 * 1024) {
            setErr("CV is too large. Max 10MB.");
            e.target.value = "";
            return;
        }

        setErr("");
        setCvFile(f);
        e.target.value = "";
    };

    const removeCV = () => setCvFile(null);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit || submitting) return;

        setSubmitting(true);
        setErr("");

        try {
            const fd = new FormData();
            fd.append("fullName", fullName.trim());
            fd.append("email", email.trim());
            fd.append("phone", phone.trim());
            fd.append("coverLetter", letter.trim());
            if (cvFile) fd.append("cv", cvFile);

            const res = await fetch(`${API_BASE}/public/careers/${selected.id}/apply`, {
                method: "POST",
                body: fd,
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || "Failed to submit application");

            fbTrack("SubmitApplication", { content_name: selected?.title || "Career Application" });

            setSuccess(true);
        } catch (e2) {
            setErr(e2.message || "Failed to submit application");
        } finally {
            setSubmitting(false);
        }
    };

    const salaryLine = (r) => {
        if (!r.salaryMin && !r.salaryMax) return "";
        const cur = r.currency || "AED";
        const a = r.salaryMin ? String(r.salaryMin) : "";
        const b = r.salaryMax ? String(r.salaryMax) : "";
        return `${cur} ${a}${b ? ` - ${b}` : ""}`.trim();
    };

    const hasDetails = (r) => !!(r.responsibilities || r.requirements || r.benefits);

    return (
        <>
            <section className="csec">
                <div className="csec-inner">
                    <h2 className="csec-kicker">OPEN POSITIONS</h2>
                    <p className="csec-sub">
                        Explore our current opportunities and find the perfect role to grow your career with Aouad Lifestyle
                        Properties.
                    </p>

                    {loading ? (
                        <div className="csec-p">Loading…</div>
                    ) : loadErr ? (
                        <div className="csec-p">{loadErr}</div>
                    ) : jobs.length === 0 ? (
                        <div className="csec-p">No open positions right now.</div>
                    ) : (
                        <div className="ctable" role="table" aria-label="Open positions">
                            <div className="ctable-head" role="row">
                                <div role="columnheader">#</div>
                                <div role="columnheader">Title</div>
                                <div role="columnheader">Job Type</div>
                                <div role="columnheader">Location</div>
                                <div role="columnheader">Department</div>
                                <div className="ctable-right" role="columnheader">
                                    Apply
                                </div>
                            </div>

                            {jobs.map((r, idx) => {
                                const expanded = expandedId === r.id;
                                const details = hasDetails(r);

                                return (
                                    <div key={r.id} className="ctable-group">
                                        {/* ✅ MAIN ROW (keeps table aligned) */}
                                        <div className="ctable-row ctable-rowMain" role="row">
                                            <div className="ctable-num" role="cell">
                                                {idx + 1}
                                            </div>

                                            <div className="ctable-title" role="cell">
                                                <div className="ctable-titleMain">{r.title}</div>

                                                <div className="ctable-titleSub">
                                                    {r.workMode ? `${r.workMode} · ` : ""}
                                                    {r.location} · {r.type} · {r.dept}
                                                    {r.seniority ? ` · ${r.seniority}` : ""}
                                                    {salaryLine(r) ? ` · ${salaryLine(r)}` : ""}
                                                </div>

                                                {details ? (
                                                    <button
                                                        type="button"
                                                        className="cbtn-link"
                                                        onClick={() => setExpandedId(expanded ? null : r.id)}
                                                        aria-expanded={expanded}
                                                    >
                                                        {expanded ? "Hide details" : "View details"}
                                                    </button>
                                                ) : null}
                                            </div>

                                            <div className="ctable-cell" role="cell">
                                                {r.type}
                                            </div>
                                            <div className="ctable-cell" role="cell">
                                                {r.location}
                                            </div>
                                            <div className="ctable-cell" role="cell">
                                                {r.dept}
                                            </div>

                                            <div className="ctable-right" role="cell">
                                                <button className="cbtn-apply" type="button" onClick={() => openApply(r)}>
                                                    Apply
                                                </button>
                                            </div>
                                        </div>

                                        {/* ✅ DETAILS ROW (full width, looks clean) */}
                                        {details && expanded ? (
                                            <div className="ctable-rowDetails">
                                                <div className="cjob-detailsWide">
                                                    {r.responsibilities ? (
                                                        <div className="cjob-box">
                                                            <div className="cjob-h">Responsibilities</div>
                                                            <div className="cjob-t">{r.responsibilities}</div>
                                                        </div>
                                                    ) : null}

                                                    {r.requirements ? (
                                                        <div className="cjob-box">
                                                            <div className="cjob-h">Requirements</div>
                                                            <div className="cjob-t">{r.requirements}</div>
                                                        </div>
                                                    ) : null}

                                                    {r.benefits ? (
                                                        <div className="cjob-box cjob-span2">
                                                            <div className="cjob-h">Benefits</div>
                                                            <div className="cjob-t">{r.benefits}</div>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* APPLY POPUP */}
            {open && (
                <div className="cmodal-overlay" onClick={close} role="presentation">
                    <div className="cmodal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                        <div className="cmodal-top">
                            <div>
                                <div className="cmodal-title">Apply for this role</div>
                                <div className="cmodal-sub">
                                    {selected?.title} · {selected?.location} · {selected?.type} · {selected?.dept}
                                </div>
                            </div>
                            <button className="cmodal-x" type="button" onClick={close} aria-label="Close">
                                ✕
                            </button>
                        </div>

                        <form className="cmodal-card" onSubmit={onSubmit}>
                            {err ? <div className="cmodal-err">{err}</div> : null}

                            {success ? (
                                <div className="cmodal-success">
                                    <div className="cmodal-successH">Application sent ✅</div>
                                    <div className="cmodal-successP">
                                        Thanks! We received your application and will contact you if shortlisted.
                                    </div>
                                    <div className="cmodal-actions">
                                        <button className="cbtn-primary" type="button" onClick={close}>
                                            Close
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="cmodal-grid">
                                        <div className="cfield">
                                            <label className="clabel">Full name *</label>
                                            <input className="cinput" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                                        </div>

                                        <div className="cfield">
                                            <label className="clabel">Email *</label>
                                            <input className="cinput" value={email} onChange={(e) => setEmail(e.target.value)} />
                                        </div>

                                        <div className="cfield cspan2">
                                            <label className="clabel">Phone</label>
                                            <input className="cinput" value={phone} onChange={(e) => setPhone(e.target.value)} />
                                        </div>

                                        <div className="cfield cspan2">
                                            <label className="clabel">Cover letter</label>
                                            <textarea
                                                className="ctextarea"
                                                rows={6}
                                                value={letter}
                                                onChange={(e) => setLetter(e.target.value)}
                                                placeholder="Write a short cover letter..."
                                            />
                                        </div>

                                        <div className="cfield cspan2">
                                            <label className="clabel">Upload CV (PDF/DOC/DOCX)</label>
                                            <input className="cfile" type="file" accept=".pdf,.doc,.docx" onChange={onPickCV} />

                                            {cvFile ? (
                                                <div className="cfileRow">
                                                    <div className="cfileName">Selected: {cvFile.name}</div>
                                                    <button className="cbtn-ghost" type="button" onClick={removeCV}>
                                                        Remove
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="csmall">Max 10MB</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="cmodal-actions">
                                        <button className="cbtn-ghost" type="button" onClick={close} disabled={submitting}>
                                            Cancel
                                        </button>

                                        <button className="cbtn-primary" type="submit" disabled={!canSubmit || submitting}>
                                            {submitting ? "Submitting..." : "Submit Application →"}
                                        </button>
                                    </div>

                                    <div className="cmodal-note">Your CV + details will be submitted directly (no mailto).</div>
                                </>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
