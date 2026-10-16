import jsPDF from "jspdf";
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "../App.css";


const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");

function getAccessToken() {
  return (
    localStorage.getItem("resumeai-access-token") ||
    sessionStorage.getItem("resumeai-access-token")
  );
}

function getStoredResumes() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("resumeai-resumes") || "[]"
    );
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}


function sectionToText(value, type = "") {
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

        if (type === "SKILLS") {
          return item.name || item.skill || "";
        }

        if (type === "EDUCATION") {
          return [
            item.degree,
            item.institution,
            item.location,
            [item.start_date, item.end_date].filter(Boolean).join(" - "),
            item.grade,
          ].filter(Boolean).join(", ");
        }

        if (type === "PROJECTS") {
          return [
            item.name,
            item.description,
            Array.isArray(item.technologies)
              ? item.technologies.join(", ")
              : "",
          ].filter(Boolean).join("\n");
        }

        if (type === "EXPERIENCE") {
          return [
            item.job_title,
            item.company,
            item.location,
            [item.start_date, item.end_date].filter(Boolean).join(" - "),
            ...(Array.isArray(item.responsibilities)
              ? item.responsibilities
              : []),
          ].filter(Boolean).join("\n");
        }

        if (type === "CERTIFICATIONS") {
          return [
            item.name,
            item.title,
            item.issuer,
            item.date,
          ].filter(Boolean).join(" — ");
        }

        return item.text || item.name || item.title || "";
      })
      .filter(Boolean)
      .join("\n\n");
  }

  if (typeof value === "object") {
    if (typeof value.text === "string") return value.text;
    return "";
  }

  return "";
}

function getEditorDataFromVersion(version) {
  const data = {
    name: "",
    email: "",
    phone: "",
    address: "",
    github: "",
    linkedin: "",
    summary: "",
    education: "",
    skills: "",
    certifications: "",
    projects: "",
    experience: "",
  };

  for (const section of version?.sections || []) {
    const content = section.content || {};
    const type = section.section_type;

    switch (type) {
      case "CUSTOM": {
        const info = content.personal_info || content;
        data.name = info.full_name || info.name || data.name;
        data.email = info.email || data.email;
        data.phone = info.phone || data.phone;
        data.address = info.location || info.address || data.address;
        data.github = info.github || data.github;
        data.linkedin = info.linkedin || data.linkedin;
        break;
      }

      case "SUMMARY":
        data.summary = sectionToText(content, type);
        break;
      case "EDUCATION":
        data.education = sectionToText(content, type);
        break;
      case "SKILLS":
        data.skills = sectionToText(content, type);
        break;
      case "PROJECTS":
        data.projects = sectionToText(content, type);
        break;
      case "EXPERIENCE":
        data.experience = sectionToText(content, type);
        break;
      case "CERTIFICATIONS":
        data.certifications = sectionToText(content, type);
        break;

      case "LINKS": {
        const links = Array.isArray(content) ? content : [];
        data.github =
          data.github ||
          links.find((item) =>
            String(item?.name || item?.type || "")
              .toLowerCase().includes("github")
          )?.url || "";
        data.linkedin =
          data.linkedin ||
          links.find((item) =>
            String(item?.name || item?.type || "")
              .toLowerCase().includes("linkedin")
          )?.url || "";
        break;
      }

      default:
        break;
    }
  }

  return data;
}


function ResumeBuilder() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    github: "",
    linkedin: "",
    summary: "",
    education: "",
    skills: "",
    certifications: "",
    projects: "",
    experience: "",
  });

  const [selectedTemplate, setSelectedTemplate] = useState("classic");

  const templates = [
    { id: "classic", name: "Classic ATS", backendName: "Classic ATS" },
    { id: "professional", name: "Navy Professional", backendName: "Navy Professional" },
    { id: "modern", name: "Modern ATS", backendName: "Modern ATS" },
    { id: "minimal", name: "Minimal ATS", backendName: "Minimal ATS" },
    { id: "technical", name: "Technical ATS", backendName: "Technical ATS" },
    { id: "executive", name: "Executive ATS", backendName: "Executive ATS" },
    { id: "contemporary", name: "Contemporary ATS", backendName: "Contemporary ATS" },
    { id: "compact", name: "Compact ATS", backendName: "Compact ATS" },
    { id: "burgundy", name: "Burgundy Professional", backendName: "Burgundy Professional" },
  ];

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [resumeId, setResumeId] = useState(null);
  const [saveMessage, setSaveMessage] = useState("");

  
