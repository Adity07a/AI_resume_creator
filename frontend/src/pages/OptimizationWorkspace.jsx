import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import "../App.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");

function getAccessToken() {
  return (
    localStorage.getItem("resumeai-access-token") ||
    sessionStorage.getItem("resumeai-access-token")
  );
}

function OptimizationWorkspace() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const resumeId = searchParams.get("resumeId");

  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Dummy mock suggestions fallback agar backend API abhi integration phase mein ho
  const mockSuggestions = [
    {
      id: 1,
      section: "Experience",
      currentText: "Worked on backend APIs for payment processing.",
      suggestedText: "Designed and maintained FastAPI services supporting secure payment authorization workflows.",
      reason: "Better alignment with target role's API ownership requirement.",
      evidence: "Experience #2 + Project #4",
      status: "pending", // pending, approved, rejected
    },
    {
      id: 2,
      section: "Skills",
      currentText: "Python, JavaScript, SQL",
      suggestedText: "Python, FastAPI, Django, React, PostgreSQL, Docker, Redis",
      reason: "Includes essential keywords extracted from the target Job Description.",
      evidence: "JD Skill Matrix Match",
      status: "pending",
    },
  ];

  useEffect(() => {
    async function fetchSuggestions() {
      const token = getAccessToken();
      if (!token) {
        setError("Please log in to view optimization suggestions.");
        setSuggestions(mockSuggestions);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/suggestions/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Could not fetch server suggestions. Showing demo suggestions.");
        }

        const data = await response.json();
        setSuggestions(Array.isArray(data) && data.length > 0 ? data : mockSuggestions);
      } catch (err) {
        console.warn(err.message);
        setSuggestions(mockSuggestions);
      } finally {
        setLoading(false);
      }
    }

    fetchSuggestions();
  }, []);

  async function handleDecision(id, decision, updatedText = null) {
    setError("");
    setSuccessMsg("");
    const token = getAccessToken();

    // Local UI update first for smooth user experience
    setSuggestions((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: decision,
              suggestedText: updatedText !== null ? updatedText : item.suggestedText,
            }
          : item
      )
    );

    if (!token) {
      setSuccessMsg(`Suggestion successfully ${decision}! (Local Mode)`);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/suggestions/${id}/decision/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          decision, // 'approve' or 'reject'
          updated_content: updatedText,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to sync decision with server.");
      }

      setSuccessMsg(`Suggestion ${decision}ed successfully!`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="builder-page">
      <header className="builder-header">
        <Link to="/dashboard" className="auth-logo builder-logo">
          <span className="logo-icon">R</span>
          Resume<span className="logo-highlight">AI</span>
        </Link>
        <span className="builder-header-label">Optimization Workspace</span>
        <Link to="/dashboard" className="builder-back-link">
          ← Back to Dashboard
        </Link>
      </header>

      <div className="builder-layout" style={{ display: "block", maxWidth: "1100px", margin: "0 auto", padding: "30px 20px" }}>
        <div className="dashboard-section-heading" style={{ marginBottom: "24px" }}>
          <div>
            <span className="welcome-label">AI REWRITE WORKSPACE</span>
            <h1>Review & Approve Suggestions</h1>
            <p>Compare your current resume text with AI-suggested improvements aligned with your target job description.</p>
          </div>
          {resumeId && (
            <Link to={`/resume-builder?id=${resumeId}`} className="secondary-btn">
              Back to Resume Editor →
            </Link>
          )}
        </div>

        {error && <p className="form-error" role="alert" style={{ marginBottom: "16px" }}>{error}</p>}
        {successMsg && <p className="form-success" role="status" style={{ marginBottom: "16px" }}>{successMsg}</p>}

        {loading ? (
          <p className="empty-resumes">Loading AI suggestions...</p>
        ) : suggestions.length === 0 ? (
          <p className="empty-resumes">No pending suggestions found.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {suggestions.map((item) => (
              <div
                key={item.id}
                className="action-card"
                style={{
                  display: "block",
                  padding: "24px",
                  borderColor:
                    item.status === "approved"
                      ? "#10b981"
                      : item.status === "rejected"
                      ? "#dc2626"
                      : "var(--border-color)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <span className="resume-status" style={{ textTransform: "uppercase" }}>
                    Section: {item.section}
                  </span>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: "700",
                      color:
                        item.status === "approved"
                          ? "#10b981"
                          : item.status === "rejected"
                          ? "#dc2626"
                          : "var(--primary)",
                    }}
                  >
                    Status: {item.status.toUpperCase()}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "16px" }}>
                  <div style={{ background: "var(--page-bg)", padding: "14px", borderRadius: "8px" }}>
                    <strong style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Current Content:
                    </strong>
                    <p style={{ margin: 0, fontSize: "0.92rem", whiteSpace: "pre-wrap" }}>{item.currentText}</p>
                  </div>

                  <div style={{ background: "var(--purple-light)", padding: "14px", borderRadius: "8px" }}>
                    <strong style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", color: "var(--primary)" }}>
                      Suggested AI Rewrite:
                    </strong>
                    <textarea
                      value={item.suggestedText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSuggestions((prev) =>
                          prev.map((s) => (s.id === item.id ? { ...s, suggestedText: val } : s))
                        );
                      }}
                      rows={3}
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "1px dashed var(--primary)",
                        borderRadius: "6px",
                        padding: "8px",
                        color: "inherit",
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "16px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  <p style={{ margin: "4px 0" }}><strong>Reason:</strong> {item.reason}</p>
                  <p style={{ margin: "4px 0" }}><strong>Evidence:</strong> {item.evidence}</p>
                </div>

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="secondary-btn"
                    style={{ borderColor: "#dc2626", color: "#dc2626" }}
                    onClick={() => handleDecision(item.id, "rejected")}
                  >
                    Reject ✕
                  </button>

                  <button
                    type="button"
                    className="primary-btn"
                    style={{ background: "#10b981" }}
                    onClick={() => handleDecision(item.id, "approved", item.suggestedText)}
                  >
                    Approve ✓
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OptimizationWorkspace;