import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import "../App.css";

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

// Cleaning function to filter out unwanted long sentences in skills and duplicate technologies in projects
function cleanGeneratedResumeData(apiData) {
  if (!apiData) return apiData;

  // 1. Clean Projects duplication
  if (Array.isArray(apiData.projects)) {
    apiData.projects = apiData.projects.map((proj) => {
      let techStr = Array.isArray(proj.technologies) 
        ? proj.technologies.join(", ") 
        : (proj.technologies || "");
      
      if (proj.description && techStr && proj.description.includes(techStr)) {
        proj.technologies = [];
      }
      return proj;
    });
  }

  // 2. Clean Technical Skills (Remove long sentences & responsibilities)
  if (Array.isArray(apiData.skills)) {
    apiData.skills = apiData.skills.filter((skill) => {
      const text = typeof skill === "string" ? skill : (skill.name || skill.skill || "");
      if (text.length > 40) return false; 
      
      const lower = text.toLowerCase();
      const unwanted = [
        "create api", "collaborate", "knowledge of", "exposure to", 
        "ability to", "learning opportunities", "stay updated", 
        "strong analytical", "good communication", "attention to detail",
        "debugging", "document code"
      ];
      
      if (unwanted.some(phrase => lower.startsWith(phrase))) {
        return false;
      }
      return true;
    });
  }

  return apiData;
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

function JobDescription() {
  const location = useLocation();
  const [form, setForm] = useState(EMPTY_FORM);
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState("automatic");

  const [savedResumes, setSavedResumes] = useState(readLocalResumes);
  const [selectedResumeId, setSelectedResumeId] = useState("");

  const [analysis, setAnalysis] = useState(null);
  const [optimization, setOptimization] = useState(null);
  // Actual JD content is kept separately so file/URL imports never appear in the text area.
  const [activeJDDescription, setActiveJDDescription] = useState("");
  const [importSource, setImportSource] = useState("text");
  const [importUrl, setImportUrl] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [jdSaved, setJdSaved] = useState(false);
  const [savedJDSource, setSavedJDSource] = useState("");

  const [selectedSection, setSelectedSection] = useState("summary");
  const [sectionContent, setSectionContent] = useState("");
  const [manualResult, setManualResult] = useState(null);
  const [generatedDraft, setGeneratedDraft] = useState(null);

  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // A saved JD can be opened from the separate history page.
  useEffect(() => {
    const job = location.state?.savedJD;
    if (!job) return;

    setForm({
      title: job.title || "",
      company_name: job.company_name || "",
      job_title: job.job_title || "",
      // Show text only for text-source JDs; keep file/URL content internal.
      description: ["file", "url"].includes(String(job.source_type || "").toLowerCase()) ? "" : (job.description || ""),
    });
    setActiveJDDescription(job.description || "");
    setImportSource(job.source_type === "file" || job.source_type === "url" ? job.source_type : "text");
    setActiveJDDescription(job.description || "");
    setImportSource("history");
    setJdSaved(true);
    setSavedJDSource(job.source_type || "history");
    setAnalysis(job.parsed_data || null);
    setOptimization(null);
    setJdSaved(true);
    setSavedJDSource(job.source_type || "history");
    setStep(1);
    setError("");
    setSuccess("Saved job description loaded. Select a resume and analyze it when ready.");
  }, [location.state]);

  useEffect(() => {
    let cancelled = false;

    async function loadResumes() {
      const token = getToken();
      if (!token) return;

      try {
        const result = await apiRequest("/resumes/");
        const serverItems = Array.isArray(result)
          ? result
          : result.results || [];

        const serverResumes = serverItems.map(normalizeServerResume);
        const localItems = readLocalResumes();
        const serverIds = new Set(
          serverResumes.map((resume) => String(resume.id))
        );

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
          if (merged.length > 0 && !selectedResumeId) {
            setSelectedResumeId(String(merged[0].id));
          }
        }
      } catch {
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
    if (name === "description") {
      setActiveJDDescription(value);
      setJdSaved(false);
    }
  }

  async function requestJDFromCurrentSource() {
    const title = form.title.trim();
    const companyName = form.company_name.trim();
    const jobTitle = form.job_title.trim();

    if (importSource === "text") {
      const description = form.description.trim();
      if (description.length < 20) {
        throw new Error("Paste at least 20 characters of job description text.");
      }
      return {
        title: title || "Job Description",
        company_name: companyName,
        job_title: jobTitle,
        description,
        source_type: "text",
      };
    }

    if (importSource === "url") {
      if (!importUrl.trim()) throw new Error("Enter the public job posting URL first.");
      try {
        const parsedUrl = new URL(importUrl.trim());
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          throw new Error("Use a valid http or https job posting URL.");
        }
      } catch (err) {
        throw new Error(err.message || "Enter a valid job posting URL, including https://.");
      }
    }

    if (importSource === "file") {
      if (!importFile) throw new Error("Choose a PDF, DOCX, or TXT job description file.");
      if (!/\.(pdf|docx|txt)$/i.test(importFile.name || "")) {
        throw new Error("Only PDF, DOCX, and TXT files are supported.");
      }
      if (importFile.size > 5 * 1024 * 1024) {
        throw new Error("The file must be 5 MB or smaller.");
      }
    }

    // The current backend import endpoint extracts/fetches the JD and persists it.
    // Its response description is used internally and is never placed in the textarea.
    let body;
    if (importSource === "file") {
      body = new FormData();
      body.append("file", importFile);
      if (title) body.append("title", title);
      if (companyName) body.append("company_name", companyName);
      if (jobTitle) body.append("job_title", jobTitle);
    } else {
      body = {
        ...(title ? { title } : {}),
        ...(companyName ? { company_name: companyName } : {}),
        ...(jobTitle ? { job_title: jobTitle } : {}),
        url: importUrl.trim(),
      };
    }

    return apiRequest("/job-descriptions/import/", {
      method: "POST",
      body: importSource === "file" ? body : JSON.stringify(body),
    });
  }

  function applyImportedJD(result, source = importSource) {
    const description = String(result?.description || "").trim();
    if (!description || description.length < 20) {
      throw new Error("The backend did not return a usable job description. Check the file/URL or backend extraction response.");
    }
    setActiveJDDescription(description);
    setForm((previous) => ({
      ...previous,
      title: result.title || previous.title || "Imported Job Description",
      company_name: result.company_name || previous.company_name || "",
      job_title: result.job_title || previous.job_title || "",
      // Only text-source JDs are visible in the textarea.
      description: source === "text" ? description : "",
    }));
    setAnalysis(result.parsed_data || null);
    setOptimization(null);
    setSavedJDSource(result.source_type || source);
    setImportUrl("");
    setImportFile(null);
    return description;
  }

  async function handleImportJobDescription() {
    setError("");
    setSuccess("");
    if (!getToken()) {
      setError("Please log in again before saving a job description.");
      return;
    }
    setLoading("save");
    try {
      const result = await requestJDFromCurrentSource();
      const description = applyImportedJD(result, importSource);
      if (importSource === "text") {
        // Text save uses the same history endpoint, so persist it explicitly.
        const saved = await apiRequest("/job-descriptions/import/", {
          method: "POST",
          body: JSON.stringify({
            ...(form.title.trim() ? { title: form.title.trim() } : {}),
            ...(form.company_name.trim() ? { company_name: form.company_name.trim() } : {}),
            ...(form.job_title.trim() ? { job_title: form.job_title.trim() } : {}),
            description,
          }),
        });
        setAnalysis(saved.parsed_data || result.parsed_data || null);
      }
      setJdSaved(true);
      setSuccess("Job description saved to history successfully.");
    } catch (err) {
      setError(err.message || "Failed to save the job description.");
    } finally {
      setLoading("");
    }
  }

  function validateJobDetails(description) {
    if (!selectedResumeId || !selectedResume) {
      setError("Please select a resume first from the dropdown.");
      return false;
    }
    if (!form.title.trim() || !form.company_name.trim() || !form.job_title.trim()) {
      setError("Please enter the JD title, company name, and job title.");
      return false;
    }
    if (!description || description.trim().length < 20) {
      setError("Provide a valid job description using text, a file, or a URL.");
      return false;
    }
    return true;
  }

  async function handleAnalyzeAndMatch() {
    setError("");
    setSuccess("");
    setAnalysis(null);
    setOptimization(null);

    if (!getToken()) {
      setError("Please log in again.");
      return;
    }

    setLoading("analyze");
    try {
      let descriptionForAnalysis = (activeJDDescription || form.description || "").trim();
      let jdResult = null;

      // For file/URL, send the original source directly to the backend. Do not
      // require the user to paste extracted content into the textarea.
      if (importSource === "file" || importSource === "url") {
        jdResult = await requestJDFromCurrentSource();
        descriptionForAnalysis = applyImportedJD(jdResult, importSource);
      }

      if (!validateJobDetails(descriptionForAnalysis)) return;

      // Text analysis is direct and does not require saving to history first.
      const parsedJob = await apiRequest("/resumes/ai/parse-job/", {
        method: "POST",
        body: JSON.stringify({ description: descriptionForAnalysis }),
      });
      setAnalysis(parsedJob || jdResult?.parsed_data || null);

      const parsedOpt = await apiRequest("/resumes/ai/optimize-resume/", {
        method: "POST",
        body: JSON.stringify({
          candidate_resume: toApiResume(selectedResume.data || {}),
          job_description: descriptionForAnalysis,
          target_job_title: form.job_title.trim(),
        }),
      });
      setOptimization(parsedOpt);
      setStep(2);
      setSuccess("Job Analysis & Resume Match Completed.");
    } catch (err) {
      setError(err.message || "Failed to analyze and match job description.");
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

    const originalContent =
      sectionContent.trim() ||
      String(selectedResume.data?.[selectedSection] || "");

    if (!originalContent.trim()) {
      setError("Enter the selected section's content before improving it.");
      return;
    }

    setLoading("improve");

    try {
      const result = await apiRequest("/resumes/ai/improve-section/", {
        method: "POST",
        body: JSON.stringify({
          section_name: selectedSection,
          section_content: originalContent,
          job_description: (activeJDDescription || form.description).trim(),
          target_job_title: form.job_title.trim(),
        }),
      });
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
      title: `${selectedResume.title || "Resume"} - ${selectedSection} Tailored`,
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
    setSuccess("Manual changes saved as a new draft resume.");
  }

  async function handleGenerateResume() {
    setError("");
    setSuccess("");
    setGeneratedDraft(null);

    if (!selectedResume) {
      setError("Please select a resume first.");
      return;
    }

    setLoading("generate");

    try {
      const payload = {
        candidate_resume: toApiResume(selectedResume.data || {}),
        job_description: (activeJDDescription || form.description).trim(),
        target_job_title: form.job_title.trim(),
        target_company: form.company_name.trim(),
        resume_title: `${form.job_title.trim()} - ${form.company_name.trim()} Resume`,
        template_name: "ATS Classic",
      };

      const result = await apiRequest("/resumes/ai/generate-resume/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      let generated =
        result.generated_resume ||
        result.resume_data ||
        result.resume ||
        null;

      // Clean generated resume data to remove duplicate project techs and long description sentences in skills
      if (generated) {
        generated = cleanGeneratedResumeData(generated);
      }

      const newId = getResumeId(result);

      if (!generated || !newId) {
        throw new Error("API did not return a valid generated resume.");
      }

      setGeneratedDraft({
        resume: generated,
        id: newId,
        title: result.resume_title || payload.resume_title,
      });

      setSuccess("Job-tailored resume generated successfully!");
    } catch (err) {
      setError(err.message || "Resume generation failed.");
    } finally {
      setLoading("");
    }
  }

  return (
    <main className="jd-page">
      <header className="jd-header">
        <Link to="/dashboard" className="auth-logo">
          <span className="logo-icon">R</span>
          Resume<span className="logo-highlight">AI</span>
        </Link>
        <div className="jd-header-actions" style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <Link to="/saved-jd-history" className="secondary-btn">Saved JD History</Link>
          <Link to="/dashboard" className="builder-back-link">← Back to Dashboard</Link>
        </div>
      </header>

      <div className="jd-container">
        <div className="jd-intro">
          <span className="jd-eyebrow">AI-POWERED JOB MATCHING</span>
          <h1>Tailor Your Resume for a Job</h1>
          <p>
            Select a saved resume, analyze it against a job description, and tailor it automatically or manually.
          </p>
        </div>

        {/* Step Navigation */}
        <nav 
          className="jd-step-navigation" 
          aria-label="Steps"
          style={{ display: "flex", justifyContent: "center", gap: "12px", marginBottom: "28px" }}
        >
          {[
            { number: 1, label: "Job & Resume Selection" },
            { number: 2, label: "JD Analysis & Match Score" },
            { number: 3, label: "Resume Tailoring" },
          ].map((item) => (
            <button
              type="button"
              key={item.number}
              className={`secondary-btn ${step === item.number ? "primary-btn" : ""}`}
              onClick={() => {
                if (item.number > 1 && (!form.description.trim() || !selectedResumeId)) {
                  setError("Please select a resume and enter job details first.");
                  return;
                }
                setError("");
                setStep(item.number);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "8px",
                cursor: "pointer"
              }}
            >
              <span 
                style={{
                  display: "inline-flex",
                  width: "22px",
                  height: "22px",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  background: step === item.number ? "rgba(255,255,255,0.25)" : "var(--border-color)",
                  fontSize: "12px",
                  fontWeight: "bold"
                }}
              >
                {item.number}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {error && <p className="form-error" role="alert" style={{ marginBottom: "16px" }}>{error}</p>}
        {success && <p className="form-success" role="status" style={{ marginBottom: "16px" }}>{success}</p>}

        {/* STEP 1: RESUME DROPDOWN & JOB DETAILS */}
        {step === 1 && (
          <section className="jd-card">
            <h2>Step 1: Select Resume & Enter Job Details</h2>
            <p className="jd-muted">
              Choose an existing resume, paste a job description, or import one from a public URL or PDF/DOCX/TXT file. Saved descriptions are available on the separate history page.
            </p>

            {/* Saved Resumes Dropdown */}
            <div className="jd-field">
              <label htmlFor="resume-select">Select Saved Resume</label>
              <select
                id="resume-select"
                value={selectedResumeId}
                onChange={(event) => {
                  setSelectedResumeId(event.target.value);
                  setError("");
                }}
              >
                <option value="">-- Select a Resume from Dashboard --</option>
                {savedResumes.map((resume) => (
                  <option key={resume.id} value={String(resume.id)}>
                    {resume.title || `${resume.data?.name || "Untitled"} Resume`} ({resume.serverBacked ? "Saved" : "Draft"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="jd-field">
                <label htmlFor="jd-title">Job Description Title / Tag</label>
                <input
                  id="jd-title"
                  name="title"
                  value={form.title}
                  onChange={updateForm}
                  placeholder="e.g. Python Developer - Google"
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
                    placeholder="e.g. Backend Developer"
                    required
                  />
                </div>
              </div>

              <div className="jd-field">
                <label>Import Job Description From</label>
                <div className="jd-mode-options" role="group" aria-label="Job description import source">
                  <button
                    type="button"
                    className={`jd-mode-option ${importSource === "text" ? "active" : ""}`}
                    onClick={() => { if (importSource !== "text") setForm((previous) => ({ ...previous, description: "" })); setImportSource("text"); setJdSaved(false); setError(""); }}
                  >
                    <strong>Paste Text</strong>
                    <span>Use the description text below</span>
                  </button>
                  <button
                    type="button"
                    className={`jd-mode-option ${importSource === "url" ? "active" : ""}`}
                    onClick={() => { if (importSource !== "url") setForm((previous) => ({ ...previous, description: "" })); setImportSource("url"); setJdSaved(false); setError(""); }}
                  >
                    <strong>Import from URL</strong>
                    <span>Fetch a public job posting</span>
                  </button>
                  <button
                    type="button"
                    className={`jd-mode-option ${importSource === "file" ? "active" : ""}`}
                    onClick={() => { if (importSource !== "file") setForm((previous) => ({ ...previous, description: "" })); setImportSource("file"); setJdSaved(false); setError(""); }}
                  >
                    <strong>Upload File</strong>
                    <span>PDF, DOCX, or TXT (max 5 MB)</span>
                  </button>
                </div>
              </div>

              {importSource === "url" && (
                <div className="jd-field">
                  <label htmlFor="jd-import-url">Public Job Posting URL</label>
                  <input
                    id="jd-import-url"
                    type="url"
                    value={importUrl}
                    onChange={(event) => setImportUrl(event.target.value)}
                    placeholder="https://company.com/careers/job-posting"
                  />
                  <p className="jd-muted">The page must be publicly accessible. Some job sites block automated importing.</p>
                </div>
              )}

              {importSource === "file" && (
                <div className="jd-field">
                  <label htmlFor="jd-import-file">Choose Job Description File</label>
                  <input
                    id="jd-import-file"
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={(event) => setImportFile(event.target.files?.[0] || null)}
                  />
                  {importFile && <span className="jd-character-count">Selected: {importFile.name}</span>}
                </div>
              )}

              {importSource === "text" && (
                <div className="jd-field">
                  <label htmlFor="jd-description">Job Description (JD)</label>
                  <textarea
                    id="jd-description"
                    name="description"
                    value={form.description}
                    onChange={(event) => {
                      updateForm(event);
                      setJdSaved(false);
                    }}
                    placeholder="Paste job responsibilities, skills, and qualifications here..."
                    rows={8}
                    minLength={20}
                  />
                  <span className="jd-character-count">
                    {form.description.length} characters
                  </span>
                </div>
              )}

              {importSource === "file" && (
                <p className="jd-muted">The selected file will be sent directly to the backend for extraction and saved. Its contents will not be copied into the text box.</p>
              )}
              {importSource === "url" && (
                <p className="jd-muted">The URL will be sent directly to the backend to fetch and save the posting. The fetched content will not be shown in the text box.</p>
              )}
              {importSource === "history" && (
                <p className="jd-muted">This JD was loaded from saved history. You can analyze it without importing it again.</p>
              )}

              <div className="jd-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={handleImportJobDescription}
                  disabled={Boolean(loading)}
                >
                  {loading === "save" ? "Saving JD..." : "Save JD to History"}
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleAnalyzeAndMatch}
                  disabled={Boolean(loading)}
                >
                  {loading === "analyze" ? "Analyzing & Matching..." : "Analyze & Check Match Score →"}
                </button>
              </div>
              {jdSaved && (
                <p className="jd-note" style={{ marginTop: "12px" }}>
                  Saved to history{savedJDSource ? ` (${String(savedJDSource).replace(/_/g, " ")})` : ""}.
                </p>
              )}
            </div>

          </section>
        )}

        {/* STEP 2: JD ANALYSIS & MATCH SCORE */}
        {step === 2 && (
          <section className="jd-card">
            <h2>Step 2: Job Analysis & Resume Match Score</h2>
            <p className="jd-muted">
              Review what the job requires and how well your selected resume matches.
            </p>

            {/* Overall Match Score Card */}
            {optimization && (
              <div className="jd-summary" style={{ textAlign: "center", padding: "20px" }}>
                <h3 style={{ margin: 0, fontSize: "14px", color: "var(--text-secondary)" }}>OVERALL MATCH SCORE</h3>
                <p style={{ fontSize: "2.5rem", fontWeight: "800", color: "var(--primary)", margin: "8px 0" }}>
                  {optimization.overall_match_score ?? "N/A"} / 100
                </p>
                <p style={{ margin: 0 }}>{optimization.analysis_summary}</p>
              </div>
            )}

            {/* Analysis & Gaps breakdown */}
            <div style={{ display: "grid", gap: "16px", marginTop: "20px" }}>
              {optimization && (
                <>
                  <ResultList title="✓ Matched Keywords" items={optimization.matched_keywords} />
                  <ResultList title="⚠ Missing Keywords" items={optimization.missing_keywords} />
                  <ResultList title="⚡ Skill Gaps" items={optimization.skill_gaps} />
                  <ResultList title="💡 Improvement Suggestions" items={optimization.suggestions} />
                </>
              )}

              {analysis && (
                <>
                  <ResultList title="Required Skills from JD" items={analysis.required_skills} />
                  <ResultList title="Preferred Skills from JD" items={analysis.preferred_skills} />
                  <ResultList title="Job Responsibilities" items={analysis.responsibilities} />
                </>
              )}
            </div>

            <div className="jd-actions" style={{ justifyContent: "space-between", marginTop: "28px" }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setStep(1)}
              >
                ← Edit Job Details
              </button>

              <div style={{ display: "flex", gap: "10px" }}>
                <Link to="/analysis" className="secondary-btn">
                  View Gap Analysis Dashboard →
                </Link>
              <button
                type="button"
                className="primary-btn"
                onClick={() => setStep(3)}
              >
                Proceed to Resume Tailoring →
              </button>
            </div>
          </div>
          </section>
        )}

        {/* STEP 3: RESUME TAILORING (MANUAL vs AI AUTOMATIC) */}
        {step === 3 && (
          <section className="jd-card jd-mode-card">
            <h2>Step 3: Tailor Resume for the Job</h2>
            <p className="jd-muted">
              Choose how you want to adjust your resume according to the JD.
            </p>

            {/* 2 Main Tailoring Options */}
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
                <strong>Option 1: Manual Tailoring</strong>
                <span>Improve individual sections based on JD recommendations and save as draft.</span>
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
                <strong>Option 2: Automatic AI Tailoring</strong>
                <span>Generate a brand new, fully job-tailored ATS resume using AI.</span>
              </button>
            </div>

            {/* Manual Tailoring UI */}
            {mode === "manual" && (
              <div className="jd-mode-content">
                <h3>Manual Section Improvement</h3>

                <div className="jd-field">
                  <label htmlFor="section-select">Select Section to Improve</label>
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
                  <label htmlFor="section-content">Current Content</label>
                  <textarea
                    id="section-content"
                    rows={5}
                    value={sectionContent}
                    onChange={(event) => setSectionContent(event.target.value)}
                    placeholder="Enter or paste content you want to tailor..."
                  />
                </div>

                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleImproveSection}
                  disabled={Boolean(loading)}
                >
                  {loading === "improve" ? "Improving Section..." : "Improve with AI"}
                </button>

                {manualResult && (
                  <div className="jd-manual-result" style={{ marginTop: "20px" }}>
                    <h3>AI Suggested Improvements</h3>
                    {manualResult.changes_summary && (
                      <p>{manualResult.changes_summary}</p>
                    )}

                    <div className="jd-field">
                      <label htmlFor="improved-content">Tailored Content (Editable)</label>
                      <textarea
                        id="improved-content"
                        rows={6}
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
                        Save as New Draft
                      </button>

                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => setManualResult(null)}
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Automatic AI Tailoring UI */}
            {mode === "automatic" && (
              <div className="jd-mode-content">
                <h3>Automatic AI Resume Generation</h3>
                <p className="jd-muted">
                  AI will analyze your selected resume and target job description to create an ATS-friendly, tailored resume.
                </p>

                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleGenerateResume}
                  disabled={Boolean(loading)}
                >
                  {loading === "generate" ? "Generating Tailored Resume..." : "Generate AI Tailored Resume"}
                </button>

                {generatedDraft && (
                  <div className="jd-manual-result" style={{ marginTop: "20px" }}>
                    <h3>✓ Resume Generated: {generatedDraft.title}</h3>
                    <p className="jd-note">
                      Your newly tailored resume has been generated. You can view and edit it on your dashboard.
                    </p>

                    <div className="jd-actions" style={{ marginTop: "16px" }}>
                      <Link to="/dashboard" className="primary-btn">
                        Go to Dashboard to View Resume →
                      </Link>
                      <Link to="/optimization" className="secondary-btn">
                        Go to Suggestion Review Workspace →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="jd-actions" style={{ marginTop: "28px" }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setStep(2)}
              >
                ← Back to Match Analysis
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default JobDescription;