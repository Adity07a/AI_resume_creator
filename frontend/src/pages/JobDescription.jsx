
import { Link } from "react-router-dom";
import { useState } from "react";
import "../App.css";

const DJANGO_API = "http://127.0.0.1:8000/api/v1";
const AI_API = "http://127.0.0.1:8001/api/v1/ai";

function toApiResume(data = {}) {
  const toLines = (value) =>
    String(value || "")
      .split(/\n/)
      .map((item) => item.trim())
      .filter(Boolean);

  const toList = (value) =>
    String(value || "")
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);

  return {
    personal_info: {
      full_name: data.name || "",
      email: data.email || "",
      phone: data.phone || "",
      location: data.address || "",
      linkedin: data.linkedin || "",
      github: data.github || "",
      portfolio: data.portfolio || "",
    },
    summary: data.summary || "",
    skills: toList(data.skills),
    experience: data.experience
      ? [
          {
            job_title: "",
            company: "",
            location: "",
            start_date: "",
            end_date: "",
            responsibilities: toLines(data.experience),
          },
        ]
      : [],
    projects: data.projects
      ? [
          {
            name: "",
            description: data.projects,
            technologies: [],
          },
        ]
      : [],
    education: data.education
      ? [
          {
            degree: data.education,
            institution: "",
            location: "",
            start_date: "",
            end_date: "",
            grade: "",
          },
        ]
      : [],
    certifications: [],
    achievements: [],
    languages: [],
    links: [],
  };
}

