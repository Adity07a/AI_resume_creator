import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest } from "../services/api";
import "../App.css";

const POLL_INTERVAL = 2000;
const MAX_POLL_ATTEMPTS = 60;

function formatLabel(value) {
  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.length ? value.map(formatValue).join(", ") : "None reported";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function findValue(source, keys) {
  if (!source || typeof source !== "object") return undefined;

  for (const key of keys) {
    if (
      source[key] !== undefined &&
      source[key] !== null &&
      source[key] !== ""
    ) {
      return source[key];
    }
  }

  return undefined;
}

function getResultData(analysis) {
  if (!analysis || typeof analysis !== "object") return {};

  const result = analysis.result;

  if (result && typeof result === "object" && !Array.isArray(result)) {
    return result;
  }

  return {};
}

function getStatusMessage(status) {
  switch (String(status || "").toUpperCase()) {
    case "CREATED":
      return "Analysis has been created and is waiting to start.";
    case "QUEUED":
      return "Your analysis is queued and waiting for the AI worker.";
    case "PROCESSING":
      return "The AI is analyzing your resume against the job description.";
    case "COMPLETED":
      return "Analysis completed successfully.";
    case "FAILED":
      return "Analysis failed. Check the error below and try again if appropriate.";
    default:
      return status
        ? `Current analysis status: ${formatLabel(status)}`
        : "Waiting for the analysis status from the server.";
  }
}

function MetricCard({ label, value }) {
  if (value === undefined || value === null || value === "") return null;

  return (
    <div className="action-card" style={{ padding: "20px" }}>
      <span
        style={{
          fontSize: "0.8rem",
          color: "var(--text-secondary)",
          fontWeight: "700",
        }}
      >
        {label.toUpperCase()}
      </span>
      <p
        style={{
          fontSize: "1.6rem",
          fontWeight: "800",
          color: "var(--primary)",
          margin: "8px 0 0",
          overflowWrap: "anywhere",
        }}
      >
        {formatValue(value)}
      </p>
    </div>
  );
}

function DetailList({ title, value, color, background }) {
  if (value === undefined || value === null) return null;

  const items = Array.isArray(value) ? value : [value];

  return (
    <div
      style={{
        padding: "12px",
        background,
        borderRadius: "8px",
        borderLeft: `4px solid ${color}`,
      }}
    >
      <strong>{title}</strong>

      {items.length === 0 ? (
        <p style={{ margin: "8px 0 0", fontSize: "0.9rem" }}>
          No items reported by the analysis.
        </p>
      ) : (
        <ul style={{ margin: "8px 0 0", paddingLeft: "22px" }}>
          {items.map((item, index) => (
            <li key={`${title}-${index}`} style={{ marginBottom: "5px" }}>
              {typeof item === "object" && item !== null
                ? formatValue(item)
                : String(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GapAnalysis() {
  const [searchParams] = useSearchParams();
  const analysisId = searchParams.get("id");

  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pollingMessage, setPollingMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchAnalysis() {
      setAnalysisData(null);
      setError("");
      setPollingMessage("");
      setLoading(true);

      if (!analysisId) {
        setError(
          "Analysis ID is missing. Open Gap Analysis using a saved analysis first."
        );
        setLoading(false);
        return;
      }

      const token =
        localStorage.getItem("resumeai-access-token") ||
        sessionStorage.getItem("resumeai-access-token");

      if (!token) {
        setError("Please log in to view your saved resume analysis.");
        setLoading(false);
        return;
      }

      try {
        let latestAnalysis = null;

        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
          const response = await apiRequest(
            `/analysis/${encodeURIComponent(analysisId)}/`
          );

          if (cancelled) return;

          if (!response || typeof response !== "object") {
            throw new Error("The server returned an invalid analysis response.");
          }

          latestAnalysis = response;
          setAnalysisData(latestAnalysis);

          const status = String(latestAnalysis.status || "").toUpperCase();

          if (status === "COMPLETED") {
            setPollingMessage("");
            setError("");
            setLoading(false);
            return;
          }

          if (status === "FAILED") {
            setError(
              latestAnalysis.error_message ||
                "The analysis failed on the server. Please retry after checking the backend worker."
            );
            setPollingMessage("");
            setLoading(false);
            return;
          }

          if (!["CREATED", "QUEUED", "PROCESSING"].includes(status)) {
            setPollingMessage("");
            setLoading(false);
            return;
          }

          setPollingMessage(getStatusMessage(status));

          if (attempt < MAX_POLL_ATTEMPTS - 1) {
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
          }
        }

        if (cancelled) return;

        setPollingMessage(
          "The analysis is still in progress. Refresh this page later to check for the result."
        );
        setLoading(false);
      } catch (err) {
        if (cancelled) return;

        setError(
          err?.message ||
            "Could not load the analysis. Check your connection and backend server."
        );
        setLoading(false);
      }
    }

    fetchAnalysis();

    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  const result = getResultData(analysisData);
  const status = String(analysisData?.status || "").toUpperCase();

  const overallMatch = findValue(result, [
    "overallMatch",
    "overall_match",
    "overall_match_score",
    "match_score",
    "overall_score",
  ]);

  const requiredSkillsMatched = findValue(result, [
    "requiredSkillsMatched",
    "required_skills_matched",
    "matched_required_skills",
  ]);

  const missingSkillsCount = findValue(result, [
    "missingSkillsCount",
    "missing_skills_count",
    "missing_skill_count",
  ]);

  const experienceRelevance = findValue(result, [
    "experienceRelevance",
    "experience_relevance",
  ]);

  const keywordCoverage = findValue(result, [
    "keywordCoverage",
    "keyword_coverage",
  ]);

  const profileCompleteness = findValue(result, [
    "profileCompleteness",
    "profile_completeness",
  ]);

  const matchedRequirements = findValue(result, [
    "matchedRequirements",
    "matched_requirements",
    "matched_skills",
  ]);

  const missingRequirements = findValue(result, [
    "missingRequirements",
    "missing_requirements",
    "missing_skills",
  ]);

  const weakRepresentations = findValue(result, [
    "weakRepresentations",
    "weak_representations",
    "weak_skills",
    "improvement_areas",
  ]);

  const hasMetrics = [
    overallMatch,
    requiredSkillsMatched,
    missingSkillsCount,
    experienceRelevance,
    keywordCoverage,
    profileCompleteness,
  ].some((value) => value !== undefined && value !== null && value !== "");

  const excludedKeys = new Set([
    "overallMatch",
    "overall_match",
    "overall_match_score",
    "match_score",
    "overall_score",
    "requiredSkillsMatched",
    "required_skills_matched",
    "matched_required_skills",
    "missingSkillsCount",
    "missing_skills_count",
    "missing_skill_count",
    "experienceRelevance",
    "experience_relevance",
    "keywordCoverage",
    "keyword_coverage",
    "profileCompleteness",
    "profile_completeness",
    "matchedRequirements",
    "matched_requirements",
    "matched_skills",
    "missingRequirements",
    "missing_requirements",
    "missing_skills",
    "weakRepresentations",
    "weak_representations",
    "weak_skills",
    "improvement_areas",
  ]);

  const additionalResults = Object.entries(result).filter(
    ([key, value]) =>
      !excludedKeys.has(key) &&
      value !== null &&
      value !== undefined &&
      value !== ""
  );

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

      <div
        className="builder-layout"
        style={{
          display: "block",
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "30px 20px",
        }}
      >
        <div
          className="dashboard-section-heading"
          style={{ marginBottom: "24px" }}
        >
          <div>
            <span className="welcome-label">JD & RESUME MATCH BREAKDOWN</span>
            <h1>Gap Analysis Dashboard</h1>
            <p>
              Understand how well your resume aligns with the selected job
              description using the results returned by the backend.
            </p>
          </div>
        </div>

        {error && (
          <p
            className="form-error"
            role="alert"
            style={{ marginBottom: "16px" }}
          >
            {error}
          </p>
        )}

        {loading && (
          <p className="empty-resumes" role="status">
            {pollingMessage || "Loading analysis from the server..."}
          </p>
        )}

        {!loading && pollingMessage && (
          <div
            className="action-card"
            role="status"
            style={{ display: "block", padding: "16px", marginBottom: "20px" }}
          >
            {pollingMessage}
          </div>
        )}

        {analysisData && (
          <>
            <div
              className="action-card"
              style={{
                display: "block",
                padding: "16px",
                marginBottom: "20px",
              }}
            >
              <strong>Analysis status: </strong>
              <span>{formatLabel(status || "Unknown")}</span>

              <p style={{ margin: "8px 0 0", color: "var(--text-secondary)" }}>
                {getStatusMessage(status)}
              </p>

              {analysisData.resume_title && (
                <p style={{ margin: "8px 0 0" }}>
                  <strong>Resume: </strong>
                  {analysisData.resume_title}
                </p>
              )}

              {analysisData.target_job_title && (
                <p style={{ margin: "8px 0 0" }}>
                  <strong>Target role: </strong>
                  {analysisData.target_job_title}
                </p>
              )}

              {analysisData.target_company && (
                <p style={{ margin: "8px 0 0" }}>
                  <strong>Company: </strong>
                  {analysisData.target_company}
                </p>
              )}
            </div>

            {status === "COMPLETED" && !hasMetrics && (
              <p className="empty-resumes" style={{ marginBottom: "20px" }}>
                The backend reports that analysis is complete, but it did not
                return the expected match metrics. Review the raw result fields
                below or align the UI field names with the backend result
                schema.
              </p>
            )}

            {status === "COMPLETED" && hasMetrics && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "16px",
                  marginBottom: "30px",
                }}
              >
                <MetricCard label="Overall Match" value={overallMatch} />
                <MetricCard
                  label="Required Skills Matched"
                  value={requiredSkillsMatched}
                />
                <MetricCard
                  label="Missing Skills"
                  value={missingSkillsCount}
                />
                <MetricCard
                  label="Experience Relevance"
                  value={experienceRelevance}
                />
                <MetricCard label="Keyword Coverage" value={keywordCoverage} />
                <MetricCard
                  label="Profile Completeness"
                  value={profileCompleteness}
                />
              </div>
            )}

            {status === "COMPLETED" && (
              <div
                className="action-card"
                style={{ display: "block", padding: "24px" }}
              >
                <h3 style={{ marginBottom: "16px" }}>
                  Detailed Gap Categories
                </h3>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  <DetailList
                    title="✓ Matched Requirements"
                    value={matchedRequirements}
                    color="#10b981"
                    background="rgba(16, 185, 129, 0.1)"
                  />

                  <DetailList
                    title="✕ Missing Requirements"
                    value={missingRequirements}
                    color="#dc2626"
                    background="rgba(220, 38, 38, 0.1)"
                  />

                  <DetailList
                    title="⚠ Weak Representation / Improvement Areas"
                    value={weakRepresentations}
                    color="#eab308"
                    background="rgba(234, 179, 8, 0.1)"
                  />

                  {additionalResults.length > 0 && (
                    <div>
                      <h4 style={{ marginBottom: "12px" }}>
                        Other Results Returned by Backend
                      </h4>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(240px, 1fr))",
                          gap: "12px",
                        }}
                      >
                        {additionalResults.map(([key, value]) => (
                          <div
                            key={key}
                            style={{
                              padding: "12px",
                              border: "1px solid var(--border-color)",
                              borderRadius: "8px",
                              minWidth: 0,
                            }}
                          >
                            <strong>{formatLabel(key)}</strong>
                            <p
                              style={{
                                margin: "8px 0 0",
                                whiteSpace: "pre-wrap",
                                overflowWrap: "anywhere",
                              }}
                            >
                              {formatValue(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {Object.keys(result).length === 0 && (
                    <p className="empty-resumes">
                      The backend did not return a result object for this
                      analysis.
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {!loading && !analysisData && !error && (
          <p className="empty-resumes">No analysis data was returned.</p>
        )}
      </div>
    </div>
  );
}

export default GapAnalysis;
