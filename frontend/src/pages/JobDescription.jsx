
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import "../App.css";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/+$/, "");

const AI_API = `${API_BASE}/resumes/ai`;
const CACHE_KEY = "resumeai-resumes";

const EMPTY_FORM = {
  title: "",
  company_name: "",
  job_title: "",
  description: "",
};

function getToken() {
  return (
    localStorage.getItem("resumeai-access-token") ||
    sessionStorage.getItem("resumeai-access-token")
  );
}

function readLocalResumes() {
  try {
    const result = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

function lines(value) {
  return String(value || "")
    .split(/\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function listValues(value) {
  return String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getSectionText(content) {
  if (typeof content === "string") return content;
  if (content && typeof content.text === "string") return content.text;
  return "";
}

function fromApiResume(api = {}) {
  const info = api.personal_info || {};
  const links = Array.isArray(api.links) ? api.links : [];

  const findLink = (name) =>
    links.find((item) =>
      String(item?.name || item?.type || "")
        .toLowerCase()
        .includes(name)
    )?.url || "";

  const formatItems = (items, fields) =>
    Array.isArray(items)
      ? items
          .map((item) => {
            if (typeof item === "string") return item;
            if (!item || typeof item !== "object") return "";

            return fields
              .map((field) => item[field])
              .filter(
                (value) =>
                  value !== undefined &&
                  value !== null &&
                  String(value).trim()
              )
              .join(", ");
          })
          .filter(Boolean)
          .join("\n")
      : "";

  return {
    name: info.full_name || info.name || "",
    email: info.email || "",
    phone: info.phone || "",
    address: info.location || info.address || "",
    github: info.github || findLink("github"),
    linkedin: info.linkedin || findLink("linkedin"),
    summary:
      typeof api.summary === "string"
        ? api.summary
        : api.summary?.text || "",
    skills: Array.isArray(api.skills)
      ? api.skills
          .map((item) =>
            typeof item === "string"
              ? item
              : item?.name || item?.skill || ""
          )
          .filter(Boolean)
          .join(", ")
      : api.skills?.text || api.skills || "",
    experience: Array.isArray(api.experience)
      ? api.experience
          .map((item) =>
            typeof item === "string"
              ? item
              : [
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
          .filter(Boolean)
          .join("\n\n")
      : api.experience?.text || "",
    projects: Array.isArray(api.projects)
      ? api.projects
          .map((item) =>
            typeof item === "string"
              ? item
              : [
                  item.name,
                  item.description,
                  Array.isArray(item.technologies)
                    ? item.technologies.join(", ")
                    : "",
                ]
                  .filter(Boolean)
                  .join("\n")
          )
          .filter(Boolean)
          .join("\n\n")
      : api.projects?.text || "",
    education: Array.isArray(api.education)
      ? api.education
          .map((item) =>
            typeof item === "string"
              ? item
              : [
                  item.degree,
                  item.institution,
                  item.location,
                  [item.start_date, item.end_date].filter(Boolean).join(" - "),
                  item.grade,
                ]
                  .filter(Boolean)
                  .join(", ")
          )
          .filter(Boolean)
          .join("\n")
      : api.education?.text || "",
    certifications: formatItems(api.certifications, [
      "name",
      "title",
      "issuer",
      "date",
    ]),
  };
}

function toApiResume(data = {}) {
  return {
    personal_info: {
      full_name: data.name || "",
      email: data.email || "",
      phone: data.phone || "",
      location: data.address || "",
      github: data.github || "",
      linkedin: data.linkedin || "",
      portfolio: data.portfolio || "",
    },
    summary: data.summary || "",
    skills: listValues(data.skills),
    experience: data.experience
      ? [
          {
            job_title: "",
            company: "",
            location: "",
            start_date: "",
            end_date: "",
            responsibilities: lines(data.experience),
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
    certifications: lines(data.certifications).map((name) => ({ name })),
    achievements: [],
    languages: [],
    links: [
      ...(data.github ? [{ name: "GitHub", url: data.github }] : []),
      ...(data.linkedin ? [{ name: "LinkedIn", url: data.linkedin }] : []),
    ],
  };
}

function normalizeServerResume(resume) {
  const versions = Array.isArray(resume.versions) ? resume.versions : [];
  const currentVersion =
    versions.find((version) => version.is_current) || versions[0];

  const data = {};

  (currentVersion?.sections || []).forEach((section) => {
    const content = section.content || {};

    switch (section.section_type) {
      case "CUSTOM": {
        const info = content.personal_info || content;

        Object.assign(data, {
          name: info.full_name || info.name || "",
          email: info.email || "",
          phone: info.phone || "",
          address: info.location || info.address || "",
          github: info.github || "",
          linkedin: info.linkedin || "",
        });
        break;
      }

      case "SUMMARY":
        data.summary = getSectionText(content);
        break;

      case "SKILLS":
        data.skills = Array.isArray(content)
          ? content
              .map((item) =>
                typeof item === "string" ? item : item?.name || ""
              )
              .filter(Boolean)
              .join(", ")
          : getSectionText(content);
        break;

      case "EXPERIENCE":
        data.experience = fromApiResume({
          experience: Array.isArray(content) ? content : [],
        }).experience || getSectionText(content);
        break;

      case "PROJECTS":
        data.projects = fromApiResume({
          projects: Array.isArray(content) ? content : [],
        }).projects || getSectionText(content);
        break;

      case "EDUCATION":
        data.education = fromApiResume({
          education: Array.isArray(content) ? content : [],
        }).education || getSectionText(content);
        break;

      case "CERTIFICATIONS":
        data.certifications = fromApiResume({
          certifications: Array.isArray(content) ? content : [],
        }).certifications;
        break;

      case "LINKS": {
        const links = Array.isArray(content) ? content : [];
        data.github =
          data.github ||
          links.find((item) =>
            String(item?.name || item?.type || "")
              .toLowerCase()
              .includes("github")
          )?.url ||
          "";
        data.linkedin =
          data.linkedin ||
          links.find((item) =>
            String(item?.name || item?.type || "")
              .toLowerCase()
              .includes("linkedin")
          )?.url ||
          "";
        break;
      }

      default:
        break;
    }
  });

  return {
    id: resume.id,
    title: resume.title || "Untitled Resume",
    updated: resume.updated_at || resume.created_at || "",
    status: "Saved",
    template: currentVersion?.template_name || "classic",
    data: {
      name: "",
      email: "",
      phone: "",
      address: "",
      github: "",
      linkedin: "",
      summary: "",
      experience: "",
      projects: "",
      skills: "",
      education: "",
      certifications: "",
      ...data,
    },
    serverBacked: true,
  };
}

function getResumeId(result) {
  return (
    result?.resume_id ??
    result?.resume?.id ??
    result?.id ??
    result?.saved_resume?.id ??
    null
  );
}

function displayValue(value) {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => displayValue(item))
      .filter(Boolean)
      .join(", ");
  }

  if (value && typeof value === "object") {
    return [
      value.name,
      value.title,
      value.degree,
      value.institution,
      value.issuer,
      value.date,
      value.url,
    ]
      .filter(Boolean)
      .join(" — ");
  }

  return "";
}

function ResultList({ title, items }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const values = items.map(displayValue).filter(Boolean);
  if (!values.length) return null;

  return (
    <section className="jd-result-section">
      <h3>{title}</h3>
      <ul>
        {values.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function ResumePreview({ resume }) {
  if (!resume) return null;

  const info = resume.personal_info || {};

  return (
    <div className="jd-generated-resume">
      <header>
        <h2>{info.full_name || info.name || "Resume Preview"}</h2>
        <p>
          {[info.email, info.phone, info.location || info.address]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p>
          {[info.github, info.linkedin]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      {resume.summary && (
        <section>
          <h3>Professional Summary</h3>
          <p>{displayValue(resume.summary)}</p>
        </section>
      )}

      <section>
        <h3>Experience</h3>
        {(resume.experience || []).length ? (
          resume.experience.map((item, index) => (
            <article key={`exp-${index}`}>
              <strong>
                {[item.job_title, item.company].filter(Boolean).join(" — ") ||
                  `Experience ${index + 1}`}
              </strong>
              <p>
                {[item.location, item.start_date, item.end_date]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <ResultList
                title="Responsibilities"
                items={item.responsibilities}
              />
            </article>
          ))
        ) : (
          <p>No experience provided.</p>
        )}
      </section>

      <section>
        <h3>Projects</h3>
        {(resume.projects || []).length ? (
          resume.projects.map((item, index) => (
            <article key={`project-${index}`}>
              <strong>{item.name || `Project ${index + 1}`}</strong>
              <p>{item.description}</p>
              <p>{displayValue(item.technologies)}</p>
            </article>
          ))
        ) : (
          <p>No projects provided.</p>
        )}
      </section>

      <section>
        <h3>Skills</h3>
        <p>{displayValue(resume.skills) || "No skills provided."}</p>
      </section>

      <section>
        <h3>Education</h3>
        {(resume.education || []).length ? (
          resume.education.map((item, index) => (
            <article key={`education-${index}`}>
              <strong>{item.degree || `Education ${index + 1}`}</strong>
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
            </article>
          ))
        ) : (
          <p>No education provided.</p>
        )}
      </section>

      <section>
        <h3>Certifications</h3>
        <ResultList title="Certifications" items={resume.certifications} />
      </section>
    </div>
  );
}

function JobDescription() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState("automatic");

  const [savedResumes, setSavedResumes] = useState(readLocalResumes);
  const [selectedResumeId, setSelectedResumeId] = useState("");

  const [analysis, setAnalysis] = useState(null);
  const [optimization, setOptimization] = useState(null);
  const [savedJobId, setSavedJobId] = useState(null);

  const [selectedSection, setSelectedSection] = useState("summary");
  const [sectionContent, setSectionContent] = useState("");
  const [manualResult, setManualResult] = useState(null);
  const [generatedDraft, setGeneratedDraft] = useState(null);

  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function authHeaders(json = true) {
    const token = getToken();
    return {
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async function readError(response) {
    try {
      const data = await response.json();
      const detail = data.detail || data.message || data.error;

      if (typeof detail === "string") return detail;
      if (detail) return JSON.stringify(detail);

      const fieldMessages = Object.entries(data)
        .map(([field, value]) => {
          const message = Array.isArray(value)
            ? value.join(" ")
            : typeof value === "string"
              ? value
              : "";
          return message ? `${field}: ${message}` : "";
        })
        .filter(Boolean);

      return fieldMessages.join(" ") ||
        `Request failed with status ${response.status}.`;
    } catch {
      return `Request failed with status ${response.status}.`;
    }
  }

  async function parseResponse(response) {
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        result.detail || result.message || result.error ||
        `Request failed with status ${response.status}.`;
      throw new Error(
        typeof message === "string" ? message : JSON.stringify(message)
      );
    }
    return result;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadResumes() {
      const token = getToken();
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE}/resumes/`, {
          headers: authHeaders(false),
        });

        if (!response.ok) throw new Error(await readError(response));

        const result = await response.json();
        const serverItems = Array.isArray(result)
          ? result
          : result.results || [];

        const serverResumes = serverItems.map(normalizeServerResume);
        const localItems = readLocalResumes();
        const serverIds = new Set(
          serverResumes.map((resume) => String(resume.id))
        );

        // Keep local-only drafts and cache-only contact/certification fields.
        const localById = new Map(
          localItems.map((resume) => [String(resume.id), resume])
        );

        const mergedServerResumes = serverResumes.map((resume) => {
          const local = localById.get(String(resume.id));
          if (!local) return resume;

          return {
            ...local,
            ...resume,
            data: {
              ...local.data,
              ...resume.data,
              github: resume.data.github || local.data?.github || "",
              linkedin: resume.data.linkedin || local.data?.linkedin || "",
              certifications:
                resume.data.certifications ||
                local.data?.certifications ||
                "",
            },
          };
        });

        const localDrafts = localItems.filter(
          (resume) =>
            !resume.serverBacked &&
            !serverIds.has(String(resume.id))
        );

        const merged = [...mergedServerResumes, ...localDrafts];

        if (!cancelled) {
          setSavedResumes(merged);
          localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
        }
      } catch {
        // Continue with local resumes when the API is temporarily unavailable.
        if (!cancelled) setSavedResumes(readLocalResumes());
      }
    }

    loadResumes();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedResume = savedResumes.find(
    (resume) => String(resume.id) === String(selectedResumeId)
  );

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function validateJobDetails() {
    if (
      !form.title.trim() ||
      !form.company_name.trim() ||
      !form.job_title.trim() ||
      !form.description.trim()
    ) {
      setError("Please fill in all job details.");
      return false;
    }

    if (form.description.trim().length < 20) {
      setError("Job description must contain at least 20 characters.");
      return false;
    }

    return true;
  }

  async function handleSaveJob() {
    setError("");
    setSuccess("");

    if (!validateJobDetails()) return;

    if (!getToken()) {
      setError("Please log in again to save this job description.");
      return;
    }

    setLoading("save-job");

    try {
      const response = await fetch(`${API_BASE}/job-descriptions/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          title: form.title.trim(),
          company_name: form.company_name.trim(),
          job_title: form.job_title.trim(),
          description: form.description.trim(),
        }),
      });

      const result = await parseResponse(response);
      setSavedJobId(result.id || result.job_description_id || null);
      setSuccess("Job description saved successfully.");
    } catch (err) {
      setError(err.message || "Could not save the job description.");
    } finally {
      setLoading("");
    }
  }

  async function handleAnalyze() {
    setError("");
    setSuccess("");
    setAnalysis(null);
    setOptimization(null);

    if (!validateJobDetails()) return;

    if (!getToken()) {
      setError("Please log in again to analyze this job.");
      return;
    }

    setLoading("analyze");

    try {
      const response = await fetch(`${AI_API}/parse-job/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          description: form.description.trim(),
        }),
      });

      const result = await parseResponse(response);
      setAnalysis(result);
      setStep(2);
      setSuccess("Job analysis completed.");
    } catch (err) {
      setError(err.message || "Could not analyze the job description.");
    } finally {
      setLoading("");
    }
  }

  async function handleOptimize() {
    setError("");
    setSuccess("");
    setOptimization(null);

    if (!selectedResume) {
      setError("Please select a resume first.");
      return;
    }

    if (!getToken()) {
      setError("Please log in again to optimize your resume.");
      return;
    }

    setLoading("optimize");

    try {
      const response = await fetch(`${AI_API}/optimize-resume/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          candidate_resume: toApiResume(selectedResume.data || {}),
          job_description: form.description.trim(),
          target_job_title: form.job_title.trim(),
        }),
      });

      const result = await parseResponse(response);
      setOptimization(result);
      setStep(3);
      setSuccess("Resume matching analysis completed.");
    } catch (err) {
      setError(err.message || "Could not optimize your resume.");
    } finally {
      setLoading("");
    }
  }

  async function handleImproveSection() {
    setError("");
    setSuccess("");
    setManualResult(null);

    if (!selectedResume) {
      setError("Please select a resume first.");
      return;
    }

    if (!form.description.trim()) {
      setError("Please enter a job description first.");
      return;
    }

    const originalContent =
      sectionContent.trim() ||
      String(selectedResume.data?.[selectedSection] || "");

    if (!originalContent.trim()) {
      setError("Enter the selected section's content before improving it.");
      return;
    }

    if (!getToken()) {
      setError("Please log in again.");
      return;
    }

    setLoading("improve");

    try {
      const response = await fetch(`${AI_API}/improve-section/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          section_name: selectedSection,
          section_content: originalContent,
          job_description: form.description.trim(),
          target_job_title: form.job_title.trim(),
        }),
      });

      const result = await parseResponse(response);
      setManualResult({
        ...result,
        originalContent,
        improved_content:
          result.improved_content ||
          result.improved_text ||
          result.content ||
          "",
      });
    } catch (err) {
      setError(err.message || "Could not improve this section.");
    } finally {
      setLoading("");
    }
  }

  function saveManualDraft() {
    if (!selectedResume || !manualResult?.improved_content?.trim()) {
      setError("There is no improved content to save.");
      return;
    }

    const updatedData = {
      ...selectedResume.data,
      [selectedSection]: manualResult.improved_content.trim(),
    };

    const draft = {
      ...selectedResume,
      id: `local-draft-${Date.now()}`,
      title: `${selectedResume.title || "Resume"} - ${selectedSection} Draft`,
      updated: new Date().toISOString(),
      status: "Draft",
      serverBacked: false,
      data: updatedData,
    };

    const updated = [draft, ...savedResumes];

    setSavedResumes(updated);
    setSelectedResumeId(String(draft.id));
    localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
    setManualResult(null);
    setSectionContent(updatedData[selectedSection] || "");
    setSuccess("A separate local draft was saved. The original resume is unchanged.");
  }

  async function handleGenerateResume() {
    setError("");
    setSuccess("");
    setGeneratedDraft(null);

    if (!selectedResume) {
      setError("Please select a resume first.");
      return;
    }

    if (!validateJobDetails()) return;

    if (!getToken()) {
      setError("Please log in again to generate your resume.");
      return;
    }

    setLoading("generate");

    try {
      const payload = {
        candidate_resume: toApiResume(selectedResume.data || {}),
        job_description: form.description.trim(),
        target_job_title: form.job_title.trim(),
        target_company: form.company_name.trim(),
        resume_title: `${form.job_title.trim()} - ${form.company_name.trim()} Resume`,
        template_name: "ATS Classic",
      };

      // Deliberately do not send the existing resume_id.
      // The generation endpoint must create a separate database resume.
      const response = await fetch(`${AI_API}/generate-resume/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const result = await parseResponse(response);
      const generated =
        result.generated_resume ||
        result.resume_data ||
        result.resume ||
        null;
      const newId = getResumeId(result);

      if (!generated || !newId) {
        throw new Error(
          "The API did not return a generated resume and its new ID. Check the backend generation endpoint response."
        );
      }

      setGeneratedDraft({
        resume: generated,
        id: newId,
        title:
          result.resume_title ||
          result.title ||
          payload.resume_title,
      });

      setSuccess("The generated resume is ready for review.");
    } catch (err) {
      setError(err.message || "Resume generation failed.");
    } finally {
      setLoading("");
    }
  }

  async function handleConfirmGenerated() {
    if (!generatedDraft) return;

    setError("");
    setSuccess("");

    const token = getToken();

    if (!token) {
      setError("Please log in again.");
      return;
    }

    setLoading("refresh");

    try {
      // Re-fetch the saved resume to verify it exists on the server.
      const response = await fetch(
        `${API_BASE}/resumes/${generatedDraft.id}/`,
        { headers: authHeaders(false) }
      );

      let savedResume;

      if (response.ok) {
        savedResume = normalizeServerResume(await response.json());
      } else {
        // Some APIs return a generated resume body and ID without a detail endpoint.
        // The API generation response must have saved it successfully for this fallback.
        savedResume = {
          id: generatedDraft.id,
          title: generatedDraft.title,
          updated: new Date().toISOString(),
          status: "Saved",
          template: "classic",
          data: fromApiResume(generatedDraft.resume),
          serverBacked: true,
        };
      }

      const updated = [
        savedResume,
        ...savedResumes.filter(
          (resume) => String(resume.id) !== String(savedResume.id)
        ),
      ];

      setSavedResumes(updated);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      setSelectedResumeId(String(savedResume.id));
      setGeneratedDraft(null);
      setSuccess("The generated resume has been added separately to your resume list.");
    } catch (err) {
      setError(err.message || "Could not refresh the saved resume.");
    } finally {
      setLoading("");
    }
  }

  function resetGeneratedDraft() {
    setGeneratedDraft(null);
    setError("");
    setSuccess("");
  }

  function changeStep(nextStep) {
    setError("");
    setSuccess("");

    if (nextStep === 1) {
      setStep(1);
      return;
    }

    if (nextStep === 2 && !form.description.trim()) {
      setError("Enter a job description first.");
      return;
    }

    if (nextStep === 3 && !selectedResume) {
      setError("Select a resume first.");
      return;
    }

    setStep(nextStep);
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
            Analyze a job description, compare it with your experience,
            and create a separate job-targeted resume.
          </p>
        </div>

        <nav className="jd-step-navigation" aria-label="Resume tailoring steps">
          {[
            { number: 1, label: "Job Details" },
            { number: 2, label: "Job Analysis" },
            { number: 3, label: "Resume Tailoring" },
          ].map((item) => (
            <button
              type="button"
              key={item.number}
              className={`jd-step-button ${step === item.number ? "active" : ""} ${step > item.number ? "completed" : ""}`}
              onClick={() => changeStep(item.number)}
            >
              <span>{item.number}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {error && <p className="form-error" role="alert">{error}</p>}
        {success && <p className="form-success" role="status">{success}</p>}

        {step === 1 && (
          <section className="jd-card">
            <h2>Step 1: Job Details</h2>
            <p className="jd-muted">
              Add the target role and paste the job description.
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleAnalyze();
              }}
            >
              <div className="jd-field">
                <label htmlFor="jd-title">Job Description Name</label>
                <input
                  id="jd-title"
                  name="title"
                  value={form.title}
                  onChange={updateForm}
                  placeholder="e.g. Python Developer - October"
                  required
                />
              </div>

              <div className="jd-two-columns">
                <div className="jd-field">
                  <label htmlFor="jd-company">Company Name</label>
                  <input
                    id="jd-company"
                    name="company_name"
                    value={form.company_name}
                    onChange={updateForm}
                    placeholder="Company name"
                    required
                  />
                </div>

                <div className="jd-field">
                  <label htmlFor="jd-job-title">Job Title</label>
                  <input
                    id="jd-job-title"
                    name="job_title"
                    value={form.job_title}
                    onChange={updateForm}
                    placeholder="e.g. Python Developer"
                    required
                  />
                </div>
              </div>

              <div className="jd-field">
                <label htmlFor="jd-description">Job Description</label>
                <textarea
                  id="jd-description"
                  name="description"
                  value={form.description}
                  onChange={updateForm}
                  placeholder="Paste responsibilities, required skills, qualifications, and experience..."
                  rows={11}
                  minLength={20}
                  required
                />
                <span className="jd-character-count">
                  {form.description.length} characters
                </span>
              </div>

              <div className="jd-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={handleSaveJob}
                  disabled={Boolean(loading)}
                >
                  {loading === "save-job" ? "Saving..." : "Save Job Description"}
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={Boolean(loading)}
                >
                  {loading === "analyze" ? "Analyzing..." : "Analyze & Continue →"}
                </button>
              </div>

              {savedJobId && (
                <p className="jd-muted">
                  Job description saved. ID: {savedJobId}
                </p>
              )}
            </form>
          </section>
        )}

        {step === 2 && (
          <section className="jd-card">
            <h2>Step 2: Job Analysis</h2>
            <p className="jd-muted">
              Review the job requirements before tailoring your resume.
            </p>

            {!analysis ? (
              <p>
                Click “Analyze Job Description” to retrieve the job requirements.
              </p>
            ) : (
              <>
                <div className="jd-summary">
                  <h3>{analysis.job_title || form.job_title}</h3>
                  <p>{analysis.company_name || form.company_name}</p>
                  <p>{analysis.summary || "No summary returned by the API."}</p>
                  <p>
                    <strong>Experience level:</strong>{" "}
                    {analysis.experience_level || "Not specified"}
                  </p>
                </div>

                <ResultList title="Required Skills" items={analysis.required_skills} />
                <ResultList title="Preferred Skills" items={analysis.preferred_skills} />
                <ResultList title="Qualifications" items={analysis.qualifications} />
                <ResultList title="Responsibilities" items={analysis.responsibilities} />
                <ResultList title="Important Keywords" items={analysis.keywords} />

                <p className="jd-note">
                  Use only skills and qualifications that accurately reflect your
                  actual background. The AI should not invent experience.
                </p>
              </>
            )}

            <div className="jd-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => changeStep(1)}
              >
                ← Edit Job Details
              </button>

              <button
                type="button"
                className="primary-btn"
                onClick={() => changeStep(3)}
              >
                Continue to Resume Tailoring →
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <>
            <section className="jd-card">
              <h2>Step 3: Choose Your Resume</h2>
              <p className="jd-muted">
                Select the resume you want to use as the starting point.
              </p>

              <div className="jd-field">
                <label htmlFor="resume-select">Saved Resumes</label>
                <select
                  id="resume-select"
                  value={selectedResumeId}
                  onChange={(event) => {
                    setSelectedResumeId(event.target.value);
                    setOptimization(null);
                    setManualResult(null);
                    setSectionContent("");
                    setError("");
                    setSuccess("");
                  }}
                >
                  <option value="">Choose a resume</option>
                  {savedResumes.map((resume) => (
                    <option key={resume.id} value={String(resume.id)}>
                      {resume.title || `${resume.data?.name || "Untitled"} Resume`}
                    </option>
                  ))}
                </select>
              </div>

              {savedResumes.length === 0 && (
                <p className="jd-note">
                  No saved resumes were found. Create and save a resume first
                  from the dashboard.
                </p>
              )}

              {selectedResume && (
                <div className="jd-summary">
                  <h3>{selectedResume.title}</h3>
                  <p>{selectedResume.data?.name || "Name not provided"}</p>
                  <p>{selectedResume.data?.email || ""}</p>
                  <p>
                    <strong>Status:</strong>{" "}
                    {selectedResume.serverBacked ? "Saved on server" : "Local draft"}
                  </p>
                </div>
              )}

              <div className="jd-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => changeStep(2)}
                >
                  ← Back to Analysis
                </button>

                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleOptimize}
                  disabled={Boolean(loading) || !selectedResume}
                >
                  {loading === "optimize" ? "Matching..." : "Check Resume Match"}
                </button>
              </div>
            </section>

            {optimization && (
              <section className="jd-card jd-results">
                <span className="jd-eyebrow">RESUME MATCH REPORT</span>
                <h2>Optimization Analysis</h2>

                <div className="jd-summary">
                  <h3>Overall Match Score</h3>
                  <p className="jd-match-score">
                    {optimization.overall_match_score ?? "N/A"}
                    {optimization.overall_match_score != null ? " / 100" : ""}
                  </p>
                  <p>
                    {optimization.analysis_summary ||
                      "Review the suggestions below."}
                  </p>
                </div>

                <ResultList title="Matched Keywords" items={optimization.matched_keywords} />
                <ResultList title="Missing Keywords" items={optimization.missing_keywords} />
                <ResultList title="Skill Gaps" items={optimization.skill_gaps} />
                <ResultList title="Improvement Suggestions" items={optimization.suggestions} />
              </section>
            )}

            <section className="jd-card jd-mode-card">
              <h2>How Would You Like to Improve Your Resume?</h2>
              <p className="jd-muted">
                Choose a method. Manual changes create a separate local draft;
                automatic generation requests a separate saved resume from the backend.
              </p>

              <div className="jd-mode-options">
                <button
                  type="button"
                  className={`jd-mode-option ${mode === "manual" ? "active" : ""}`}
                  onClick={() => {
                    setMode("manual");
                    setManualResult(null);
                    setGeneratedDraft(null);
                    setError("");
                    setSuccess("");
                  }}
                >
                  <span className="jd-mode-icon">✍️</span>
                  <strong>Manual Editing</strong>
                  <span>
                    Improve one section, review the suggestion, and save it as a
                    separate draft.
                  </span>
                </button>

                <button
                  type="button"
                  className={`jd-mode-option ${mode === "automatic" ? "active" : ""}`}
                  onClick={() => {
                    setMode("automatic");
                    setManualResult(null);
                    setError("");
                    setSuccess("");
                  }}
                >
                  <span className="jd-mode-icon">⚡</span>
                  <strong>AI-Generated Resume</strong>
                  <span>
                    Generate a complete job-targeted resume and save it separately.
                  </span>
                </button>
              </div>

              {mode === "manual" && (
                <div className="jd-mode-content">
                  <h3>Improve a Resume Section</h3>

                  <div className="jd-field">
                    <label htmlFor="section-select">Section</label>
                    <select
                      id="section-select"
                      value={selectedSection}
                      onChange={(event) => {
                        setSelectedSection(event.target.value);
                        setSectionContent("");
                        setManualResult(null);
                        setError("");
                      }}
                    >
                      <option value="summary">Professional Summary</option>
                      <option value="experience">Experience</option>
                      <option value="projects">Projects</option>
                      <option value="skills">Skills</option>
                      <option value="education">Education</option>
                      <option value="certifications">Certifications</option>
                    </select>
                  </div>

                  <div className="jd-field">
                    <label htmlFor="section-content">Current Section Content</label>
                    <textarea
                      id="section-content"
                      rows={6}
                      value={sectionContent}
                      onChange={(event) => setSectionContent(event.target.value)}
                      placeholder="Enter or edit the content you want to improve..."
                    />
                  </div>

                  <button
                    type="button"
                    className="primary-btn"
                    onClick={handleImproveSection}
                    disabled={Boolean(loading) || !selectedResume}
                  >
                    {loading === "improve" ? "Improving..." : "Improve This Section"}
                  </button>

                  {manualResult && (
                    <div className="jd-manual-result">
                      <h3>Review AI Suggestion</h3>
                      {manualResult.changes_summary && (
                        <p>{manualResult.changes_summary}</p>
                      )}

                      <div className="jd-field">
                        <label htmlFor="improved-content">
                          Edit the Suggested Content
                        </label>
                        <textarea
                          id="improved-content"
                          rows={8}
                          value={manualResult.improved_content || ""}
                          onChange={(event) =>
                            setManualResult({
                              ...manualResult,
                              improved_content: event.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="jd-actions">
                        <button
                          type="button"
                          className="primary-btn"
                          onClick={saveManualDraft}
                        >
                          Save as Separate Draft
                        </button>

                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => setManualResult(null)}
                        >
                          Discard Suggestion
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mode === "automatic" && (
                <div className="jd-mode-content">
                  <h3>Generate a Complete Resume</h3>
                  <p>
                    The generated resume will be reviewed separately from your
                    original. Verify all details before using it.
                  </p>

                  <button
                    type="button"
                    className="primary-btn"
                    onClick={handleGenerateResume}
                    disabled={Boolean(loading) || !selectedResume}
                  >
                    {loading === "generate" ? "Generating Resume..." : "Generate AI Resume"}
                  </button>

                  {generatedDraft && (
                    <div className="jd-manual-result">
                      <h3>{generatedDraft.title}</h3>
                      <p className="jd-note">
                        Review the generated content carefully. Do not use
                        inaccurate experience, skills, or qualifications.
                      </p>

                      <ResumePreview resume={generatedDraft.resume} />

                      <div className="jd-actions">
                        <button
                          type="button"
                          className="primary-btn"
                          onClick={handleConfirmGenerated}
                          disabled={Boolean(loading)}
                        >
                          {loading === "refresh"
                            ? "Verifying Saved Resume..."
                            : "Confirm & Add to Resume List"}
                        </button>

                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={resetGeneratedDraft}
                          disabled={Boolean(loading)}
                        >
                          Close Preview
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default JobDescription;
