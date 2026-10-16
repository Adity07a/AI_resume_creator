import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import "../App.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1"
).replace(/\/+$/, "");

const STORAGE_KEY = "resumeai-resumes";

function getSavedResumes() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveResumes(resumes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes));
}

function getAccessToken() {
  return (
    localStorage.getItem("resumeai-access-token") ||
    sessionStorage.getItem("resumeai-access-token")
  );
}

function getUserDetails() {
  try {
    return JSON.parse(
      localStorage.getItem("resumeai-user") || "null"
    );
  } catch {
    return null;
  }
}

function toText(value, type = "") {
  if (value == null) return "";

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") {
          return String(item);
        }

        if (!item || typeof item !== "object") return "";

        if (type === "EDUCATION") {
          return [
            item.degree,
            item.institution,
            item.location,
            [item.start_date, item.end_date]
              .filter(Boolean)
              .join(" - "),
            item.grade,
          ]
            .filter(Boolean)
            .join(", ");
        }

        if (type === "PROJECTS") {
          return [
            item.name,
            item.description,
            Array.isArray(item.technologies)
              ? item.technologies.join(", ")
              : item.technologies,
          ]
            .filter(Boolean)
            .join("\n");
        }

        if (type === "EXPERIENCE") {
          return [
            item.job_title,
            item.company,
            item.location,
            [item.start_date, item.end_date]
              .filter(Boolean)
              .join(" - "),
            Array.isArray(item.responsibilities)
              ? item.responsibilities.join("\n")
              : item.responsibilities,
          ]
            .filter(Boolean)
            .join("\n");
        }

        if (type === "CERTIFICATIONS") {
          return [
            item.name,
            item.title,
            item.issuer,
            item.date,
          ]
            .filter(Boolean)
            .join(" — ");
        }

        return (
          item.name ||
          item.skill ||
          item.text ||
          item.description ||
          ""
        );
      })
      .filter(Boolean)
      .join("\n\n");
  }

  if (typeof value === "object") {
    return value.text || value.description || value.name || "";
  }

  return "";
}

function normalizeResume(resume) {
  const versions = Array.isArray(resume.versions)
    ? resume.versions
    : [];

  const currentVersion =
    versions.find((version) => version.is_current) ||
    versions[0] ||
    null;

  const data = {
    name: "",
    email: "",
    phone: "",
    address: "",
    github: "",
    linkedin: "",
    portfolio: "",
    summary: "",
    education: "",
    skills: "",
    projects: "",
    experience: "",
    certifications: "",
  };

  const sections = currentVersion?.sections || [];

  for (const section of sections) {
    const content = section.content || {};

    switch (section.section_type) {
      case "CUSTOM": {
        const info = content.personal_info || content;

        data.name = info.full_name || info.name || data.name;
        data.email = info.email || data.email;
        data.phone = info.phone || data.phone;
        data.address =
          info.location || info.address || data.address;
        data.github = info.github || data.github;
        data.linkedin = info.linkedin || data.linkedin;
        data.portfolio = info.portfolio || data.portfolio;
        break;
      }

      case "SUMMARY":
        data.summary = toText(content, "SUMMARY");
        break;

      case "SKILLS":
        data.skills = toText(content, "SKILLS");
        break;

      case "EDUCATION":
        data.education = toText(content, "EDUCATION");
        break;

      case "PROJECTS":
        data.projects = toText(content, "PROJECTS");
        break;

      case "EXPERIENCE":
        data.experience = toText(content, "EXPERIENCE");
        break;

      case "CERTIFICATIONS":
        data.certifications = toText(content, "CERTIFICATIONS");
        break;

      case "LINKS": {
        const links = Array.isArray(content)
          ? content
          : Array.isArray(content.links)
            ? content.links
            : [];

        for (const item of links) {
          const type = String(
            item?.name || item?.type || ""
          ).toLowerCase();

          if (type.includes("github")) {
            data.github = data.github || item.url || "";
          }

          if (type.includes("linkedin")) {
            data.linkedin = data.linkedin || item.url || "";
          }

          if (type.includes("portfolio")) {
            data.portfolio = data.portfolio || item.url || "";
          }
        }
        break;
      }

      default:
        break;
    }
  }

  const directInfo = resume.personal_info || {};

  data.name ||= directInfo.full_name || directInfo.name || "";
  data.email ||= directInfo.email || "";
  data.phone ||= directInfo.phone || "";
  data.address ||= directInfo.location || directInfo.address || "";
  data.github ||= directInfo.github || "";
  data.linkedin ||= directInfo.linkedin || "";
  data.portfolio ||= directInfo.portfolio || "";

  data.summary ||= toText(resume.summary);
  data.skills ||= toText(resume.skills, "SKILLS");
  data.education ||= toText(resume.education, "EDUCATION");
  data.projects ||= toText(resume.projects, "PROJECTS");
  data.experience ||= toText(resume.experience, "EXPERIENCE");
  data.certifications ||= toText(
    resume.certifications,
    "CERTIFICATIONS"
  );

  return {
    ...resume,
    id: resume.id,
    title: resume.title || "Untitled Resume",
    updated:
      resume.updated ||
      resume.updated_at ||
      resume.created_at ||
      null,
    template:
      resume.template ||
      currentVersion?.template_name ||
      resume.template_name ||
      "classic",
    status: resume.status || "Saved",
    data,
    serverBacked: true,
  };
}

