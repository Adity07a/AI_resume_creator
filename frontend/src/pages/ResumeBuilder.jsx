import jsPDF from "jspdf";
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "../App.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");

const FIELDS = [
  "name",
  "email",
  "phone",
  "address",
  "github",
  "linkedin",
  "summary",
  "experience",
  "projects",
  "skills",
  "education",
  "certifications",
];

const EMPTY_FORM = Object.fromEntries(FIELDS.map((field) => [field, ""]));

const TEMPLATES = [
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
          return item.name || item.skill || item.text || "";
        }

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
    return typeof value.text === "string" ? value.text : "";
  }

  return "";
}

function getEditorDataFromVersion(version) {
  const data = { ...EMPTY_FORM };

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
      case "EXPERIENCE":
        data.experience = sectionToText(content, type);
        break;
      case "PROJECTS":
        data.projects = sectionToText(content, type);
        break;
      case "SKILLS":
        data.skills = sectionToText(content, type);
        break;
      case "EDUCATION":
        data.education = sectionToText(content, type);
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
          )?.url ||
          "";

        data.linkedin =
          data.linkedin ||
          links.find((item) =>
            String(item?.name || item?.type || "")
              .toLowerCase().includes("linkedin")
          )?.url ||
          "";
        break;
      }

      default:
        break;
    }
  }

  return data;
}

