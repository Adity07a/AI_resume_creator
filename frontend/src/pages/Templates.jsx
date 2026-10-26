import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");

function getTemplateStyle(template) {
  const slug = String(template.slug || "").toLowerCase();
  const category = String(template.category || "").toLowerCase();
  const knownStyles = [
    "classic",
    "professional",
    "modern",
    "minimal",
    "technical",
    "executive",
    "contemporary",
    "compact",
    "burgundy",
  ];

  if (knownStyles.includes(slug)) return slug;
  if (knownStyles.includes(category)) return category;
  return slug.replace(/[^a-z0-9_-]/g, "-") || "classic";
}

function Templates({ hideHeader = false }) {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/resumes/templates/`);
      let payload = null;

      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const message =
          payload?.detail ||
          payload?.error ||
          `Unable to load templates (HTTP ${response.status}).`;
        throw new Error(message);
      }

      // Supports both a plain DRF list and a paginated { results: [...] } response.
      const templateList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.results)
          ? payload.results
          : null;

      if (!templateList) {
        throw new Error("The templates API returned an unexpected response.");
      }

      const normalizedTemplates = templateList
        .filter((template) => template && (template.slug || template.id))
        .map((template) => ({
          ...template,
          id: String(template.slug || template.id),
          name: template.name || "Untitled Template",
          description: template.description || "Professional resume layout",
          style: getTemplateStyle(template),
        }));

      setTemplates(normalizedTemplates);
    } catch (err) {
      setError(err.message || "Unable to load resume templates. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchTemplates();
    });
  }, [fetchTemplates]);

  function handleUseTemplate(templateId) {
    navigate(`/resume-builder?template=${encodeURIComponent(templateId)}`);
 }

  return (
    <div className="templates-page" style={hideHeader ? { background: "transparent" } : {}}>
      {!hideHeader && (
        <header className="templates-header">
          <Link to="/dashboard" className="auth-logo">
            <span className="logo-icon">R</span>
            Resume<span className="logo-highlight">AI</span>
          </Link>

          <Link to="/dashboard" className="builder-back-link">
            ← Back to Dashboard
          </Link>
        </header>
      )}

      <main className="templates-main" style={hideHeader ? { padding: "10px 2%" } : undefined}>
        {!hideHeader && (
          <div className="templates-intro">
            <span className="welcome-label">MAKE IT YOURS</span>
            <h1>Choose Your Resume Template</h1>
            <p>
              Choose a professional design for your resume.
              You can customize your details in the next step.
            </p>
          </div>
        )}

        {loading && (
          <div className="templates-status" role="status" aria-live="polite">
            Loading resume templates...
          </div>
        )}

        {!loading && error && (
          <div className="templates-status templates-error" role="alert">
            <p>{error}</p>
            <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  setLoading(true);
                  setError("");
                  fetchTemplates();
                }}
              >
                Try Again
              </button>
          </div>
        )}

        {!loading && !error && templates.length === 0 && (
          <div className="templates-status" role="status">
            No active resume templates are available right now. Please check back later.
          </div>
        )}

        {!loading && !error && templates.length > 0 && (
          <div className="templates-grid">
            {templates.map((template) => (
              <article className="template-card" key={template.id}>
                <div className={`template-preview ${template.style}`}>
                  {template.preview_image_url ? (
                    <img
                      src={template.preview_image_url}
                      alt={`${template.name} preview`}
                      loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  ) : template.style === "professional" || template.style === "burgundy" ? (
                    <div className="mini-sidebar-resume">
                      <div className="mini-colored-sidebar">
                        <div className="mini-name">YOUR NAME</div>
                        <strong>CONTACT</strong>
                        <span />
                        <span />
                        <strong>SKILLS</strong>
                        <span />
                        <span />
                        <span />
                      </div>

                      <div className="mini-sidebar-content">
                        <strong>PROFESSIONAL SUMMARY</strong>
                        <span />
                        <span />
                        <strong>EXPERIENCE</strong>
                        <span />
                        <span />
                        <strong>EDUCATION</strong>
                        <span />
                      </div>
                    </div>
                  ) : (
                    <div className="mini-resume">
                      <div className="mini-resume-header">
                        <div className="mini-name">YOUR NAME</div>
                        <div className="mini-contact">email@example.com | Phone</div>
                      </div>

                      <div className="mini-section">
                        <strong>PROFESSIONAL SUMMARY</strong>
                        <span />
                        <span />
                        <span className="short-line" />
                      </div>

                      <div className="mini-section">
                        <strong>EDUCATION</strong>
                        <span />
                        <span className="short-line" />
                      </div>

                      <div className="mini-section">
                        <strong>TECHNICAL SKILLS</strong>
                        <span />
                        <span />
                      </div>

                      <div className="mini-section">
                        <strong>PROJECTS</strong>
                        <span />
                        <span className="short-line" />
                      </div>

                      <div className="mini-section">
                        <strong>EXPERIENCE</strong>
                        <span />
                        <span className="short-line" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="template-card-info">
                  <div>
                    <h2>{template.name}</h2>
                    <p>{template.description}</p>
                    {template.is_ats_friendly && <small>ATS-friendly</small>}
                  </div>

                  <button
                    type="button"
                    className="primary-btn template-use-btn"
                    onClick={() => handleUseTemplate(template.id)}
                  >
                    Use Template →
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Templates;
