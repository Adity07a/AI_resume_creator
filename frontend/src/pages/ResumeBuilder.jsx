import jsPDF from "jspdf";
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "../App.css";

function ResumeBuilder() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    summary: "",
    education: "",
    skills: "",
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
  const templateFromUrl = searchParams.get("template");

  
 const validTemplates = [
  "classic",
  "professional",
  "modern",
  "minimal",
  "technical",
  "executive",
  "contemporary",
  "compact",
  "burgundy",
 ];


  if (validTemplates.includes(templateFromUrl)) {
    setSelectedTemplate(templateFromUrl);
  }

  const id = searchParams.get("id");

  if (!id) return;

  try {
    const savedResumes = JSON.parse(
      localStorage.getItem("resumeai-resumes") || "[]"
    );

    const existingResume = savedResumes.find(
      (resume) => String(resume.id) === id
    );

    if (existingResume?.data) {
      setForm(existingResume.data);
      setResumeId(existingResume.id);

      if (validTemplates.includes(existingResume.template)) {
        setSelectedTemplate(existingResume.template);
      }
    }
  } catch (error) {
    console.error("Failed to load resume:", error);
  }
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

  const email = extractedText.match(
    /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/
  )?.[0] || "";

  const phone = extractedText.match(
    /(?:\+?\d[\d\s()-]{8,}\d)/
  )?.[0]?.trim() || "";

  const sectionNames = [
    "Professional Summary",
    "Summary",
    "Education",
    "Skills",
    "Technical Skills",
    "Projects",
    "Experience",
    "Work Experience",
  ];

  const findSection = (names) => {
    const start = lines.findIndex((line) =>
      names.some((name) =>
        line.toLowerCase() === name.toLowerCase()
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

  const name = lines.find(
    (line) =>
      !line.includes("@") &&
      !/^\+?[\d\s()-]{10,}$/.test(line) &&
      !sectionNames.some(
        (section) => line.toLowerCase() === section.toLowerCase()
      )
  ) || "";

  setForm((previous) => ({
    ...previous,
    name,
    email,
    phone,
    summary: findSection(["Professional Summary", "Summary"]),
    education: findSection(["Education"]),
    skills: findSection(["Skills", "Technical Skills"]),
    projects: findSection(["Projects"]),
    experience: findSection(["Experience", "Work Experience"]),
  }));

  sessionStorage.removeItem("resumeai-imported-text");
}, [searchParams]);


function handleSave(event) {
  event.preventDefault();

  const savedResumes = JSON.parse(
    localStorage.getItem("resumeai-resumes") || "[]"
  );

  const id = resumeId ?? Date.now();

  
const existingResume = savedResumes.find(
  (item) => String(item.id) === String(id)
);

const baseTitle = `${form.name.trim() || "Untitled"} Resume`;

const sameNameCount = savedResumes.filter(
  (item) =>
    String(item.id) !== String(id) &&
    (item.data?.name || "").trim().toLowerCase() ===
      (form.name.trim() || "Untitled").toLowerCase()
).length;

const resume = {
  id,
  title: existingResume
    ? existingResume.title
    : sameNameCount > 0
      ? `${baseTitle} ${sameNameCount + 1}`
      : baseTitle,
  updated: new Date().toLocaleString(),
  status: "Draft",
  data: form,
  template: selectedTemplate,
};


  const existingIndex = savedResumes.findIndex(
    (item) => String(item.id) === String(id)
  );

  if (existingIndex >= 0) {
    savedResumes[existingIndex] = resume;
  } else {
    savedResumes.unshift(resume);
  }

  localStorage.setItem("resumeai-resumes", JSON.stringify(savedResumes));

  setResumeId(id);
  setSaveMessage("Resume saved successfully!");
}

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
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

    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(...color);

    const lines = pdf.splitTextToSize(String(value).trim(), width);
    const lineHeight = size * 0.45 + 1.5;

    lines.forEach((line) => {
      ensureSpace(lineHeight);
      pdf.text(line, x, y);
      y += lineHeight;
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
    pdf.line(contentX, y, contentX + contentWidth, y);
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

      // Sidebar text uses its own cursor so main content
      // can start independently on the right.
      let sideY = 20;

      function addSidebarText(value, heading = false) {
        if (!value || !String(value).trim()) return;

        const size = heading ? 9 : 8;

        pdf.setFont("helvetica", heading ? "bold" : "normal");
        pdf.setFontSize(size);
        pdf.setTextColor(255, 255, 255);

        const lines = pdf.splitTextToSize(String(value).trim(), sideWidth);

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

      if (form.skills.trim()) {
        sideY += 4;
        addSidebarText("SKILLS", true);
        addSidebarText(form.skills);
      }

      y = 20;
      addSection("Professional Summary", form.summary);
      addSection("Experience", form.experience);
      addSection("Education", form.education);
      addSection("Projects", form.projects);
    } else {
      addText(form.name || "Your Name", {
        size: selectedTemplate === "compact" ? 17 : 20,
        bold: true,
        color: theme.color,
        gap: 2,
      });

      const contact = [form.email, form.phone, form.address]
        .filter((item) => item.trim())
        .join(" | ");

      addText(contact, { size: 9, color: [85, 85, 85] });

      pdf.setDrawColor(...theme.color);
      pdf.setLineWidth(0.6);
      pdf.line(contentX, y, contentX + contentWidth, y);
      y += 4;

      addSection("Professional Summary", form.summary);
      addSection("Education", form.education);
      addSection("Technical Skills", form.skills);
      addSection("Projects", form.projects);
      addSection("Experience", form.experience);
    }

    const fileName = `${form.name.trim() || "My"}_Resume`
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
        <span className="builder-header-label">Resume Builder</span>
        <Link to="/dashboard" className="builder-back-link">
          ← Back to Dashboard
        </Link>
      </header>

      <div className="builder-layout">
        {/* LEFT SIDE: FORM */}
        <section className="builder-form-panel">
          <span className="welcome-label">LET'S BUILD YOUR FUTURE</span>
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
                placeholder="e.g. Ruchita Prajapat"
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
                placeholder="Degree, college name, passing year"
                rows={3}
              />
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
                placeholder="Project name and what you built"
                rows={4}
              />
            </div>

            <h2>Experience</h2>
            <div className="builder-field">
              <label htmlFor="experience">Internship or Work Experience</label>
              <textarea
                id="experience"
                name="experience"
                value={form.experience}
                onChange={handleChange}
                placeholder="Role, company, duration and responsibilities"
                rows={4}
              />
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
  {(selectedTemplate === "professional" ||
    selectedTemplate === "burgundy") ? (
    <div className="sidebar-resume">
      <aside className="resume-sidebar">
        <h1>{form.name.trim() || "Your Name"}</h1>

        <div className="sidebar-section">
          <h3>CONTACT</h3>
          <p>{form.email}</p>
          <p>{form.phone}</p>
          <p>{form.address}</p>
        </div>

        
     <div className="sidebar-section">
         <h3>SKILLS</h3>
        <p className="paper-content">
          {form.skills}
         </p>
     </div>

      </aside>

      <div className="resume-main-content">
        {form.summary.trim() && (
          <div className="paper-section">
            <h3>PROFESSIONAL SUMMARY</h3>
            <p className="paper-content">{form.summary}</p>
          </div>
        )}

        {form.experience.trim() && (
          <div className="paper-section">
            <h3>EXPERIENCE</h3>
            <p className="paper-content">{form.experience}</p>
          </div>
        )}

        {form.education.trim() && (
          <div className="paper-section">
            <h3>EDUCATION</h3>
            <p className="paper-content">{form.education}</p>
          </div>
        )}

        {form.projects.trim() && (
          <div className="paper-section">
            <h3>PROJECTS</h3>
            <p className="paper-content">{form.projects}</p>
          </div>
        )}
      </div>
    </div>
  ) : (
    <>
      <div className="paper-header">
        <h1>{form.name.trim() || "Your Name"}</h1>

        {[form.email, form.phone, form.address].some(
          (item) => item.trim()
        ) && (
          <p>
            {[form.email, form.phone, form.address]
              .filter((item) => item.trim())
              .join(" | ")}
          </p>
        )}
      </div>

      {[
        ["PROFESSIONAL SUMMARY", form.summary],
        ["EDUCATION", form.education],
        ["TECHNICAL SKILLS", form.skills],
        ["PROJECTS", form.projects],
        ["EXPERIENCE", form.experience],
      ].map(([title, content]) =>
        content.trim() ? (
          <div className="paper-section" key={title}>
            <h3>{title}</h3>
            <p className="paper-content">{content}</p>
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