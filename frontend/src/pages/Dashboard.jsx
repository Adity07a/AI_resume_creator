import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import Templates from "./Templates";
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

function cleanSkillsText(text) {
  if (!text) return "";
  const items = String(text)
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
  
  const uniqueItems = Array.from(new Set(items));
  return uniqueItems.join(", ");
}

function toText(value, type = "") {
  if (value == null) return "";

  if (typeof value === "string" || typeof value === "number") {
    if (type === "SKILLS") {
      return cleanSkillsText(value);
    }
    return String(value);
  }

  if (Array.isArray(value)) {
    if (type === "SKILLS") {
      const skillsArr = value
        .map((item) => {
          if (typeof item === "string" || typeof item === "number") return String(item).trim();
          return item?.name || item?.skill || "";
        })
        .filter(Boolean);
      return cleanSkillsText(skillsArr.join(", "));
    }

    return value
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") {
          return String(item);
        }

        if (!item || typeof item !== "object") return "";

        if (type === "EDUCATION") {
          const degreeInst = [item.degree, item.institution || item.school]
            .filter(Boolean)
            .join(" — ");
          const datesLoc = [item.location, [item.start_date, item.end_date].filter(Boolean).join(" - "), item.grade]
            .filter(Boolean)
            .join(" | ");

          return [degreeInst, datesLoc].filter(Boolean).join("\n");
        }

        if (type === "PROJECTS") {
          let desc = item.description || "";
          let tech = Array.isArray(item.technologies)
            ? item.technologies.join(", ")
            : item.technologies || "";

          if (desc && tech && desc.includes(tech)) {
            tech = "";
          }

          return [item.name, desc, tech ? `Technologies: ${tech}` : ""]
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
    creation_mode: resume.creation_mode || (resume.is_ai ? "ai" : "manual"),
    is_ai: Boolean(resume.is_ai || resume.creation_mode === "ai"),
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
    creation_mode: serverResume.creation_mode || cachedResume.creation_mode || "manual",
    is_ai: serverResume.is_ai ?? cachedResume.is_ai ?? false,
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



function generatePdfDocument(resume) {
  const data = resume.data || {};
  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const bottomMargin = 14;

  const themes = {
    classic: { color: [40, 40, 40], sidebar: false },
    professional: { color: [32, 54, 83], sidebar: true },
    modern: { color: [26, 127, 123], sidebar: false },
    minimal: { color: [55, 55, 55], sidebar: false },
    technical: { color: [40, 83, 145], sidebar: false },
    executive: { color: [65, 65, 65], sidebar: false },
    contemporary: { color: [112, 83, 150], sidebar: false },
    compact: { color: [50, 50, 50], sidebar: false },
    burgundy: { color: [112, 43, 60], sidebar: true },
  };

  const templateValue = String(
    resume.template || "classic"
  ).toLowerCase();

  const templateAliases = {
    "classic ats": "classic",
    "navy professional": "professional",
    "modern ats": "modern",
    "minimal ats": "minimal",
    "technical ats": "technical",
    "executive ats": "executive",
    "contemporary ats": "contemporary",
    "compact ats": "compact",
    "burgundy professional": "burgundy",
  };

  const templateId =
    templateAliases[templateValue] || templateValue;

  const theme = themes[templateId] || themes.classic;
  const sidebarWidth = theme.sidebar ? 58 : 0;
  const contentX = theme.sidebar ? sidebarWidth + 8 : margin;
  const contentWidth = pageWidth - contentX - margin;

  let y = 16;

  function drawSidebar() {
    if (!theme.sidebar) return;

    pdf.setFillColor(...theme.color);
    pdf.rect(0, 0, sidebarWidth, pageHeight, "F");
  }

  function ensureSpace(height = 6) {
    if (y + height > pageHeight - bottomMargin) {
      pdf.addPage();
      drawSidebar();
      y = 16;
    }
  }

  function addText(value, options = {}) {
    if (!value || !String(value).trim()) return;

    const {
      x = contentX,
      width = contentWidth,
      fontSize = templateId === "compact" ? 8.5 : 9.5,
      bold = false,
      color = [45, 45, 45],
      gap = 1,
      url = null,
    } = options;

    const lineHeight = fontSize * 0.42 + 1.2;
    const rawLines = String(value).split("\n");

    rawLines.forEach((line) => {
      const isHeading = line.trim().startsWith("# ");
      const displayLine = isHeading
        ? line.trim().slice(2)
        : line;

      if (!displayLine.trim()) {
        y += 1.5;
        return;
      }

      pdf.setFont(
        "helvetica",
        bold || isHeading ? "bold" : "normal"
      );
      pdf.setFontSize(fontSize);
      pdf.setTextColor(...color);

      const wrappedLines = pdf.splitTextToSize(
        displayLine,
        width
      );

      wrappedLines.forEach((wrappedLine) => {
        ensureSpace(lineHeight);

        pdf.setFont(
          "helvetica",
          bold || isHeading ? "bold" : "normal"
        );
        pdf.setFontSize(fontSize);
        pdf.setTextColor(...color);
        pdf.text(wrappedLine, x, y);

        if (url) {
          const textWidth = pdf.getTextWidth(wrappedLine);
          pdf.link(
            x,
            y - fontSize * 0.35,
            textWidth,
            lineHeight,
            { url }
          );
        }

        y += lineHeight;
      });
    });

    y += gap;
  }

  function addSection(title, content) {
    if (!content || !String(content).trim()) return;

    ensureSpace(12);
    y += 2;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.setTextColor(...theme.color);
    pdf.text(title.toUpperCase(), contentX, y);

    y += 1.5;

    pdf.setDrawColor(...theme.color);
    pdf.setLineWidth(0.35);
    pdf.line(
      contentX,
      y,
      contentX + contentWidth,
      y
    );

    y += 3.5;

    let formattedContent = String(content);

    if (title.toUpperCase().includes("SKILLS")) {
      formattedContent = cleanSkillsText(formattedContent);
    }

    addText(formattedContent, {
      fontSize: templateId === "compact" ? 8.5 : 9.5,
      gap: 1,
    });
  }

  drawSidebar();

  if (theme.sidebar) {
    const sideX = 7;
    const sideWidth = sidebarWidth - 14;
    let sideY = 16;

    function addSidebarText(value, heading = false, url = null) {
      if (!value || !String(value).trim()) return;

      const fontSize = heading ? 9 : 8;
      const lines = pdf.splitTextToSize(
        String(value).trim(),
        sideWidth
      );

      lines.forEach((line) => {
        if (sideY + 4 > pageHeight - bottomMargin) {
          pdf.addPage();
          drawSidebar();
          sideY = 16;
        }

        pdf.setFont(
          "helvetica",
          heading ? "bold" : "normal"
        );
        pdf.setFontSize(fontSize);
        pdf.setTextColor(255, 255, 255);
        pdf.text(line, sideX, sideY);

        if (url) {
          pdf.link(
            sideX,
            sideY - fontSize * 0.35,
            pdf.getTextWidth(line),
            4,
            { url }
          );
        }

        sideY += 3.5;
      });

      sideY += 1.5;
    }

    addSidebarText(data.name || resume.title || "Resume", true);
    sideY += 3;

    addSidebarText("CONTACT", true);
    addSidebarText(data.email);
    addSidebarText(data.phone);
    addSidebarText(data.address);

    if (data.github) {
      addSidebarText("GitHub", false, data.github);
    }

    if (data.linkedin) {
      addSidebarText("LinkedIn", false, data.linkedin);
    }

    if (data.portfolio) {
      addSidebarText("Portfolio", false, data.portfolio);
    }

    if (data.skills) {
      sideY += 3;
      addSidebarText("SKILLS", true);
      addSidebarText(cleanSkillsText(data.skills));
    }

    y = 16;

    addSection("Professional Summary", data.summary);
    addSection("Experience", data.experience);
    addSection("Projects", data.projects);
    addSection("Education", data.education);
    addSection("Certifications", data.certifications);
  } else {
    addText(data.name || resume.title || "Resume", {
      fontSize: templateId === "compact" ? 16 : 18,
      bold: true,
      color: theme.color,
      gap: 1.5,
    });

    const contact = [
      data.email,
      data.phone,
      data.address,
    ]
      .filter(Boolean)
      .join(" | ");

    addText(contact, {
      fontSize: 8.5,
      color: [85, 85, 85],
    });

    if (data.github) {
      addText("GitHub", {
        fontSize: 8.5,
        color: [37, 99, 235],
        url: data.github,
      });
    }

    if (data.linkedin) {
      addText("LinkedIn", {
        fontSize: 8.5,
        color: [37, 99, 235],
        url: data.linkedin,
      });
    }

    if (data.portfolio) {
      addText("Portfolio", {
        fontSize: 8.5,
        color: [37, 99, 235],
        url: data.portfolio,
      });
    }

    pdf.setDrawColor(...theme.color);
    pdf.setLineWidth(0.5);
    pdf.line(contentX, y, contentX + contentWidth, y);
    y += 3;

    addSection("Professional Summary", data.summary);
    addSection("Experience", data.experience);
    addSection("Projects", data.projects);
    addSection("Technical Skills", data.skills);
    addSection("Education", data.education);
    addSection("Certifications", data.certifications);
  }

  return pdf;
}


function downloadResumePdfFile(resume) {
  try {
    const pdf = generatePdfDocument(resume);
    const data = resume.data || {};
    const fileName = `${(data.name || resume.title || "Resume").trim()}`
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\s+/g, "_");

    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error("PDF download failed:", error);
    window.alert("Could not generate PDF. Please try again.");
  }
}

function viewResumePdf(resume) {
  try {
    const pdf = generatePdfDocument(resume);
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
  } catch (error) {
    console.error("PDF view failed:", error);
    window.alert("Could not preview PDF. Please try again.");
  }
}

function Dashboard() {
  const [resumes, setResumes] = useState(() => getSavedResumes());
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview"); 
  const [profileOpen, setProfileOpen] = useState(false);

  // State for Custom Delete Modal
  const [resumeToDelete, setResumeToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

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
            throw new Error("Your session has expired. Please log in again.");
          }
          throw new Error("Could not load resumes from the server.");
        }

        const result = await response.json();
        const backendResumes = Array.isArray(result)
          ? result
          : result.results || [];

        const cachedResumes = getSavedResumes();
        const cachedById = new Map(
          cachedResumes.map((resume) => [String(resume.id), resume])
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
            !resume.serverBacked && !serverIds.has(String(resume.id))
        );

        const mergedResumes = [...normalizedResumes, ...localDrafts];

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

  // Open delete modal
  function promptDeleteResume(resume) {
    setResumeToDelete(resume);
  }

  // Execute Delete Action
  async function confirmDeleteResume() {
    if (!resumeToDelete) return;
    const { id, serverBacked } = resumeToDelete;

    setDeleting(true);
    setResumeError("");

    if (!serverBacked) {
      const updated = resumes.filter((item) => String(item.id) !== String(id));
      setResumes(updated);
      saveResumes(updated);
      setDeleting(false);
      setResumeToDelete(null);
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setResumeError("Please log in again to delete this resume.");
      setDeleting(false);
      setResumeToDelete(null);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/resumes/${id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Could not delete the resume from the server.");
      }

      const updated = resumes.filter((item) => String(item.id) !== String(id));
      setResumes(updated);
      saveResumes(updated);
    } catch (err) {
      setResumeError(err.message);
    } finally {
      setDeleting(false);
      setResumeToDelete(null);
    }
  }

  const filteredResumes = resumes.filter((resume) =>
    (resume.title || "").toLowerCase().includes(search.toLowerCase())
  );

  // Filter based on creation mode / is_ai tag rather than purely server connections
  const manualDrafts = filteredResumes.filter(
    (resume) =>
      resume.creation_mode === "manual" ||
      (!resume.is_ai && resume.creation_mode !== "ai")
  );

  const savedResumes = filteredResumes.filter(
    (resume) =>
      resume.creation_mode === "ai" ||
      resume.is_ai === true
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
          {resume.creation_mode === "ai" || resume.is_ai
            ? "AI Generated"
            : resume.serverBacked
            ? resume.status || "Saved"
            : "Local Draft"}
        </span>

        <div className="resume-item-actions">
          <button
            type="button"
            onClick={() => viewResumePdf(resume)}
            aria-label={`View PDF for ${resume.title}`}
          >
            View
          </button>

          <button
            type="button"
            onClick={() => downloadResumePdfFile(resume)}
            aria-label={`Download PDF for ${resume.title}`}
          >
            Download
          </button>

          <Link to={`/resume-builder?id=${encodeURIComponent(resume.id)}`}>
            Edit
          </Link>

          <button
            type="button"
            onClick={() => promptDeleteResume(resume)}
            aria-label={`Delete ${resume.title}`}
          >
            Delete
          </button>
        </div>
      </article>
    );
  }

  return (
    <div className="dashboard-page" style={{ display: "flex", minHeight: "100vh" }}>
      <aside className="dashboard-sidebar">
        <Link to="/" className="auth-logo dashboard-logo">
          <span className="logo-icon">R</span>
          Resume<span className="logo-highlight">AI</span>
        </Link>

        <p className="sidebar-label">WORKSPACE</p>

        <nav className="sidebar-nav">
          <a
            href="#overview"
            className={`sidebar-link ${activeTab === "overview" ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("overview");
            }}
          >
            <span>▦</span> Dashboard Overview
          </a>

          <a
            href="#all-resumes"
            className={`sidebar-link ${activeTab === "all" ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("all");
            }}
          >
            <span>▤</span> All Resumes ({resumes.length})
          </a>

          <a
            href="#ai-resumes"
            className={`sidebar-link ${activeTab === "ai" ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("ai");
            }}
          >
            <span>✦</span> AI Resumes ({savedResumes.length})
          </a>

          <a
            href="#manual-drafts"
            className={`sidebar-link ${activeTab === "manual" ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("manual");
            }}
          >
            <span>📝</span> Manual Drafts ({manualDrafts.length})
          </a>

          <a
            href="#templates"
            className={`sidebar-link ${activeTab === "templates" ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("templates");
            }}
          >
            <span>❖</span> Templates
          </a>

          <a
            href="#my-profile"
            className={`sidebar-link ${activeTab === "profile" ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("profile");
            }}
          >
            <span>👤</span> My Profile
          </a>
        </nav>

        <a
          href="#logout"
          className="sidebar-logout"
          onClick={(e) => {
            e.preventDefault();
            handleLogout();
          }}
        >
          ↪ Logout
        </a>
      </aside>

      <main className="dashboard-main" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: "100vh" }}>
        <header className="dashboard-topbar">
          <div>
            <span className="dashboard-breadcrumb">
              Workspace / {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </span>
            <h1>
              {activeTab === "overview" && "Dashboard Overview"}
              {activeTab === "all" && "All Resumes"}
              {activeTab === "ai" && "AI & Saved Resumes"}
              {activeTab === "manual" && "Manual Drafts"}
              {activeTab === "templates" && "Resume Templates Gallery"}
              {activeTab === "profile" && "Account Profile"}
            </h1>
          </div>

          <div className="profile-menu-container">
            <button
              type="button"
              className="dashboard-avatar"
              onClick={() => setProfileOpen((prev) => !prev)}
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
                  className="profile-dropdown-item"
                  onClick={() => {
                    setActiveTab("profile");
                    setProfileOpen(false);
                  }}
                >
                  <span>👤</span> Profile
                </button>
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

        <div style={{ flex: 1, padding: activeTab === "templates" ? "0" : "32px 5%", maxWidth: "1250px", width: "100%", margin: "0 auto" }}>
          {activeTab === "overview" && (
            <>
              <section className="dashboard-welcome">
                <div>
                  <span className="welcome-label">
                    WELCOME BACK, {(user?.first_name || user?.username || "USER").toUpperCase()}
                  </span>
                  <h2>Your Resume Command Center</h2>
                  <p>
                    Manage your career documents, check stats, and build your next winning resume.
                  </p>
                </div>

                <Link
                  to="/create-resume"
                  className="primary-btn dashboard-create-btn"
                >
                  + Create New Resume
                </Link>
              </section>

              <section className="quick-actions" style={{ marginTop: "32px" }}>
                <div className="dashboard-section-heading">
                  <h2>Quick Stats</h2>
                  <p>Overview of your active resumes.</p>
                </div>

                <div className="action-grid">
                  <div className="action-card">
                    <div className="action-icon purple-icon">📊</div>
                    <h3>Total Resumes</h3>
                    <p style={{ fontSize: "1.8rem", fontWeight: "bold", color: "var(--accent-color, #a855f7)" }}>
                      {resumes.length}
                    </p>
                  </div>

                  <div className="action-card">
                    <div className="action-icon green-icon">✦</div>
                    <h3>AI Resumes</h3>
                    <p style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#10b981" }}>
                      {savedResumes.length}
                    </p>
                  </div>

                  <div className="action-card">
                    <div className="action-icon blue-icon">📝</div>
                    <h3>Manual Drafts</h3>
                    <p style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#3b82f6" }}>
                      {manualDrafts.length}
                    </p>
                  </div>
                </div>
              </section>

              <section className="quick-actions" style={{ marginTop: "36px" }}>
                <div className="dashboard-section-heading">
                  <h2>Quick Actions</h2>
                  <p>Choose what you would like to do next.</p>
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
            </>
          )}

          {(activeTab === "all" || activeTab === "ai" || activeTab === "manual") && (
            <section className="my-resumes-section">
              <div className="dashboard-section-heading resume-heading">
                <div>
                  <h2>
                    {activeTab === "all" && "All Resumes"}
                    {activeTab === "ai" && "AI & Saved Resumes"}
                    {activeTab === "manual" && "Manual Local Drafts"}
                  </h2>
                  <p>Manage, view, download or edit your resumes.</p>
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
                <div className="resume-list" style={{ marginTop: "1.5rem" }}>
                  {(activeTab === "all" ? filteredResumes : activeTab === "ai" ? savedResumes.filter(r => (r.title || "").toLowerCase().includes(search.toLowerCase())) : manualDrafts).length > 0 ? (
                    (activeTab === "all" ? filteredResumes : activeTab === "ai" ? savedResumes.filter(r => (r.title || "").toLowerCase().includes(search.toLowerCase())) : manualDrafts).map(renderResumeItem)
                  ) : (
                    <p className="empty-resumes">No resumes found in this section.</p>
                  )}
                </div>
              )}
            </section>
          )}

          {activeTab === "templates" && (
            <div className="dashboard-templates-wrapper">
              <Templates hideHeader={true} />
            </div>
          )}

          {activeTab === "profile" && (
            <section className="my-resumes-section" style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ width: "100%", maxWidth: "650px" }}>
                <div className="dashboard-section-heading">
                  <h2>User Profile Information</h2>
                  <p>Details associated with your ResumeAI account.</p>
                </div>

                <div className="action-card" style={{ padding: "2.5rem", marginTop: "1.5rem", boxShadow: "var(--shadow)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "2rem" }}>
                    <div
                      style={{
                        width: "70px",
                        height: "70px",
                        borderRadius: "50%",
                        background: "var(--primary, #635bff)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.8rem",
                        fontWeight: "bold",
                        flexShrink: 0,
                      }}
                    >
                      {(
                        user?.first_name?.[0] ||
                        user?.username?.[0] ||
                        user?.email?.[0] ||
                        "U"
                      ).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{ margin: "0 0 4px", fontSize: "1.4rem" }}>
                        {user?.first_name
                          ? `${user.first_name} ${user.last_name || ""}`.trim()
                          : user?.username || "My Account"}
                      </h3>
                      <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                        {user?.email || "No email available"}
                      </p>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1.2rem", display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.95rem" }}>
                    <p style={{ margin: 0 }}><strong>Username:</strong> {user?.username || "N/A"}</p>
                    <p style={{ margin: 0 }}><strong>Account Status:</strong> Active & Verified</p>
                  </div>

                  <button
                    type="button"
                    className="primary-btn"
                    onClick={handleLogout}
                    style={{ marginTop: "2rem", width: "100%", background: "#dc2626" }}
                  >
                    Logout from Account
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>

        <footer className="dashboard-footer" style={{ marginTop: "auto", padding: "1.5rem 0", textAlign: "center" }}>
          Build your story. Create your future. <span>ResumeAI</span>
        </footer>
      </main>

      {/* Modern Centered Delete Confirmation Modal */}
      {resumeToDelete && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
          onClick={() => !deleting && setResumeToDelete(null)}
        >
          <div
            style={{
              background: "var(--bg-card, #1e293b)",
              borderRadius: "16px",
              padding: "2rem",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              border: "1px solid var(--border-color, #334155)",
              textAlign: "center",
              animation: "scaleIn 0.2s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "#fee2e2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.8rem",
                margin: "0 auto 1.2rem",
              }}
            >
              🗑️
            </div>

            <h3 style={{ fontSize: "1.3rem", color: "var(--text-main, #f8fafc)", marginBottom: "0.5rem", fontWeight: "700" }}>
              Delete Resume?
            </h3>

            <p style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "0.95rem", lineHeight: "1.5", marginBottom: "1.8rem" }}>
              Are you sure you want to delete <strong style={{ color: "var(--primary, #a855f7)" }}>"{resumeToDelete.title}"</strong>? This action cannot be undone.
            </p>

            <div style={{ display: "flex", gap: "0.8rem", justifyContent: "center" }}>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setResumeToDelete(null)}
                style={{
                  flex: 1,
                  padding: "0.7rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color, #475569)",
                  background: "transparent",
                  color: "var(--text-main, #f8fafc)",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={confirmDeleteResume}
                style={{
                  flex: 1,
                  padding: "0.7rem 1rem",
                  borderRadius: "8px",
                  border: "none",
                  background: "#dc2626",
                  color: "#ffffff",
                  fontWeight: "600",
                  cursor: "pointer",
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;