function fromApiResume(api = {}) {
  const info = api.personal_info || {};

  return {
    name: info.full_name || "",
    email: info.email || "",
    phone: info.phone || "",
    address: info.location || "",
    summary: api.summary || "",
    skills: Array.isArray(api.skills)
      ? api.skills.join(", ")
      : api.skills || "",
    education: Array.isArray(api.education)
      ? api.education
          .map((item) =>
            [
              item.degree,
              item.institution,
              item.location,
              [item.start_date, item.end_date].filter(Boolean).join(" - "),
              item.grade,
            ]
              .filter(Boolean)
              .join(", ")
          )
          .join("\n")
      : "",
    projects: Array.isArray(api.projects)
      ? api.projects
          .map((item) =>
            [
              item.name,
              item.description,
              Array.isArray(item.technologies)
                ? item.technologies.join(", ")
                : "",
            ]
              .filter(Boolean)
              .join("\n")
          )
          .join("\n\n")
      : "",
    experience: Array.isArray(api.experience)
      ? api.experience
          .map((item) =>
            [
              item.job_title,
              item.company,
              item.location,
              [item.start_date, item.end_date].filter(Boolean).join(" - "),
              ...(Array.isArray(item.responsibilities)
                ? item.responsibilities
                : []),
            ]
              .filter(Boolean)
              .join("\n")
          )
          .join("\n\n")
      : "",
  };
}

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

  const [optimizationMode, setOptimizationMode] = useState("manual");
  const [generatedDraft, setGeneratedDraft] = useState(null);
  const [manualResult, setManualResult] = useState(null);
  const [selectedSection, setSelectedSection] = useState("summary");
  const [sectionContent, setSectionContent] = useState("");
  const [modeError, setModeError] = useState("");
  const [modeSuccess, setModeSuccess] = useState("");
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
      const response = await fetch(`${AI_API}/optimize-resume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidate_resume: selectedResume.data,
          job_description: form.description.trim(),
          target_job_title: form.job_title.trim(),
        }),
      });

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

  async function handleImproveSection() {
    setModeError("");
    setModeSuccess("");
    setManualResult(null);

    if (!selectedResumeId) {
      setModeError("Please select a saved resume first.");
      return;
    }

    if (form.description.trim().length < 20) {
      setModeError(
        "Please enter a job description of at least 20 characters."
      );
      return;
    }

    const selectedResume = savedResumes.find(
      (resume) => String(resume.id) === String(selectedResumeId)
    );

    if (!selectedResume) {
      setModeError("Selected resume was not found. Please select it again.");
      return;
    }

    const sectionFields = {
      summary: "summary",
      skills: "skills",
      experience: "experience",
      projects: "projects",
      education: "education",
    };

    const fieldName = sectionFields[selectedSection];

    const originalContent =
      sectionContent.trim() ||
      String(selectedResume.data?.[fieldName] || "");

    if (!originalContent.trim()) {
      setModeError(
        "This section is empty. Please enter its content before improving it."
      );
      return;
    }

    setLoading("improve-section");

    try {
      const response = await fetch(`${AI_API}/improve-section`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          section_name: selectedSection,
          section_content: originalContent,
          job_description: form.description.trim(),
          target_job_title: form.job_title.trim(),
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.detail ||
            result.message ||
            "Unable to improve this section."
        );
      }

      setManualResult({
        ...result,
        originalContent,
      });
    } catch (err) {
      setModeError(
        err.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading("");
    }
  }

  function handleDiscardSuggestion() {
    setManualResult(null);
    setModeError("");
    setModeSuccess("");
  }

  function handleApplySuggestion() {
    if (!manualResult?.improved_content) {
      setModeError("No improved suggestion is available.");
      return;
    }

    const sectionLabels = {
      summary: "Summary",
      skills: "Skills",
      experience: "Experience",
      projects: "Projects",
      education: "Education",
    };

    const sectionFields = {
      summary: "summary",
      skills: "skills",
      experience: "experience",
      projects: "projects",
      education: "education",
    };

    const selectedResume = savedResumes.find(
      (resume) => String(resume.id) === String(selectedResumeId)
    );

    if (!selectedResume) {
      setModeError("Selected resume was not found.");
      return;
    }

    try {
      const updatedData = {
        ...selectedResume.data,
        [sectionFields[selectedSection]]: manualResult.improved_content,
      };

      // Create a separate draft without overwriting the original resume.
      const newDraft = {
        ...selectedResume,
        id: `resume-${Date.now()}`,
        title: `${
          selectedResume.title || "Resume"
        } - ${sectionLabels[selectedSection]} Draft`,
        updated: new Date().toISOString(),
        status: "Draft",
        data: updatedData,
      };

      const existingResumes = JSON.parse(
        localStorage.getItem("resumeai-resumes") || "[]"
      );

      const updatedResumes = [...existingResumes, newDraft];

      localStorage.setItem(
        "resumeai-resumes",
        JSON.stringify(updatedResumes)
      );

      setSavedResumes(updatedResumes);
      setSelectedResumeId(String(newDraft.id));
      setSectionContent(manualResult.improved_content);
      setManualResult(null);
      setModeError("");
      setModeSuccess(
        "Suggestion applied to a new draft. Your original resume is unchanged."
      );
    } catch {
      setModeError("Could not save the new draft. Please try again.");
    }
  }

  async function handleGenerateResume() {
  setModeError("");
  setModeSuccess("");
  setGeneratedDraft(null);

  const selectedResume = savedResumes.find(
    (resume) => String(resume.id) === String(selectedResumeId)
  );

  if (!selectedResume) {
    setModeError("Please select a saved resume first.");
    return;
  }

  if (form.description.trim().length < 20) {
    setModeError(
      "Please enter a job description of at least 20 characters."
    );
    return;
  }

  setLoading("generate-resume");

  try {
    const response = await fetch(`${AI_API}/generate-resume`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        candidate_resume: toApiResume(selectedResume.data),
        job_description: form.description.trim(),
        target_job_title: form.job_title.trim(),
        target_company: form.company_name.trim(),
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.detail || result.message || "Could not generate the resume."
      );
    }

    setGeneratedDraft(result);
    setModeSuccess(
      "Resume draft generated. Review all sections before approving."
    );
  } catch (err) {
    setModeError(
      err.message || "Resume generation failed. Please try again."
    );
  } finally {
    setLoading("");
  }
}

function handleApproveGeneratedDraft() {
  if (!generatedDraft) {
    setModeError("Generate a resume draft before approving it.");
    return;
  }

  const selectedResume = savedResumes.find(
    (resume) => String(resume.id) === String(selectedResumeId)
  );

  if (!selectedResume) {
    setModeError("Selected resume was not found.");
    return;
  }

  try {
    const existingResumes = JSON.parse(
      localStorage.getItem("resumeai-resumes") || "[]"
    );

    const newDraft = {
      ...selectedResume,
      id: `resume-${Date.now()}`,
      title: `${form.job_title.trim() || "Job-Tailored"} Resume Draft`,
      updated: new Date().toISOString(),
      status: "Draft",
      data: fromApiResume(generatedDraft),
      template: selectedResume.template || "professional",
    };

    const updatedResumes = [...existingResumes, newDraft];

    localStorage.setItem(
      "resumeai-resumes",
      JSON.stringify(updatedResumes)
    );

    setSavedResumes(updatedResumes);
    setSelectedResumeId(String(newDraft.id));
    setGeneratedDraft(null);
    setModeError("");
    setModeSuccess(
      "Optimized resume saved as a new draft. Your original resume is unchanged."
    );
  } catch {
    setModeError("Could not save the generated draft. Please try again.");
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
              onChange={(event) => {
                setSelectedResumeId(event.target.value);
                setSectionContent("");
                setManualResult(null);
                setModeError("");
                setModeSuccess("");
              }}
            >
              <option value="">Choose a saved resume</option>

              {savedResumes.map((resume) => (
                <option key={resume.id} value={String(resume.id)}>
                  {resume.title ||
                    `${resume.data?.name || "Untitled"} Resume`}
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

            {renderList("Matched Keywords", optimization.matched_keywords)}
            {renderList("Missing Keywords", optimization.missing_keywords)}
            {renderList("Skill Gaps", optimization.skill_gaps)}
            {renderList("Improvement Suggestions", optimization.suggestions)}

            <p className="jd-note">
              Review every suggestion carefully. Add only skills and
              experience that accurately reflect your background.
            </p>
          </section>
        )}

        {/* Resume Optimization Modes */}
        <section className="jd-card jd-mode-card">
          <h2>Choose Your Resume Optimization Mode</h2>

          <p className="jd-note">
            Choose how you want to improve your resume for this job.
            Your original saved resume will remain unchanged.
          </p>

          <div className="jd-mode-options">
            <button
              type="button"
              className={`jd-mode-option ${
                optimizationMode === "manual" ? "active" : ""
              }`}
              onClick={() => {
                setOptimizationMode("manual");
                setModeError("");
                setModeSuccess("");
              }}
            >
              <span className="jd-mode-icon">✍️</span>
              <strong>Manual Editing</strong>
              <span>
                Review suggestions, improve individual sections, and apply
                changes only when you approve them.
              </span>
            </button>

            <button
              type="button"
              className={`jd-mode-option ${
                optimizationMode === "automatic" ? "active" : ""
              }`}
              onClick={() => {
                setOptimizationMode("automatic");
                setModeError("");
                setModeSuccess("");
              }}
            >
              <span className="jd-mode-icon">⚡</span>
              <strong>Automatic Optimization</strong>
              <span>
                Generate a job-tailored resume draft, review it, and approve
                it before downloading.
              </span>
            </button>
          </div>

          {modeError && (
            <p className="jd-error" role="alert">
              {modeError}
            </p>
          )}

          {modeSuccess && (
            <p className="jd-success" role="status">
              {modeSuccess}
            </p>
          )}

          {optimizationMode === "manual" && (
            <div className="jd-mode-content">
              <h3>Manual Resume Editing</h3>
              <p>
                Select a resume section to improve it using the job
                description. Review the suggestion before applying it.
              </p>

              <label className="jd-field">
                <span>Resume Section</span>
                <select
                  value={selectedSection}
                  onChange={(event) => {
                    setSelectedSection(event.target.value);
                    setManualResult(null);
                    setSectionContent("");
                    setModeError("");
                    setModeSuccess("");
                  }}
                >
                  <option value="summary">Professional Summary</option>
                  <option value="skills">Skills</option>
                  <option value="experience">Experience</option>
                  <option value="projects">Projects</option>
                  <option value="education">Education</option>
                </select>
              </label>

              <label className="jd-field">
                <span>Current Section Content</span>
                <textarea
                  rows={5}
                  value={sectionContent}
                  onChange={(event) => setSectionContent(event.target.value)}
                  placeholder="Paste or enter the content of the selected section..."
                />
              </label>

              <button
                type="button"
                className="jd-primary-btn"
                onClick={handleImproveSection}
                disabled={Boolean(loading)}
              >
                {loading === "improve-section"
                  ? "Improving Section..."
                  : "Improve This Section"}
              </button>

              {manualResult && (
                <div className="jd-manual-result">
                  <h3>Review Improved Section</h3>

                  {manualResult.changes_summary && (
                    <p className="jd-note">
                      {manualResult.changes_summary}
                    </p>
                  )}

                  <label className="jd-field">
                    <span>AI Suggestion — You Can Edit This</span>
                    <textarea
                      rows={6}
                      value={manualResult.improved_content || ""}
                      onChange={(event) =>
                        setManualResult({
                          ...manualResult,
                          improved_content: event.target.value,
                        })
                      }
                    />
                  </label>

                  <div className="jd-actions">
                    <button
                      type="button"
                      className="jd-primary-btn"
                      onClick={handleApplySuggestion}
                    >
                      Apply to New Draft
                    </button>

                    <button
                      type="button"
                      className="jd-secondary-btn"
                      onClick={handleDiscardSuggestion}
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          
{optimizationMode === "automatic" && (
  <div className="jd-mode-content">
    <h3>Automatic Resume Optimization</h3>
    <p>
      Generate a job-tailored draft, review the content, and save it
      separately after approval.
    </p>

    <button
      type="button"
      className="jd-primary-btn"
      onClick={handleGenerateResume}
      disabled={Boolean(loading)}
    >
      {loading === "generate-resume"
        ? "Generating Resume..."
        : "Generate Optimized Resume"}
    </button>

    {generatedDraft && (
      <div className="jd-manual-result">
        <h3>Review Your Generated Resume</h3>
        <p className="jd-note">
          Check every detail carefully. Confirm that all skills,
          responsibilities, and qualifications accurately reflect
          your real background before saving.
        </p>

        <h4>Personal Information</h4>
        <p>
          <strong>Name:</strong>{" "}
          {generatedDraft.personal_info?.full_name || "Not provided"}
        </p>
        <p>
          <strong>Email:</strong>{" "}
          {generatedDraft.personal_info?.email || "Not provided"}
        </p>
        <p>
          <strong>Phone:</strong>{" "}
          {generatedDraft.personal_info?.phone || "Not provided"}
        </p>
        <p>
          <strong>Location:</strong>{" "}
          {generatedDraft.personal_info?.location || "Not provided"}
        </p>

        <h4>Professional Summary</h4>
        <p>
          {generatedDraft.summary || "No summary provided."}
        </p>

        <h4>Skills</h4>
        {renderList("Generated Skills", generatedDraft.skills)}

        <h4>Experience</h4>
        {(generatedDraft.experience || []).length > 0 ? (
          generatedDraft.experience.map((item, index) => (
            <div key={`experience-${index}`}>
              <strong>
                {[item.job_title, item.company].filter(Boolean).join(" — ") ||
                  `Experience ${index + 1}`}
              </strong>
              <p>
                {[item.location, item.start_date, item.end_date]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {renderList(
                `Responsibilities ${index + 1}`,
                item.responsibilities
              )}
            </div>
          ))
        ) : (
          <p>No experience provided.</p>
        )}

        <h4>Projects</h4>
        {(generatedDraft.projects || []).length > 0 ? (
          generatedDraft.projects.map((item, index) => (
            <div key={`project-${index}`}>
              <strong>{item.name || `Project ${index + 1}`}</strong>
              <p>{item.description}</p>
              {renderList(
                `Technologies ${index + 1}`,
                item.technologies
              )}
            </div>
          ))
        ) : (
          <p>No projects provided.</p>
        )}

        <h4>Education</h4>
        {(generatedDraft.education || []).length > 0 ? (
          generatedDraft.education.map((item, index) => (
            <div key={`education-${index}`}>
              <strong>
                {item.degree || `Education ${index + 1}`}
              </strong>
              <p>
                {[
                  item.institution,
                  item.location,
                  item.start_date,
                  item.end_date,
                  item.grade,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          ))
        ) : (
          <p>No education provided.</p>
        )}

        {renderList("Certifications", generatedDraft.certifications)}
        {renderList("Achievements", generatedDraft.achievements)}
        {renderList("Languages", generatedDraft.languages)}
        {renderList("Additional Links", generatedDraft.links)}

        <div className="jd-actions">
          <button
            type="button"
            className="jd-primary-btn"
            onClick={handleApproveGeneratedDraft}
          >
            Approve &amp; Save Draft
          </button>

          <button
            type="button"
            className="jd-secondary-btn"
            onClick={() => {
              setGeneratedDraft(null);
              setModeError("");
              setModeSuccess("");
            }}
          >
            Discard Draft
          </button>
        </div>
      </div>
    )}
  </div>
)}

        </section>
      </div>
    </main>
  );
}

export default JobDescription;