function mergeResumeWithCache(serverResume, cachedResume) {
  if (!cachedResume) return serverResume;

  const serverData = serverResume.data || {};
  const cachedData = cachedResume.data || {};
  const mergedData = { ...serverData };

  for (const [key, value] of Object.entries(cachedData)) {
    if (
      mergedData[key] == null ||
      mergedData[key] === ""
    ) {
      mergedData[key] = value;
    }
  }

  return {
    ...cachedResume,
    ...serverResume,
    data: mergedData,
    serverBacked: true,
  };
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString();
}

function viewResumePdf(resume) {
  const data = resume.data || {};
  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  function ensureSpace(height = 8) {
    if (y + height > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  }

  function addText(text, options = {}) {
    if (!text || !String(text).trim()) return;

    const {
      fontSize = 10,
      bold = false,
      gap = 2,
    } = options;

    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(fontSize);

    const lines = pdf.splitTextToSize(
      String(text),
      contentWidth
    );

    const lineHeight = fontSize * 0.45 + 1.5;
    ensureSpace(lines.length * lineHeight + gap);

    pdf.text(lines, margin, y);
    y += lines.length * lineHeight + gap;
  }

  function addSection(title, content) {
    if (!content || !String(content).trim()) return;

    ensureSpace(14);
    y += 3;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(title.toUpperCase(), margin, y);
    y += 2;

    pdf.setDrawColor(160, 160, 160);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 5;

    addText(content, { fontSize: 10, gap: 2 });
  }

  addText(data.name || resume.title || "Resume", {
    fontSize: 20,
    bold: true,
    gap: 3,
  });

  const contact = [
    data.email,
    data.phone,
    data.address,
  ]
    .filter(Boolean)
    .join(" | ");

  addText(contact, { fontSize: 9, gap: 2 });

  if (data.github) {
    addText(`GitHub: ${data.github}`, { fontSize: 9 });
  }

  if (data.linkedin) {
    addText(`LinkedIn: ${data.linkedin}`, { fontSize: 9 });
  }

  if (data.portfolio) {
    addText(`Portfolio: ${data.portfolio}`, { fontSize: 9 });
  }

  addSection("Professional Summary", data.summary);
  addSection("Experience", data.experience);
  addSection("Projects", data.projects);
  addSection("Skills", data.skills);
  addSection("Education", data.education);
  addSection("Certifications", data.certifications);

  const blobUrl = URL.createObjectURL(pdf.output("blob"));
  const pdfWindow = window.open(blobUrl, "_blank");

  if (!pdfWindow) {
    const link = document.createElement("a");
    link.href = blobUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
  }

  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
}

function Dashboard() {
  const [resumes, setResumes] = useState(() => getSavedResumes());
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [search, setSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  const navigate = useNavigate();
  const user = getUserDetails();

  useEffect(() => {
    let cancelled = false;

    async function fetchResumes() {
      const token = getAccessToken();

      if (!token) {
        setResumeError("Please log in to view your saved resumes.");
        return;
      }

      setLoadingResumes(true);
      setResumeError("");

      try {
        const response = await fetch(`${API_BASE_URL}/resumes/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              "Your session has expired. Please log in again."
            );
          }

          throw new Error("Could not load resumes from the server.");
        }

        const result = await response.json();

        const backendResumes = Array.isArray(result)
          ? result
          : result.results || [];

        const cachedResumes = getSavedResumes();

        const cachedById = new Map(
          cachedResumes.map((resume) => [
            String(resume.id),
            resume,
          ])
        );

        const normalizedResumes = backendResumes.map((resume) => {
          const normalized = normalizeResume(resume);
          const cached = cachedById.get(String(normalized.id));

          return mergeResumeWithCache(normalized, cached);
        });

        const serverIds = new Set(
          normalizedResumes.map((resume) => String(resume.id))
        );

        const localDrafts = cachedResumes.filter(
          (resume) =>
            !resume.serverBacked &&
            !serverIds.has(String(resume.id))
        );

        const mergedResumes = [
          ...normalizedResumes,
          ...localDrafts,
        ];

        if (!cancelled) {
          setResumes(mergedResumes);
          saveResumes(mergedResumes);
        }
      } catch (err) {
        if (!cancelled) {
          setResumeError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoadingResumes(false);
        }
      }
    }

    fetchResumes();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleLogout() {
    localStorage.removeItem("resumeai-access-token");
    localStorage.removeItem("resumeai-refresh-token");

    sessionStorage.removeItem("resumeai-access-token");
    sessionStorage.removeItem("resumeai-refresh-token");

    localStorage.removeItem("resumeai-user");

    navigate("/login", { replace: true });
  }

  async function deleteResume(id) {
    const resume = resumes.find(
      (item) => String(item.id) === String(id)
    );

    if (!resume) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${resume.title}"?`
    );

    if (!confirmed) return;

    setResumeError("");

    if (!resume.serverBacked) {
      const updated = resumes.filter(
        (item) => String(item.id) !== String(id)
      );

      setResumes(updated);
      saveResumes(updated);
      return;
    }

    const token = getAccessToken();

    if (!token) {
      setResumeError("Please log in again to delete this resume.");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/resumes/${id}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "Your session has expired. Please log in again."
          );
        }

        if (response.status === 404) {
          throw new Error(
            "This resume was not found. Refresh the dashboard and try again."
          );
        }

        throw new Error("Could not delete the resume from the server.");
      }

      const updated = resumes.filter(
        (item) => String(item.id) !== String(id)
      );

      setResumes(updated);
      saveResumes(updated);
    } catch (err) {
      setResumeError(err.message);
    }
  }

  const filteredResumes = resumes.filter((resume) =>
    (resume.title || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const manualDrafts = filteredResumes.filter(
    (resume) => !resume.serverBacked
  );

  const savedResumes = filteredResumes.filter(
    (resume) => resume.serverBacked
  );

  function renderResumeItem(resume) {
    return (
      <article className="resume-item" key={resume.id}>
        <div className="resume-file-icon">▤</div>

        <div className="resume-item-info">
          <h3>{resume.title}</h3>

          <p>Last updated: {formatDate(resume.updated)}</p>

          <p className="resume-template-label">
            Template:{" "}
            {typeof resume.template === "string"
              ? resume.template.charAt(0).toUpperCase() +
                resume.template.slice(1)
              : "Classic"}
          </p>
        </div>

        <span className="resume-status">
          {resume.serverBacked
            ? resume.status || "Saved"
            : "Local Draft"}
        </span>

        <div className="resume-item-actions">
          <button
            type="button"
            onClick={() => viewResumePdf(resume)}
            aria-label={`View PDF for ${resume.title}`}
          >
            View PDF
          </button>

          <Link
            to={`/resume-builder?id=${encodeURIComponent(resume.id)}`}
          >
            Edit
          </Link>

          <button
            type="button"
            onClick={() => deleteResume(resume.id)}
            aria-label={`Delete ${resume.title}`}
          >
            Delete
          </button>
        </div>
      </article>
    );
  }

  return (
    <div className="dashboard-page">
      <aside className="dashboard-sidebar">
        <Link to="/" className="auth-logo dashboard-logo">
          <span className="logo-icon">R</span>
          Resume<span className="logo-highlight">AI</span>
        </Link>

        <p className="sidebar-label">WORKSPACE</p>

        <nav className="sidebar-nav">
          <Link to="/dashboard" className="sidebar-link active">
            <span>▦</span> Dashboard
          </Link>

          <a href="#my-resumes" className="sidebar-link">
            <span>▤</span> My Resumes
          </a>

          <Link to="/templates" className="sidebar-link">
            <span>▧</span> Templates
          </Link>
        </nav>

        <div className="sidebar-bottom">
          <Link to="/" className="sidebar-logout">
            ← Back to Home
          </Link>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <span className="dashboard-breadcrumb">
              Workspace / Dashboard
            </span>
            <h1>My Dashboard</h1>
          </div>

          <div className="profile-menu-container">
            <button
              type="button"
              className="dashboard-avatar"
              onClick={() =>
                setProfileOpen((previous) => !previous)
              }
              aria-label="Open profile menu"
              aria-expanded={profileOpen}
            >
              {(
                user?.first_name?.[0] ||
                user?.username?.[0] ||
                user?.email?.[0] ||
                "U"
              ).toUpperCase()}
            </button>

            {profileOpen && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-info">
                  <strong>
                    {user?.first_name
                      ? `${user.first_name} ${user.last_name || ""}`.trim()
                      : user?.username || "My Account"}
                  </strong>

                  <span>{user?.email || "Logged-in user"}</span>
                </div>

                <div className="profile-dropdown-divider" />

                <button
                  type="button"
                  className="profile-dropdown-item logout-item"
                  onClick={handleLogout}
                >
                  <span>↪</span> Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <section className="dashboard-welcome">
          <div>
            <span className="welcome-label">
              YOUR CAREER, YOUR STORY
            </span>

            <h2>Welcome back!</h2>

            <p>
              Create a resume that highlights your strengths and helps you
              move toward your next opportunity.
            </p>
          </div>

          <Link
            to="/create-resume"
            className="primary-btn dashboard-create-btn"
          >
            + Create New Resume
          </Link>
        </section>

        <section className="quick-actions">
          <div className="dashboard-section-heading">
            <h2>What would you like to do?</h2>
            <p>Choose your next step.</p>
          </div>

          <div className="action-grid">
            <Link to="/resume-builder" className="action-card">
              <div className="action-icon purple-icon">✦</div>
              <h3>Create New Resume</h3>
              <p>Build a professional resume from scratch.</p>
              <span className="action-arrow">→</span>
            </Link>

            <Link to="/create-resume?mode=upload" className="action-card">
              <div className="action-icon blue-icon">↑</div>
              <h3>Upload Existing Resume</h3>
              <p>Start with your current resume and improve it.</p>
              <span className="action-arrow">→</span>
            </Link>

            <Link to="/job-description" className="action-card">
              <div className="action-icon green-icon">◎</div>
              <h3>Tailor for a Job</h3>
              <p>Analyze a job description and tailor your resume.</p>
              <span className="action-arrow">→</span>
            </Link>
          </div>
        </section>

        <section className="my-resumes-section" id="my-resumes">
          <div className="dashboard-section-heading resume-heading">
            <div>
              <h2>My Resumes</h2>
              <p>Your saved resumes and working drafts.</p>
            </div>

            <input
              type="search"
              className="resume-search"
              placeholder="Search resumes..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search resumes"
            />
          </div>

          {resumeError && (
            <p role="alert" className="form-error">
              {resumeError}
            </p>
          )}

          {loadingResumes && (
            <p className="empty-resumes">Loading your resumes...</p>
          )}

          {!loadingResumes && (
            <>
              <section className="resume-group">
                <div className="dashboard-section-heading">
                  <h3>Saved & AI-Generated Resumes</h3>
                  <p>Resumes available from your account.</p>
                </div>

                <div className="resume-list">
                  {savedResumes.length > 0 ? (
                    savedResumes.map(renderResumeItem)
                  ) : (
                    <p className="empty-resumes">
                      {search
                        ? "No saved resumes match your search."
                        : "No saved resumes found yet."}
                    </p>
                  )}
                </div>
              </section>

              <section className="resume-group">
                <div className="dashboard-section-heading">
                  <h3>Manual & Local Drafts</h3>
                  <p>Drafts saved locally while you work.</p>
                </div>

                <div className="resume-list">
                  {manualDrafts.length > 0 ? (
                    manualDrafts.map(renderResumeItem)
                  ) : (
                    <p className="empty-resumes">
                      {search
                        ? "No local drafts match your search."
                        : "No local drafts yet."}
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
        </section>

        <footer className="dashboard-footer">
          Build your story. Create your future. <span>ResumeAI</span>
        </footer>
      </main>
    </div>
  );
}

export default Dashboard;