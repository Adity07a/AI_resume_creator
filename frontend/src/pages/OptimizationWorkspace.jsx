import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest } from "../services/api";
import "../App.css";

function getCurrentVersion(resume) {
  if (!Array.isArray(resume?.versions)) return null;

  return (
    resume.versions.find((version) => version.is_current) ||
    resume.versions[0] ||
    null
  );
}

function sectionText(section) {
  const content = section?.content;

  if (typeof content === "string") return content;
  if (content == null) return "";

  if (typeof content === "object") {
    return Object.entries(content)
      .map(([key, value]) => {
        const text =
          typeof value === "string"
            ? value
            : Array.isArray(value)
            ? value
                .map((item) =>
                  typeof item === "string"
                    ? item
                    : JSON.stringify(item)
                )
                .join("\n")
            : value == null
            ? ""
            : JSON.stringify(value);

        return text.trim() ? `${key}: ${text}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }

  return String(content);
}

function buildCandidateResume(version) {
  const sections = Array.isArray(version?.sections)
    ? [...version.sections].sort(
        (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
      )
    : [];

  const candidate = {};

  sections.forEach((section) => {
    if (section.is_visible === false) return;

    const key = String(section.section_type || section.title || "OTHER")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    candidate[key || "other"] = section.content;
  });

  return candidate;
}

function readableResult(value) {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function OptimizationWorkspace() {
  const [searchParams] = useSearchParams();
  const resumeId = searchParams.get("resumeId");

  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [targetJobTitle, setTargetJobTitle] = useState("");
  const [loadingResume, setLoadingResume] = useState(Boolean(resumeId));
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadResume() {
      if (!resumeId) {
        setLoadingResume(false);
        return;
      }

      try {
        const data = await apiRequest(
          `/resumes/${encodeURIComponent(resumeId)}/`
        );

        if (!active) return;

        const version = getCurrentVersion(data);

        if (!version) {
          setError(
            "This resume has no saved version. Save the resume before optimizing it."
          );
          return;
        }

        setResume({
          ...data,
          currentVersion: version,
          candidateResume: buildCandidateResume(version),
        });

        if (version.target_job_title) {
          setTargetJobTitle(version.target_job_title);
        }
      } catch (err) {
        if (active) {
          setError(
            err.message ||
              "Could not load this resume. Check your login and try again."
          );
        }
      } finally {
        if (active) setLoadingResume(false);
      }
    }

    loadResume();

    return () => {
      active = false;
    };
  }, [resumeId]);

  async function handleOptimize(event) {
    event.preventDefault();
    setError("");
    setSuccessMsg("");
    setResult(null);

    if (jobDescription.trim().length < 20) {
      setError("Please enter a job description with at least 20 characters.");
      return;
    }

    if (!resume?.candidateResume) {
      setError(
        "A saved resume is required. Open this workspace from a saved resume in your dashboard."
      );
      return;
    }

    setOptimizing(true);

    try {
      const response = await apiRequest("/resumes/ai/optimize-resume/", {
        method: "POST",
        body: JSON.stringify({
          candidate_resume: resume.candidateResume,
          job_description: jobDescription.trim(),
          target_job_title: targetJobTitle.trim(),
        }),
      });

      setResult(response);
      setSuccessMsg(
        "Optimization response received. Review the result before updating your resume."
      );
    } catch (err) {
      setError(
        err.message ||
          "Resume optimization failed. Please check the backend and try again."
      );
    } finally {
      setOptimizing(false);
    }
  }

  const version = resume?.currentVersion;

  return (
    <div className="builder-page">
      <header className="builder-header">
        <Link to="/dashboard" className="auth-logo builder-logo">
          <span className="logo-icon">R</span>
          Resume<span className="logo-highlight">AI</span>
        </Link>

        <span className="builder-header-label">
          Optimization Workspace
        </span>

        <Link to="/dashboard" className="builder-back-link">
          ← Back to Dashboard
        </Link>
      </header>

      <main
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
            <span className="welcome-label">AI REWRITE WORKSPACE</span>
            <h1>Optimize Your Resume</h1>
            <p>
              Generate AI-assisted improvements based on your resume and
              target job description. Review the returned content before
              using it.
            </p>
          </div>

          {resumeId && (
            <Link
              to={`/resume-builder?id=${encodeURIComponent(resumeId)}`}
              className="secondary-btn"
            >
              Back to Resume Editor →
            </Link>
          )}
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

        {successMsg && (
          <p
            className="form-success"
            role="status"
            style={{ marginBottom: "16px" }}
          >
            {successMsg}
          </p>
        )}

        {loadingResume ? (
          <p className="empty-resumes">Loading your saved resume...</p>
        ) : (
          <>
            <section
              className="action-card"
              style={{
                display: "block",
                padding: "24px",
                marginBottom: "24px",
              }}
            >
              <h2 style={{ marginTop: 0 }}>Resume to optimize</h2>

              {resume ? (
                <>
                  <p>
                    <strong>{resume.title || "Untitled Resume"}</strong>
                  </p>
                  <p style={{ color: "var(--text-secondary)" }}>
                    Current version: {version?.version_number ?? "—"}
                    {version?.target_job_title
                      ? ` · Target role: ${version.target_job_title}`
                      : ""}
                  </p>
                </>
              ) : (
                <p>
                  Open this page from a saved resume to load its current
                  version. Example:{" "}
                  <code>/optimization-workspace?resumeId=1</code>
                </p>
              )}
            </section>

            <form
              className="action-card"
              onSubmit={handleOptimize}
              style={{
                display: "block",
                padding: "24px",
                marginBottom: "24px",
              }}
            >
              <h2 style={{ marginTop: 0 }}>Target job details</h2>

              <label
                htmlFor="targetJobTitle"
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                }}
              >
                Target job title
              </label>

              <input
                id="targetJobTitle"
                type="text"
                value={targetJobTitle}
                onChange={(event) => setTargetJobTitle(event.target.value)}
                placeholder="e.g. Python Developer"
                style={{
                  width: "100%",
                  marginBottom: "18px",
                  boxSizing: "border-box",
                }}
              />

              <label
                htmlFor="jobDescription"
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                }}
              >
                Job description
              </label>

              <textarea
                id="jobDescription"
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste the target job description here..."
                rows={8}
                required
                minLength={20}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
              />

              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "0.85rem",
                  marginTop: "8px",
                }}
              >
                Enter at least 20 characters. AI suggestions should reflect
                your real experience and skills; verify every change.
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "18px",
                }}
              >
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={
                    optimizing ||
                    loadingResume ||
                    !resume ||
                    jobDescription.trim().length < 20
                  }
                >
                  {optimizing ? "Optimizing..." : "Optimize Resume with AI"}
                </button>
              </div>
            </form>

            {result !== null && (
              <section
                className="action-card"
                style={{ display: "block", padding: "24px" }}
              >
                <h2 style={{ marginTop: 0 }}>AI Optimization Result</h2>
                <p style={{ color: "var(--text-secondary)" }}>
                  This is the response returned by the backend. Review it
                  before applying changes; it has not automatically
                  overwritten your saved resume.
                </p>

                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    padding: "16px",
                    borderRadius: "8px",
                    background: "var(--page-bg)",
                    color: "inherit",
                    fontFamily: "inherit",
                    fontSize: "0.92rem",
                    lineHeight: 1.6,
                  }}
                >
                  {readableResult(result)}
                </pre>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default OptimizationWorkspace;