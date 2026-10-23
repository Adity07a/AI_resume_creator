import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
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

function GapAnalysis() {
  const [searchParams] = useSearchParams();
  const analysisId = searchParams.get("id");

  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Demo fallback data agar backend data abhi fetch na ho
  const mockData = {
    overallMatch: 78,
    requiredSkillsMatched: "12/15",
    missingSkillsCount: 3,
    experienceRelevance: "High",
    keywordCoverage: "72%",
    profileCompleteness: "90%",
    matchedRequirements: ["Python", "Django", "REST APIs", "Git", "PostgreSQL"],
    missingRequirements: ["FastAPI async routing", "Docker multi-stage builds", "Kubernetes"],
    weakRepresentations: ["Redis caching integration"],
  };

  useEffect(() => {
    async function fetchAnalysis() {
      const token = getAccessToken();
      if (!token || !analysisId) {
        setAnalysisData(mockData);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/analysis/${analysisId}/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Could not load analysis details from server.");
        }

        const data = await response.json();
        setAnalysisData(data);
      } catch (err) {
        console.warn(err.message);
        setAnalysisData(mockData);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalysis();
  }, [analysisId]);

  return (
    <div className="builder-page">
      <header className="builder-header">
        <Link to="/dashboard" className="auth-logo builder-logo">
          <span className="logo-icon">R</span>
          Resume<span className="logo-highlight">AI</span>
        </Link>
        <span className="builder-header-label">Gap Analysis Dashboard</span>
        <Link to="/dashboard" className="builder-back-link">
          ← Back to Dashboard
        </Link>
      </header>

      <div className="builder-layout" style={{ display: "block", maxWidth: "1100px", margin: "0 auto", padding: "30px 20px" }}>
        <div className="dashboard-section-heading" style={{ marginBottom: "24px" }}>
          <div>
            <span className="welcome-label">JD & RESUME MATCH BREAKDOWN</span>
            <h1>Gap Analysis Dashboard</h1>
            <p>Understand how well your profile aligns with target requirements across key areas.</p>
          </div>
          <Link to="/optimization" className="primary-btn">
            Proceed to AI Optimization →
          </Link>
        </div>

        {error && <p className="form-error" role="alert" style={{ marginBottom: "16px" }}>{error}</p>}

        {loading ? (
          <p className="empty-resumes">Analyzing resume gaps...</p>
        ) : analysisData ? (
          <>
            {/* Cards Grid as per Guide Section 9 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px", marginBottom: "30px" }}>
              <div className="action-card" style={{ padding: "20px" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "700" }}>OVERALL MATCH</span>
                <p style={{ fontSize: "2rem", fontWeight: "800", color: "var(--primary)", margin: "8px 0 0" }}>
                  {analysisData.overallMatch || analysisData.overall_match_score || "78"}%
                </p>
              </div>

              <div className="action-card" style={{ padding: "20px" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "700" }}>REQUIRED SKILLS</span>
                <p style={{ fontSize: "2rem", fontWeight: "800", color: "#10b981", margin: "8px 0 0" }}>
                  {analysisData.requiredSkillsMatched || "12/15"}
                </p>
              </div>

              <div className="action-card" style={{ padding: "20px" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "700" }}>MISSING SKILLS</span>
                <p style={{ fontSize: "2rem", fontWeight: "800", color: "#dc2626", margin: "8px 0 0" }}>
                  {analysisData.missingSkillsCount || 3}
                </p>
              </div>

              <div className="action-card" style={{ padding: "20px" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "700" }}>EXPERIENCE RELEVANCE</span>
                <p style={{ fontSize: "1.5rem", fontWeight: "800", color: "#3b82f6", margin: "8px 0 0" }}>
                  {analysisData.experienceRelevance || "High"}
                </p>
              </div>

              <div className="action-card" style={{ padding: "20px" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "700" }}>KEYWORD COVERAGE</span>
                <p style={{ fontSize: "2rem", fontWeight: "800", color: "#8b5cf6", margin: "8px 0 0" }}>
                  {analysisData.keywordCoverage || "72%"}
                </p>
              </div>

              <div className="action-card" style={{ padding: "20px" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "700" }}>PROFILE COMPLETENESS</span>
                <p style={{ fontSize: "2rem", fontWeight: "800", color: "#10b981", margin: "8px 0 0" }}>
                  {analysisData.profileCompleteness || "90%"}
                </p>
              </div>
            </div>

            {/* Gap Categories as per Guide Section 10 */}
            <div className="action-card" style={{ display: "block", padding: "24px" }}>
              <h3 style={{ marginBottom: "16px" }}>Detailed Gap Categories</h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ padding: "12px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px", borderLeft: "4px solid #10b981" }}>
                  <strong>✓ Matched Requirements (Green):</strong>
                  <p style={{ margin: "4px 0 0", fontSize: "0.9rem" }}>{(analysisData.matchedRequirements || []).join(", ")}</p>
                </div>

                <div style={{ padding: "12px", background: "rgba(220, 38, 38, 0.1)", borderRadius: "8px", borderLeft: "4px solid #dc2626" }}>
                  <strong>✕ Missing Requirements (Red/Orange):</strong>
                  <p style={{ margin: "4px 0 0", fontSize: "0.9rem" }}>{(analysisData.missingRequirements || []).join(", ")}</p>
                </div>

                <div style={{ padding: "12px", background: "rgba(234, 179, 8, 0.1)", borderRadius: "8px", borderLeft: "4px solid #eab308" }}>
                  <strong>⚠ Weak Representation (Yellow):</strong>
                  <p style={{ margin: "4px 0 0", fontSize: "0.9rem" }}>{(analysisData.weakRepresentations || []).join(", ")}</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="empty-resumes">No analysis data found.</p>
        )}
      </div>
    </div>
  );
}

export default GapAnalysis;