function ResumeBuilder() {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const [resumeId, setResumeId] = useState(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [creationMode, setCreationMode] = useState("manual");

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function loadResume() {
      const templateFromUrl = searchParams.get("template");
      const id = searchParams.get("id");
      const isAiMode = searchParams.get("mode") === "ai" || searchParams.get("ai") === "1";

      if (isAiMode) {
        setCreationMode("ai");
      }

      if (TEMPLATES.some((item) => item.id === templateFromUrl)) {
        setSelectedTemplate(templateFromUrl);
      }

      if (!id) {
        setResumeId(null);
        return;
      }

      const cachedResume = getStoredResumes().find(
        (resume) => String(resume.id) === String(id)
      );

      if (cachedResume) {
        if (cachedResume.creation_mode) {
          setCreationMode(cachedResume.creation_mode);
        } else if (cachedResume.is_ai) {
          setCreationMode("ai");
        }
      }

      if (cachedResume?.data) {
        setForm((previous) => ({
          ...previous,
          ...cachedResume.data,
        }));

        if (
          TEMPLATES.some(
            (item) => item.id === cachedResume.template
          )
        ) {
          setSelectedTemplate(cachedResume.template);
        }
      }

      setResumeId(id);

      if (!/^\d+$/.test(String(id))) {
        setSaveMessage(
          cachedResume
            ? ""
            : "This local draft was not found in browser storage."
        );
        return;
      }

      const token = getAccessToken();

      if (!token) {
        setSaveMessage(
          "Please log in to load this resume from the server."
        );
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/resumes/${encodeURIComponent(id)}/`,
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

        const mergedData = {
          ...serverData,
          github: serverData.github || cachedResume?.data?.github || "",
          linkedin: serverData.linkedin || cachedResume?.data?.linkedin || "",
          certifications:
            serverData.certifications ||
            cachedResume?.data?.certifications ||
            "",
        };

        if (cancelled) return;

        setForm((previous) => ({
          ...previous,
          ...mergedData,
        }));

        setResumeId(resume.id);

        if (resume.creation_mode) {
          setCreationMode(resume.creation_mode);
        } else if (resume.is_ai) {
          setCreationMode("ai");
        }

        const backendTemplate = currentVersion.template_name;
        const matchedTemplate = TEMPLATES.find(
          (item) =>
            item.backendName === backendTemplate ||
            item.id === backendTemplate
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
    if (searchParams.get("import") !== "1") return;

    setCreationMode("ai");

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
      "Experience",
      "Work Experience",
      "Projects",
      "Skills",
      "Technical Skills",
      "Education",
      "Certifications",
      "Certificates",
    ];

    const findSection = (names) => {
      const start = lines.findIndex((line) =>
        names.some(
          (name) => line.toLowerCase() === name.toLowerCase()
        )
      );

      if (start === -1) return "";

      const content = [];

      for (let i = start + 1; i < lines.length; i++) {
        if (
          sectionNames.some(
            (name) => lines[i].toLowerCase() === name.toLowerCase()
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
      summary: findSection(["Professional Summary", "Summary"]),
      experience: findSection(["Experience", "Work Experience"]),
      projects: findSection(["Projects"]),
      skills: findSection(["Skills", "Technical Skills"]),
      education: findSection(["Education"]),
      certifications: findSection(["Certifications", "Certificates"]),
    }));

    sessionStorage.removeItem("resumeai-imported-text");
  }, [searchParams]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaveMessage("");

    const token = getAccessToken();

    if (!token) {
      setSaveMessage("Please log in before saving your resume.");
      return;
    }

    setSaving(true);

    try {
      const savedResumes = getStoredResumes();

      const existingResume = savedResumes.find(
        (item) => String(item.id) === String(resumeId)
      );

      const isServerResumeId = /^\d+$/.test(
        String(resumeId ?? "")
      );

      const baseName = form.name.trim() || "Untitled";
      const baseTitle = `${baseName} Resume`;

      const sameNameCount = savedResumes.filter(
        (item) =>
          String(item.id) !== String(resumeId) &&
          (item.data?.name || "").trim().toLowerCase() ===
            baseName.toLowerCase()
      ).length;

      const title = existingResume
        ? existingResume.title
        : sameNameCount > 0
          ? `${baseTitle} ${sameNameCount + 1}`
          : baseTitle;

      const backendData = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        github: form.github,
        linkedin: form.linkedin,
        summary: form.summary,
        experience: form.experience,
        projects: form.projects,
        skills: form.skills,
        education: form.education,
        certificate: form.certifications,
      };

      const response = await fetch(
        `${API_BASE_URL}/resumes/save-editor/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...(isServerResumeId ? { id: Number(resumeId) } : {}),
            title,
            creation_mode: creationMode,
            is_ai: creationMode === "ai",
            template:
              TEMPLATES.find((item) => item.id === selectedTemplate)
                ?.backendName || "Classic ATS",
            data: backendData,
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

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

      const id = result.id ?? resumeId;

      if (id == null) {
        throw new Error(
          "The server did not return a resume ID. Please check the backend response."
        );
      }

      const resume = {
        ...existingResume,
        id,
        title: result.title || title,
        updated: result.updated || new Date().toISOString(),
        status: "Saved",
        creation_mode: creationMode,
        is_ai: creationMode === "ai",
        data: { ...form },
        template: selectedTemplate,
        version_id: result.version_id,
        version_number: result.version_number,
        serverBacked: true,
      };

      const updatedResumes = savedResumes.filter(
        (item) =>
          String(item.id) !== String(id) &&
          (
            resumeId == null ||
            String(item.id) !== String(resumeId)
          )
      );

      updatedResumes.unshift(resume);

      localStorage.setItem(
        "resumeai-resumes",
        JSON.stringify(updatedResumes)
      );

      setResumeId(id);
      setSaveMessage("Resume saved successfully!");

      const params = new URLSearchParams(searchParams);
      params.set("id", String(id));
      params.set("template", selectedTemplate);

      navigate(
        { search: `?${params.toString()}` },
        { replace: true }
      );
    } catch (error) {
      setSaveMessage(error.message || "Could not save your resume.");
    } finally {
      setSaving(false);
    }
  }

  function renderFormattedText(value) {
    if (!value?.trim()) return null;

    return value.split("\n").map((line, index) => {
      const isHeading = line.trim().startsWith("# ");
      const text = isHeading ? line.trim().slice(2) : line;

      return (
        <span key={index}>
          {isHeading ? <strong>{text}</strong> : text}
          {index < value.split("\n").length - 1 && <br />}
        </span>
      );
    });
  }

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
    try {
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
      const margin = 14;
      const contentX = theme.sidebar ? sidebarWidth + 8 : margin;
      const contentWidth = pageWidth - contentX - margin;
      const bottomMargin = 14;
      let y = 16;

      function drawSidebar() {
        if (!theme.sidebar) return;
        pdf.setFillColor(...theme.color);
        pdf.rect(0, 0, sidebarWidth, pageHeight, "F");
      }

      function newPage() {
        pdf.addPage();
        drawSidebar();
        y = 16;
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
          size = 9.5,
          bold = false,
          color = [45, 45, 45],
          gap = 1,
          url = null,
        } = options;

        const lines = String(value).split("\n");
        const lineHeight = size * 0.42 + 1.2;

        lines.forEach((line) => {
          const isHeading = line.trim().startsWith("# ");
          const displayLine = isHeading ? line.trim().slice(2) : line;

          if (!displayLine.trim()) {
            y += 1.5;
            return;
          }

          pdf.setFont(
            "helvetica",
            bold || isHeading ? "bold" : "normal"
          );
          pdf.setFontSize(size);
          pdf.setTextColor(...color);

          const wrappedLines = pdf.splitTextToSize(displayLine, width);

          wrappedLines.forEach((wrappedLine) => {
            ensureSpace(lineHeight);
            pdf.text(wrappedLine, x, y);

            if (url) {
              const textWidth = pdf.getTextWidth(wrappedLine);
              pdf.link(x, y - size * 0.35, textWidth, lineHeight, { url });
            }

            y += lineHeight;
          });
        });

        y += gap;
      }

      function addSection(title, value) {
        if (!value || !String(value).trim()) return;

        ensureSpace(12);
        y += 2;

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10.5);
        pdf.setTextColor(...theme.color);
        pdf.text(title.toUpperCase(), contentX, y);

        y += 1.5;
        pdf.setDrawColor(...theme.color);
        pdf.setLineWidth(0.35);
        pdf.line(contentX, y, contentX + contentWidth, y);
        y += 3.5;

        let displayValue = String(value);

        if (title.toUpperCase().includes("SKILLS")) {
          displayValue = displayValue
            .split(/[\n,]/)
            .map((item) => item.trim())
            .filter(Boolean)
            .join(", ");
        }

        addText(displayValue, {
          size: selectedTemplate === "compact" ? 8.5 : 9.5,
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

          const size = heading ? 9 : 8;
          pdf.setFont("helvetica", heading ? "bold" : "normal");
          pdf.setFontSize(size);
          pdf.setTextColor(255, 255, 255);

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

            pdf.text(line, sideX, sideY);
            if (url) {
              const textWidth = pdf.getTextWidth(line);
              pdf.link(sideX, sideY - size * 0.35, textWidth, 4, { url });
            }
            sideY += 3.5;
          });

          sideY += 1.5;
        }

        addSidebarText(form.name || "Your Name", true);
        sideY += 3;
        addSidebarText("CONTACT", true);
        addSidebarText(form.email);
        addSidebarText(form.phone);
        addSidebarText(form.address);

        if (form.github.trim()) {
          addSidebarText("GitHub", false, form.github.trim());
        }
        if (form.linkedin.trim()) {
          addSidebarText("LinkedIn", false, form.linkedin.trim());
        }

        if (form.skills.trim()) {
          sideY += 3;
          addSidebarText("SKILLS", true);
          addSidebarText(form.skills);
        }

        y = 16;
        addSection("Professional Summary", form.summary);
        addSection("Experience", form.experience);
        addSection("Projects", form.projects);
        addSection("Technical Skills", form.skills);
        addSection("Education", form.education);
        addSection("Certifications", form.certifications);
      } else {
        addText(form.name || "Your Name", {
          size: selectedTemplate === "compact" ? 16 : 18,
          bold: true,
          color: theme.color,
          gap: 1.5,
        });

        const contactParts = [
          form.email,
          form.phone,
          form.address,
        ].filter((item) => item?.trim());

        if (contactParts.length > 0) {
          addText(contactParts.join(" | "), { size: 8.5, color: [85, 85, 85] });
        }

        if (form.github.trim() || form.linkedin.trim()) {
          if (form.github.trim()) {
            addText("GitHub", { size: 8.5, color: [37, 99, 235], url: form.github.trim() });
          }
          if (form.linkedin.trim()) {
            addText("LinkedIn", { size: 8.5, color: [37, 99, 235], url: form.linkedin.trim() });
          }
        }

        pdf.setDrawColor(...theme.color);
        pdf.setLineWidth(0.5);
        pdf.line(contentX, y, contentX + contentWidth, y);
        y += 3;

        addSection("Professional Summary", form.summary);
        addSection("Experience", form.experience);
        addSection("Projects", form.projects);
        addSection("Technical Skills", form.skills);
        addSection("Education", form.education);
        addSection("Certifications", form.certifications);
      }

      const fileName = `${form.name.trim() || "My"}_Resume`
        .replace(/[<>:"/\\|?*]/g, "")
        .replace(/\s+/g, "_");

      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      console.error("PDF download failed:", error);
      window.alert("Could not generate the PDF. Please try again.");
    }
  }

  const sectionFields = [
    {
      title: "Professional Summary",
      label: "About You",
      name: "summary",
      placeholder: "Write a short professional introduction...",
      rows: 4,
    },
    {
      title: "Experience",
      label: "Internship or Work Experience",
      name: "experience",
      placeholder:
        "# Python Developer Intern — Company Name\nDuration: 5 months\n- Developed REST APIs using Django.",
      rows: 4,
      hint: "Start the role heading with # to make it bold.",
    },
    {
      title: "Projects",
      label: "Project Details",
      name: "projects",
      placeholder:
        "# AI Resume Creator\nBuilt a resume builder using React.\n# Student Training Portal\nDeveloped a student portal using Django.",
      rows: 4,
      hint: "Start each project title with # to make it bold.",
    },
    {
      title: "Technical Skills",
      label: "Your Skills",
      name: "skills",
      placeholder: "Python, Java, SQL, React...",
      rows: 3,
    },
    {
      title: "Education",
      label: "Degree and College",
      name: "education",
      placeholder: "# B.Tech in Computer Science\nCollege name, passing year",
      rows: 3,
      hint: "Start a heading with # to make it bold.",
    },
    {
      title: "Certifications",
      label: "Certifications and Courses",
      name: "certifications",
      placeholder:
        "# Python Certification — Issuer\nCompletion date\n# AWS Cloud Practitioner\nCompletion date",
      rows: 3,
      hint: "Start each certification heading with # to make it bold.",
    },
  ];

  return (
    <div className="builder-page">
      <header className="builder-header">
        <Link to="/dashboard" className="auth-logo builder-logo">
          <span className="logo-icon">R</span>
          Resume<span className="logo-highlight">AI</span>
        </Link>

        <span className="builder-header-label">Resume Builder</span>

        <Link to="/dashboard" className="builder-back-link">
          ← Back to Dashboard
        </Link>
      </header>

      <div className="builder-layout">
        <section className="builder-form-panel">
          <span className="welcome-label">LET'S BUILD YOUR FUTURE</span>
          <h1>{resumeId ? "Edit Your Resume" : "Create Your Resume"}</h1>

          <p className="builder-description">
            Add your details and see your resume update in the live preview.
          </p>

          <form className="builder-form" onSubmit={handleSave}>
            <h2>Personal Details</h2>

            {[
              {
                name: "name",
                label: "Full Name",
                placeholder: "e.g. Your Full Name",
              },
              {
                name: "email",
                label: "Email Address",
                type: "email",
                placeholder: "you@example.com",
              },
              {
                name: "phone",
                label: "Phone Number",
                placeholder: "Enter your phone number",
              },
              {
                name: "address",
                label: "Location",
                placeholder: "City, State",
              },
              {
                name: "github",
                label: "GitHub Profile URL",
                type: "url",
                placeholder: "https://github.com/username",
              },
              {
                name: "linkedin",
                label: "LinkedIn Profile URL",
                type: "url",
                placeholder: "https://linkedin.com/in/username",
              },
            ].map((field) => (
              <div className="builder-field" key={field.name}>
                <label htmlFor={field.name}>{field.label}</label>
                <input
                  id={field.name}
                  name={field.name}
                  type={field.type || "text"}
                  value={form[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                />
              </div>
            ))}

            {sectionFields.map((field) => (
              <section key={field.name}>
                <h2>{field.title}</h2>
                <div className="builder-field">
                  <label htmlFor={field.name}>{field.label}</label>
                  <textarea
                    id={field.name}
                    name={field.name}
                    value={form[field.name]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    rows={field.rows}
                  />
                  {field.hint && <small>{field.hint}</small>}
                </div>
              </section>
            ))}

            <div className="builder-save-actions">
              <button
                type="submit"
                className="primary-btn"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Resume"}
              </button>

              {saveMessage && (
                <p role="status" className="save-message">
                  {saveMessage}
                </p>
              )}
            </div>
          </form>
        </section>

        <section className="builder-preview-panel">
          <div className="template-selector">
            <h2>Choose a Resume Template</h2>
            <p>Select a design for your resume preview.</p>

            <div className="template-options">
              {TEMPLATES.map((template) => (
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
                  {[
                    ["PROFESSIONAL SUMMARY", form.summary],
                    ["EXPERIENCE", form.experience],
                    ["PROJECTS", form.projects],
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