useEffect(() => {
  let cancelled = false;

  async function loadResume() {
    const validTemplates = templates.map((template) => template.id);
    const templateFromUrl = searchParams.get("template");
    const id = searchParams.get("id");

    if (validTemplates.includes(templateFromUrl)) {
      setSelectedTemplate(templateFromUrl);
    }

    if (!id) return;

    const savedResumes = getStoredResumes();
    const cachedResume = savedResumes.find(
      (resume) => String(resume.id) === id
    );

    // Local cache keeps fields that the current backend endpoint
    // does not yet support, such as GitHub, LinkedIn and certifications.
    if (cachedResume?.data) {
      setForm((previous) => ({
        ...previous,
        ...cachedResume.data,
      }));
    }

    const token = getAccessToken();

    if (!token) {
      if (!cancelled) {
        setSaveMessage(
          "Please log in to load this resume from the server."
        );
      }
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/resumes/${id}/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Your session has expired. Please log in again."
            : "Could not load this resume from the server."
        );
      }

      const resume = await response.json();

      const versions = Array.isArray(resume.versions)
        ? resume.versions
        : [];

      const currentVersion =
        versions.find((version) => version.is_current) ||
        versions[0];

      if (!currentVersion) {
        throw new Error("No saved version was found for this resume.");
      }

      const serverData = getEditorDataFromVersion(currentVersion);

      // Keep cached unsupported fields, but use the server's saved
      // values for fields supported by the backend.
      
   const mergedData = {
  ...serverData,
  ...Object.fromEntries(
    ["github", "linkedin", "certifications"].map((field) => [
      field,
      serverData[field] || cachedResume?.data?.[field] || "",
    ])
   ),
 };

      if (cancelled) return;

      setForm((previous) => ({
        ...previous,
        ...mergedData,
      }));

      setResumeId(resume.id);

      const backendTemplate = currentVersion.template_name;
      const matchedTemplate = templates.find(
        (template) =>
          template.backendName === backendTemplate ||
          template.id === backendTemplate
      );

      if (matchedTemplate) {
        setSelectedTemplate(matchedTemplate.id);
      }

      setSaveMessage("");
    } catch (error) {
      if (!cancelled) {
        setSaveMessage(error.message);
      }
    }
  }

  loadResume();

  return () => {
    cancelled = true;
  };
}, [searchParams]);


  useEffect(() => {
    const isImport = searchParams.get("import");

    if (isImport !== "1") return;

    const extractedText = sessionStorage.getItem(
      "resumeai-imported-text"
    );

    if (!extractedText) return;

    const lines = extractedText
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const email =
      extractedText.match(
        /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/
      )?.[0] || "";

    const phone =
      extractedText.match(
        /(?:\+?\d[\d\s()-]{8,}\d)/
      )?.[0]?.trim() || "";

    const github =
      extractedText.match(
        /https?:\/\/(?:www\.)?github\.com\/[^\s]+/i
      )?.[0] || "";

    const linkedin =
      extractedText.match(
        /https?:\/\/(?:www\.)?linkedin\.com\/[^\s]+/i
      )?.[0] || "";

    const sectionNames = [
      "Professional Summary",
      "Summary",
      "Education",
      "Skills",
      "Technical Skills",
      "Projects",
      "Experience",
      "Work Experience",
      "Certifications",
      "Certificates",
    ];

    const findSection = (names) => {
      const start = lines.findIndex((line) =>
        names.some(
          (name) =>
            line.toLowerCase() === name.toLowerCase()
        )
      );

      if (start === -1) return "";

      const content = [];

      for (let i = start + 1; i < lines.length; i++) {
        if (
          sectionNames.some(
            (name) =>
              lines[i].toLowerCase() === name.toLowerCase()
          )
        ) {
          break;
        }

        content.push(lines[i]);
      }

      return content.join("\n");
    };

    const name =
      lines.find(
        (line) =>
          !line.includes("@") &&
          !/^\+?[\d\s()-]{10,}$/.test(line) &&
          !/^https?:\/\//i.test(line) &&
          !sectionNames.some(
            (section) =>
              line.toLowerCase() === section.toLowerCase()
          )
      ) || "";

    setForm((previous) => ({
      ...previous,
      name,
      email,
      phone,
      github,
      linkedin,
      summary: findSection([
        "Professional Summary",
        "Summary",
      ]),
      education: findSection(["Education"]),
      skills: findSection([
        "Skills",
        "Technical Skills",
      ]),
      projects: findSection(["Projects"]),
      experience: findSection([
        "Experience",
        "Work Experience",
      ]),
      certifications: findSection([
        "Certifications",
        "Certificates",
      ]),
    }));

    sessionStorage.removeItem("resumeai-imported-text");
  }, [searchParams]);

 
