import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import "../App.css";

function getToken() {
  return (
    localStorage.getItem("resumeai-access-token") ||
    sessionStorage.getItem("resumeai-access-token")
  );
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sourceLabel(job) {
  const source = String(job.source_type || "text").toLowerCase();
  if (source.includes("url") || job.source_url) return "Website URL";
  if (source.includes("file") || source.includes("upload")) return "Uploaded file";
  return "Pasted text";
}

function SavedJDHistory() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");

    if (!getToken()) {
      setError("Please log in again to view your saved job descriptions.");
      setJobs([]);
      setLoading(false);
      return;
    }

    try {
      const result = await apiRequest("/job-descriptions/");
      const items = Array.isArray(result)
        ? result
        : Array.isArray(result?.results)
          ? result.results
          : [];
      setJobs(items);
    } catch (err) {
      setError(err.message || "Could not load saved job descriptions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sorted = [...jobs].sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
      const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
      return dateB - dateA;
    });

    if (!query) return sorted;
    return sorted.filter((job) =>
      [job.title, job.job_title, job.company_name, job.description, job.source_url]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [jobs, search]);

  function useJobDescription(job) {
    if (!job) return;
    navigate("/job-description", { state: { savedJD: job } });
  }

  return (
    <main className="jd-page">
      <header className="jd-header">
        <Link to="/dashboard" className="auth-logo">
          <span className="logo-icon">R</span>
          Resume<span className="logo-highlight">AI</span>
        </Link>
        <div className="jd-header-actions" style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <Link to="/job-description" className="secondary-btn">
            + Import Job Description
          </Link>
          <Link to="/dashboard" className="builder-back-link">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="jd-container">
        <div className="jd-intro">
          <span className="jd-eyebrow">YOUR SAVED JOBS</span>
          <h1>Saved JD History</h1>
          <p>
            All job descriptions imported or saved to your account are listed here.
            Choose one to return to the Job Description page and analyze it against a resume.
          </p>
        </div>

        <section className="jd-card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <h2 style={{ marginBottom: "6px" }}>Job Description Library</h2>
              <p className="jd-muted" style={{ marginTop: 0 }}>
                {jobs.length} saved {jobs.length === 1 ? "job description" : "job descriptions"}
              </p>
            </div>
            <button type="button" className="secondary-btn" onClick={loadHistory} disabled={loading}>
              {loading ? "Refreshing…" : "↻ Refresh"}
            </button>
          </div>

          <div className="jd-field">
            <label htmlFor="saved-jd-search">Search history</label>
            <input
              id="saved-jd-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, company, job title, or description"
            />
          </div>

          {error && <p className="jd-error" role="alert">{error}</p>}
          {notice && <p className="jd-success" role="status">{notice}</p>}

          {loading ? (
            <p className="jd-muted" role="status">Loading your saved job descriptions…</p>
          ) : error ? (
            <div className="jd-note">
              Check that you are logged in and the backend is running, then refresh this page.
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="jd-note">
              {jobs.length === 0
                ? "No saved job descriptions yet. Use Import Job Description to paste text, import a public URL, or upload a PDF, DOCX, or TXT file."
                : "No saved job descriptions match your search. Try another keyword."}
            </div>
          ) : (
            <div className="saved-jd-list" style={{ display: "grid", gap: "16px", marginTop: "20px" }}>
              {filteredJobs.map((job) => (
                <article
                  className="saved-jd-item"
                  key={job.id}
                  style={{
                    border: "1px solid var(--border, #e7e5f0)",
                    borderRadius: "14px",
                    padding: "18px",
                    background: "var(--card-bg, #fff)",
                    minWidth: 0,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0, flex: "1 1 280px" }}>
                      <h3 style={{ margin: "0 0 8px", overflowWrap: "anywhere" }}>
                        {job.title || job.job_title || "Untitled Job Description"}
                      </h3>
                      <p className="jd-muted" style={{ margin: "0 0 8px" }}>
                        {[job.job_title, job.company_name].filter(Boolean).join(" · ") || "Job title or company not provided"}
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                        <span className="jd-history-chip" style={{ border: "1px solid var(--border, #e7e5f0)", borderRadius: "999px", padding: "4px 9px", fontSize: "12px", color: "var(--muted, #737387)" }}>{sourceLabel(job)}</span>
                        <span className="jd-history-chip" style={{ border: "1px solid var(--border, #e7e5f0)", borderRadius: "999px", padding: "4px 9px", fontSize: "12px", color: "var(--muted, #737387)" }}>Saved {formatDate(job.created_at || job.updated_at)}</span>
                      </div>
                      <p style={{ margin: 0, lineHeight: 1.65, overflowWrap: "anywhere" }}>
                        {String(job.description || "No description text returned by the server.").slice(0, 260)}
                        {String(job.description || "").length > 260 ? "…" : ""}
                      </p>
                      {job.source_url && (
                        <p className="jd-muted" style={{ marginBottom: 0, overflowWrap: "anywhere" }}>
                          Source: {job.source_url}
                        </p>
                      )}
                    </div>
                    <button type="button" className="primary-btn" onClick={() => useJobDescription(job)}>
                      Use this JD →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default SavedJDHistory;
