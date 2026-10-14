
import { Link } from "react-router-dom";
import { useState } from "react";
import "../App.css";

const DJANGO_API = "http://127.0.0.1:8000/api/v1";
const AI_API = "http://127.0.0.1:8001/api/v1/ai";

function JobDescription() {
  const [form, setForm] = useState({
    title: "",
    company_name: "",
    job_title: "",
    description: "",
  });
  const [optimization, setOptimization] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savedResumes, setSavedResumes] = useState(() => {
  try {
    return JSON.parse(
      localStorage.getItem("resumeai-resumes") || "[]"
    );
    } catch {
    return [];
  }
  });

   const [selectedResumeId, setSelectedResumeId] = useState("");
  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function getToken() {
    return (
      localStorage.getItem("resumeai-access-token") ||
      sessionStorage.getItem("resumeai-access-token")
    );
  }

  async function readError(response) {
    try {
      const data = await response.json();
      const detail = data.detail || data.message || data.error;

      if (typeof detail === "string") return detail;
      if (detail) return JSON.stringify(detail);

      return JSON.stringify(data);
    } catch {
      return `Request failed with status ${response.status}.`;
    }
  }

  async function handleSave() {
    setError("");
    setSuccess("");

    if (
      !form.title.trim() ||
      !form.job_title.trim() ||
      !form.company_name.trim() ||
      !form.description.trim()
    ) {
      setError("Please fill in all fields before saving.");
      return;
    }

    if (form.description.trim().length < 20) {
      setError("Job description must contain at least 20 characters.");
      return;
    }

    const token = getToken();

    if (!token) {
      setError("Your session has expired. Please log in again.");
      return;
    }

    setLoading("save");

    try {
      const response = await fetch(`${DJANGO_API}/job-descriptions/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: form.title.trim(),
          company_name: form.company_name.trim(),
          job_title: form.job_title.trim(),
          description: form.description.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const data = await response.json();

      setSavedId(data.id);
      setSuccess("Job description saved successfully.");
    } catch (err) {
      setError(
        err.message ||
          "Could not save the job description. Check the backend connection."
      );
    } finally {
      setLoading("");
    }
  }

  async function handleAnalyze() {
    setError("");
    setSuccess("");
    setAnalysis(null);

    if (form.description.trim().length < 20) {
      setError("Enter a job description with at least 20 characters.");
      return;
    }

    setLoading("analyze");

    try {
      const response = await fetch(`${AI_API}/parse-job`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: form.description.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const result = await response.json();

      setAnalysis(result);
      setSuccess("Job description analyzed successfully.");
    } catch (err) {
      setError(
        err.message ||
          "Could not analyze the job description. Check that the AI service is running."
      );
    } finally {
      setLoading("");
    }
  }

  
async function handleOptimize() {
  setError("");
  setSuccess("");
  setOptimization(null);

  const selectedResume = savedResumes.find(
    (resume) => String(resume.id) === selectedResumeId
  );

  if (!selectedResume) {
    setError("Please select a saved resume first.");
    return;
  }

  if (form.description.trim().length < 20) {
    setError("Enter a job description with at least 20 characters.");
    return;
  }

  setLoading("optimize");

  try {
    const response = await fetch(
      `${AI_API}/optimize-resume`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidate_resume: selectedResume.data,
          job_description: form.description.trim(),
          target_job_title: form.job_title.trim(),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    const result = await response.json();

    setOptimization(result);
    setSuccess("Resume optimization completed.");
  } catch (err) {
    setError(
      err.message ||
        "Could not optimize the resume. Check that the AI service is running."
    );
  } finally {
    setLoading("");
  }
}

  function renderList(title, items) {
    if (!Array.isArray(items) || items.length === 0) return null;

    return (
      <section className="jd-result-section" key={title}>
        <h3>{title}</h3>
        <ul>
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <main className="jd-page">
      <header className="jd-header">
        <Link to="/dashboard" className="auth-logo">
          <span className="logo-icon">R</span>
          Resume<span className="logo-highlight">AI</span>
        </Link>

        <Link to="/dashboard" className="builder-back-link">
          ← Back to Dashboard
        </Link>
      </header>

      <div className="jd-container">
        <div className="jd-intro">
          <span className="jd-eyebrow">AI-POWERED JOB MATCHING</span>
          <h1>Tailor Your Resume for a Job</h1>
          <p>
            Add a job description to discover the skills, qualifications,
            and keywords that matter for your target role.
          </p>
        </div>

        <section className="jd-card">
          <h2>Job Details</h2>
          <p className="jd-muted">
            Enter the job information and paste the complete job description.
          </p>
          <div className="jd-field">
          <label htmlFor="resume-select">Select Your Resume</label>

  <select
    id="resume-select"
    value={selectedResumeId}
    onChange={(event) => setSelectedResumeId(event.target.value)}
  >
    <option value="">Choose a saved resume</option>

    {savedResumes.map((resume) => (
      <option key={resume.id} value={String(resume.id)}>
        {resume.title || `${resume.data?.name || "Untitled"} Resume`}
      </option>
    ))}
  </select>

  {savedResumes.length === 0 && (
    <p className="jd-muted">
      No saved resumes found. Create and save a resume first.
    </p>
  )}
  </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleAnalyze();
            }}
          >
            <div className="jd-field">
              <label htmlFor="title">Job Description Name</label>
              <input
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Python Developer - October"
                required
              />
            </div>

            <div className="jd-two-columns">
              <div className="jd-field">
                <label htmlFor="company_name">Company Name</label>
                <input
                  id="company_name"
                  name="company_name"
                  value={form.company_name}
                  onChange={handleChange}
                  placeholder="e.g. ABC Technologies"
                  required
                />
              </div>

              <div className="jd-field">
                <label htmlFor="job_title">Job Title</label>
                <input
                  id="job_title"
                  name="job_title"
                  value={form.job_title}
                  onChange={handleChange}
                  placeholder="e.g. Python Developer"
                  required
                />
              </div>
            </div>

            <div className="jd-field">
              <label htmlFor="description">Job Description</label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Paste the job responsibilities, required skills, qualifications, and experience here..."
                rows={10}
                minLength={20}
                required
              />
              <span className="jd-character-count">
                {form.description.length} characters
              </span>
            </div>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            {success && (
              <p className="form-success" role="status">
                {success}
              </p>
            )}

            <div className="jd-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={handleSave}
                disabled={Boolean(loading)}
              >
                {loading === "save" ? "Saving..." : "Save Job Description"}
              </button>

              <button
                type="submit"
                className="primary-btn"
                disabled={Boolean(loading)}
              >
                {loading === "analyze"
                  ? "Analyzing..."
                  : "Analyze Job Description"}
              </button>
              <button
                  type="button"
                  className="primary-btn"
                  onClick={handleOptimize}
                     disabled={Boolean(loading)}
                    >
                  {loading === "optimize"
                      ? "Optimizing..."
                    : "Optimize Resume"}
                </button>
            </div>

            {savedId && (
              <p className="jd-muted">
                Saved job description ID: {savedId}
              </p>
            )}
          </form>
        </section>

        {analysis && (
          <section className="jd-card jd-results">
            <div className="jd-results-heading">
              <span className="jd-eyebrow">ANALYSIS COMPLETE</span>
              <h2>{analysis.job_title || form.job_title}</h2>
              <p className="jd-muted">
                {analysis.company_name || form.company_name}
              </p>
            </div>

            <div className="jd-summary">
              <h3>Job Summary</h3>
              <p>{analysis.summary || "No summary returned."}</p>
              <p>
                <strong>Experience level:</strong>{" "}
                {analysis.experience_level || "Not specified"}
              </p>
            </div>

            {renderList("Required Skills", analysis.required_skills)}
            {renderList("Preferred Skills", analysis.preferred_skills)}
            {renderList("Qualifications", analysis.qualifications)}
            {renderList("Responsibilities", analysis.responsibilities)}
            {renderList("Important Keywords", analysis.keywords)}

            <p className="jd-note">
              Review these requirements against your real experience.
              We will not add skills or qualifications you do not have.
            </p>
          </section>
        )}
        
{optimization && (
  <section className="jd-card jd-results">
    <span className="jd-eyebrow">RESUME MATCH RESULTS</span>
    <h2>Resume Optimization Report</h2>

    <div className="jd-summary">
      <h3>Overall Match Score</h3>
      <p className="jd-match-score">
        {optimization.overall_match_score ?? 0} / 100
      </p>
      <p>
        {optimization.analysis_summary ||
          "Review the suggestions below to improve your resume."}
      </p>
    </div>

    {renderList(
      "Matched Keywords",
      optimization.matched_keywords
    )}

    {renderList(
      "Missing Keywords",
      optimization.missing_keywords
    )}

    {renderList(
      "Skill Gaps",
      optimization.skill_gaps
    )}

    {renderList(
      "Improvement Suggestions",
      optimization.suggestions
    )}

    <p className="jd-note">
      Review every suggestion carefully. Add only skills and
      experience that accurately reflect your background.
    </p>
  </section>
)}

      </div>
    </main>
  );
}

export default JobDescription;