async function handleSave(event) {
  event.preventDefault();
  setSaveMessage("");

  const token = getAccessToken();

  if (!token) {
    setSaveMessage("Please log in before saving your resume.");
    return;
  }

  const savedResumes = getStoredResumes();

  const existingResume = savedResumes.find(
    (item) => String(item.id) === String(resumeId)
  );

  const baseTitle = `${form.name.trim() || "Untitled"} Resume`;

  const sameNameCount = savedResumes.filter(
    (item) =>
      String(item.id) !== String(resumeId) &&
      (item.data?.name || "").trim().toLowerCase() ===
        (form.name.trim() || "Untitled").toLowerCase()
  ).length;

  const title = existingResume
    ? existingResume.title
    : sameNameCount > 0
      ? `${baseTitle} ${sameNameCount + 1}`
      : baseTitle;

  // The current Django save-editor endpoint accepts these fields only.
  const backendData = {
    name: form.name,
    email: form.email,
    phone: form.phone,
    address: form.address,
    summary: form.summary,
    education: form.education,
    skills: form.skills,
    projects: form.projects,
    experience: form.experience,
  };

  try {
    const response = await fetch(
      `${API_BASE_URL}/resumes/save-editor/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(resumeId ? { id: resumeId } : {}),
          title,
          template:
            templates.find((item) => item.id === selectedTemplate)
              ?.backendName || "Classic ATS",
          data: backendData,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      const message =
        result.detail ||
        Object.entries(result)
          .map(([key, value]) =>
            `${key}: ${
              Array.isArray(value) ? value.join(" ") : String(value)
            }`
          )
          .join(" ");

      throw new Error(message || "Could not save your resume.");
    }

    const id = result.id;

    // Preserve the complete form in the existing browser cache.
    // Unsupported fields will need a backend update for permanent storage.
    const resume = {
      id,
      title: result.title || title,
      updated: result.updated || new Date().toISOString(),
      status: "Saved",
      data: form,
      template: selectedTemplate,
      version_id: result.version_id,
      version_number: result.version_number,
    };

    const existingIndex = savedResumes.findIndex(
      (item) => String(item.id) === String(id)
    );

    if (existingIndex >= 0) {
      savedResumes[existingIndex] = resume;
    } else {
      savedResumes.unshift(resume);
    }

    localStorage.setItem(
      "resumeai-resumes",
      JSON.stringify(savedResumes)
    );

    setResumeId(id);
    setSaveMessage("Resume saved successfully!");
  } catch (error) {
    setSaveMessage(error.message);
  }
}

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // Lines starting with "# " are displayed in bold.
  function renderFormattedText(value) {
    if (!value?.trim()) return null;

    const lines = value.split("\n");

    return lines.map((line, index) => {
      const isHeading = line.trim().startsWith("# ");
      const text = isHeading
        ? line.trim().slice(2)
        : line;

      return (
        <span key={index}>
          {isHeading ? <strong>{text}</strong> : text}
          {index < lines.length - 1 && <br />}
        </span>
      );
    });
  }

  // Display short social labels instead of long URLs.
  function renderSocialLinks() {
    return (
      <>
        {form.github.trim() && (
          <a
            href={form.github.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="resume-social-link"
          >
            GitHub
          </a>
        )}

        {form.linkedin.trim() && (
          <a
            href={form.linkedin.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="resume-social-link"
          >
            LinkedIn
          </a>
        )}
      </>
    );
  }

  function handleDownloadPDF() {
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

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

    const theme = themes[selectedTemplate] || themes.classic;
    const sidebarWidth = theme.sidebar ? 58 : 0;
    const margin = 16;
    const contentX = theme.sidebar ? sidebarWidth + 8 : margin;
    const contentWidth = pageWidth - contentX - margin;
    const bottomMargin = 16;

    let y = 20;

    function drawSidebar() {
      if (!theme.sidebar) return;

      pdf.setFillColor(...theme.color);
      pdf.rect(0, 0, sidebarWidth, pageHeight, "F");
    }

    function newPage() {
      pdf.addPage();
      drawSidebar();
      y = 20;
    }

    function ensureSpace(height) {
      if (y + height > pageHeight - bottomMargin) {
        newPage();
      }
    }

    function addText(value, options = {}) {
      if (!value || !String(value).trim()) return;

      const {
        x = contentX,
        width = contentWidth,
        size = 10,
        bold = false,
        color = [45, 45, 45],
        gap = 1.5,
      } = options;

      const lines = String(value).split("\n");
      const lineHeight = size * 0.45 + 1.5;

      lines.forEach((line) => {
        const isHeading = line.trim().startsWith("# ");
        const displayLine = isHeading
          ? line.trim().slice(2)
          : line;

        if (!displayLine.trim()) {
          y += lineHeight;
          return;
        }

        pdf.setFont(
          "helvetica",
          bold || isHeading ? "bold" : "normal"
        );
        pdf.setFontSize(size);
        pdf.setTextColor(...color);

        const wrappedLines = pdf.splitTextToSize(
          displayLine,
          width
        );

        wrappedLines.forEach((wrappedLine) => {
          ensureSpace(lineHeight);
          pdf.text(wrappedLine, x, y);
          y += lineHeight;
        });
      });

      y += gap;
    }

    function addSection(title, value) {
      if (!value || !String(value).trim()) return;

      y += 3;
      ensureSpace(10);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(...theme.color);
      pdf.text(title.toUpperCase(), contentX, y);

      y += 2;
      pdf.setDrawColor(...theme.color);
      pdf.setLineWidth(0.35);
      pdf.line(
        contentX,
        y,
        contentX + contentWidth,
        y
      );
      y += 5;

      addText(value, {
        size: selectedTemplate === "compact" ? 9 : 10,
        gap: 1,
      });
    }

    try {
      drawSidebar();

      if (theme.sidebar) {
        const sideX = 7;
        const sideWidth = sidebarWidth - 14;
        let sideY = 20;

        function addSidebarText(value, heading = false) {
          if (!value || !String(value).trim()) return;

          const size = heading ? 9 : 8;

          pdf.setFont(
            "helvetica",
            heading ? "bold" : "normal"
          );
          pdf.setFontSize(size);
          pdf.setTextColor(255, 255, 255);

          const lines = pdf.splitTextToSize(
            String(value).trim(),
            sideWidth
          );

          lines.forEach((line) => {
            if (sideY + 5 > pageHeight - bottomMargin) {
              pdf.addPage();
              drawSidebar();
              sideY = 20;
            }

            pdf.text(line, sideX, sideY);
            sideY += 4;
          });

          sideY += 2;
        }

        addSidebarText(form.name || "Your Name", true);
        sideY += 4;
        addSidebarText("CONTACT", true);
        addSidebarText(form.email);
        addSidebarText(form.phone);
        addSidebarText(form.address);

        // Keep URLs hidden; show short labels in the PDF.
        if (form.github.trim() || form.linkedin.trim()) {
          sideY += 2;
          addSidebarText(
            [
              form.github.trim() ? "GitHub" : "",
              form.linkedin.trim() ? "LinkedIn" : "",
            ].filter(Boolean).join(" | ")
          );
        }

        if (form.skills.trim()) {
          sideY += 4;
          addSidebarText("SKILLS", true);
          addSidebarText(form.skills);
        }

        y = 20;
        addSection("Professional Summary", form.summary);
        addSection("Experience", form.experience);
        addSection("Projects", form.projects);
        addSection("Education", form.education);
        addSection("Certifications", form.certifications);
      } else {
        addText(form.name || "Your Name", {
          size: selectedTemplate === "compact" ? 17 : 20,
          bold: true,
          color: theme.color,
          gap: 2,
        });

        const contact = [
          form.email,
          form.phone,
          form.address,
          form.github.trim() ? "GitHub" : "",
          form.linkedin.trim() ? "LinkedIn" : "",
        ]
          .filter((item) => item?.trim())
          .join(" | ");

        addText(contact, {
          size: 9,
          color: [85, 85, 85],
        });

        pdf.setDrawColor(...theme.color);
        pdf.setLineWidth(0.6);
        pdf.line(
          contentX,
          y,
          contentX + contentWidth,
          y
        );
        y += 4;

        addSection("Professional Summary", form.summary);
        addSection("Education", form.education);
        addSection("Technical Skills", form.skills);
        addSection("Projects", form.projects);
        addSection("Experience", form.experience);
        addSection("Certifications", form.certifications);
      }

      const fileName = `${
        form.name.trim() || "My"
      }_Resume`
        .replace(/[<>:"/\\|?*]/g, "")
        .replace(/\s+/g, "_");

      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      console.error("PDF download failed:", error);
      alert("Could not generate the PDF. Please try again.");
    }
  }

  return (
    <div className="builder-page">
      <header className="builder-header">
        <Link to="/dashboard" className="auth-logo builder-logo">
          <span className="logo-icon">R</span>
          Resume<span className="logo-highlight">AI</span>
        </Link>

        <span className="builder-header-label">
          Resume Builder
        </span>

        <Link to="/dashboard" className="builder-back-link">
          ← Back to Dashboard
        </Link>
      </header>

      <div className="builder-layout">
        {/* LEFT SIDE: FORM */}
        <section className="builder-form-panel">
          <span className="welcome-label">
            LET'S BUILD YOUR FUTURE
          </span>

          <h1>Create Your Resume</h1>

          <p className="builder-description">
            Enter your details. Your resume preview will update automatically.
          </p>

          <form className="builder-form" onSubmit={handleSave}>
            <h2>Personal Details</h2>

            <div className="builder-field">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Your Full Name"
              />
            </div>

            <div className="builder-field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
              />
            </div>

            <div className="builder-field">
              <label htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
              />
            </div>

            <div className="builder-field">
              <label htmlFor="address">Location</label>
              <input
                id="address"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="City, State"
              />
            </div>

            <div className="builder-field">
              <label htmlFor="github">GitHub Profile URL</label>
              <input
                id="github"
                name="github"
                type="url"
                value={form.github}
                onChange={handleChange}
                placeholder="https://github.com/username"
              />
            </div>

            <div className="builder-field">
              <label htmlFor="linkedin">LinkedIn Profile URL</label>
              <input
                id="linkedin"
                name="linkedin"
                type="url"
                value={form.linkedin}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/username"
              />
            </div>

            <h2>Professional Summary</h2>

            <div className="builder-field">
              <label htmlFor="summary">About You</label>
              <textarea
                id="summary"
                name="summary"
                value={form.summary}
                onChange={handleChange}
                placeholder="Write a short professional introduction..."
                rows={4}
              />
            </div>

            <h2>Education</h2>

            <div className="builder-field">
              <label htmlFor="education">Degree and College</label>
              <textarea
                id="education"
                name="education"
                value={form.education}
                onChange={handleChange}
                placeholder={"# B.Tech in Computer Science\nCollege name, passing year"}
                rows={3}
              />
              <small>Start a heading with # to make it bold.</small>
            </div>

            <h2>Technical Skills</h2>

            <div className="builder-field">
              <label htmlFor="skills">Your Skills</label>
              <textarea
                id="skills"
                name="skills"
                value={form.skills}
                onChange={handleChange}
                placeholder="Python, Java, SQL, React..."
                rows={3}
              />
            </div>

            <h2>Projects</h2>

            <div className="builder-field">
              <label htmlFor="projects">Project Details</label>
              <textarea
                id="projects"
                name="projects"
                value={form.projects}
                onChange={handleChange}
                placeholder={"# AI Resume Creator\nBuilt a resume builder using React.\n# Student Training Portal\nDeveloped a student portal using Django."}
                rows={4}
              />
              <small>Start each project title with # to make it bold.</small>
            </div>

            <h2>Experience</h2>

            <div className="builder-field">
              <label htmlFor="experience">
                Internship or Work Experience
              </label>
              <textarea
                id="experience"
                name="experience"
                value={form.experience}
                onChange={handleChange}
                placeholder={"# Python Developer Intern — Company Name\nDuration: 5 months\n- Developed REST APIs using Django."}
                rows={4}
              />
              <small>Start the role heading with # to make it bold.</small>
            </div>

            <h2>Certifications</h2>

            <div className="builder-field">
              <label htmlFor="certifications">
                Certifications and Courses
              </label>
              <textarea
                id="certifications"
                name="certifications"
                value={form.certifications}
                onChange={handleChange}
                placeholder={"# Python Certification — Issuer\nCompletion date\n# AWS Cloud Practitioner\nCompletion date"}
                rows={3}
              />
              <small>Start each certification heading with # to make it bold.</small>
            </div>

            <div className="builder-save-actions">
              <button type="submit" className="primary-btn">
                Save Resume
              </button>

              {saveMessage && (
                <p role="status" className="save-message">
                  {saveMessage}
                </p>
              )}
            </div>
          </form>
        </section>

        {/* RIGHT SIDE: LIVE PREVIEW */}
        <section className="builder-preview-panel">
          <div className="template-selector">
            <h2>Choose a Resume Template</h2>
            <p>Select a design for your resume preview.</p>

            <div className="template-options">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={`template-option ${
                    selectedTemplate === template.id ? "active" : ""
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                  aria-pressed={selectedTemplate === template.id}
                >
                  {template.name}
                  {selectedTemplate === template.id && " ✓"}
                </button>
              ))}
            </div>
          </div>

          <div className="preview-heading">
            <div>
              <h2>Live Preview</h2>
              <p>Your resume updates as you type.</p>
            </div>
            <span className="preview-status">Live</span>
          </div>

          <button
            type="button"
            className="primary-btn download-resume-btn"
            onClick={handleDownloadPDF}
          >
            Download Resume as PDF
          </button>

          <article className={`resume-paper template-${selectedTemplate}`}>
            {selectedTemplate === "professional" ||
            selectedTemplate === "burgundy" ? (
              <div className="sidebar-resume">
                <aside className="resume-sidebar">
                  <h1>{form.name.trim() || "Your Name"}</h1>

                  <div className="sidebar-section">
                    <h3>CONTACT</h3>
                    {form.email && <p>{form.email}</p>}
                    {form.phone && <p>{form.phone}</p>}
                    {form.address && <p>{form.address}</p>}

                    <div className="resume-social-links">
                      {renderSocialLinks()}
                    </div>
                  </div>

                  {form.skills.trim() && (
                    <div className="sidebar-section">
                      <h3>SKILLS</h3>
                      <p className="paper-content">
                        {renderFormattedText(form.skills)}
                      </p>
                    </div>
                  )}
                </aside>

                <div className="resume-main-content">
                  {form.summary.trim() && (
                    <div className="paper-section">
                      <h3>PROFESSIONAL SUMMARY</h3>
                      <p className="paper-content">
                        {renderFormattedText(form.summary)}
                      </p>
                    </div>
                  )}

                  {form.experience.trim() && (
                    <div className="paper-section">
                      <h3>EXPERIENCE</h3>
                      <p className="paper-content">
                        {renderFormattedText(form.experience)}
                      </p>
                    </div>
                  )}

                  {form.projects.trim() && (
                    <div className="paper-section">
                      <h3>PROJECTS</h3>
                      <p className="paper-content">
                        {renderFormattedText(form.projects)}
                      </p>
                    </div>
                  )}
                   
                  {form.education.trim() && (
                    <div className="paper-section">
                      <h3>EDUCATION</h3>
                      <p className="paper-content">
                        {renderFormattedText(form.education)}
                      </p>
                    </div>
                  )}

                  {form.certifications.trim() && (
                    <div className="paper-section">
                      <h3>CERTIFICATIONS</h3>
                      <p className="paper-content">
                        {renderFormattedText(form.certifications)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="paper-header">
                  <h1>{form.name.trim() || "Your Name"}</h1>

                  {[
                    form.email,
                    form.phone,
                    form.address,
                  ].some((item) => item.trim()) && (
                    <p>
                      {[
                        form.email,
                        form.phone,
                        form.address,
                      ]
                        .filter((item) => item.trim())
                        .join(" | ")}
                    </p>
                  )}

                  <div className="resume-social-links">
                    {renderSocialLinks()}
                  </div>
                </div>

                {[
                  ["PROFESSIONAL SUMMARY", form.summary],
                  ["EXPERIENCE", form.experience],
                  ["PROJECTS", form.projects],
                  ["TECHNICAL SKILLS", form.skills],
                  ["EDUCATION", form.education],
                  ["CERTIFICATIONS", form.certifications],
                ].map(([title, content]) =>
                  content.trim() ? (
                    <div className="paper-section" key={title}>
                      <h3>{title}</h3>
                      <p className="paper-content">
                        {renderFormattedText(content)}
                      </p>
                    </div>
                  ) : null
                )}
              </>
            )}
          </article>
        </section>
      </div>
    </div>
  );
}

export default ResumeBuilder;
