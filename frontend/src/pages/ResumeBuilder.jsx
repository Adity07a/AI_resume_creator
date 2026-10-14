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
  { id: "classic", name: "ATS Classic", backendName: "ATS Classic" },
  { id: "professional", name: "Professional", backendName: "Professional" },
  { id: "modern", name: "Modern", backendName: "Modern" },
  { id: "minimal", name: "Minimal", backendName: "Minimal" },
  { id: "technical", name: "Technical", backendName: "Technical" },
  { id: "executive", name: "Executive", backendName: "Executive" },
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

  const resume = {
  id,
  title: `${form.name.trim() || "Untitled"} Resume`,
  updated: "Updated just now",
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
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  const bottomMargin = 18;
  let y = 20;

  const addText = (text, fontSize = 10, bold = false) => {
    if (!text || !String(text).trim()) return;

    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(fontSize);

    const lines = pdf.splitTextToSize(
      String(text),
      contentWidth
    );

    const lineHeight = fontSize * 0.45 + 2;

    lines.forEach((line) => {
      if (y + lineHeight > pageHeight - bottomMargin) {
        pdf.addPage();
        y = 20;
      }

      pdf.text(line, margin, y);
      y += lineHeight;
    });
  };

  const addSection = (title, content) => {
    if (!content || !String(content).trim()) return;

    y += 4;
    addText(title, 12, true);
    y += 1;
    addText(content, 10);
  };

  try {
    addText(form.name || "My Resume", 20, true);
    y += 2;

    const contact = [
      form.email,
      form.phone,
      form.address,
    ]
      .filter(Boolean)
      .join(" | ");

    addText(contact, 9);

    addSection("Professional Summary", form.summary);
    addSection("Education", form.education);
    addSection("Skills", form.skills);
    addSection("Projects", form.projects);
    addSection("Experience", form.experience);

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
          Back to Dashboard
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
            <div className="paper-header">
              <h1>{form.name || "Your Name"}</h1>
              <p>
                {[form.email, form.phone, form.address]
                  .filter(Boolean)
                  .join(" | ") || "Email | Phone | Location"}
              </p>
            </div>

            <div className="paper-section">
              <h3>PROFESSIONAL SUMMARY</h3>
              <p className="paper-content">
                {form.summary || "Your professional summary will appear here."}
              </p>
            </div>

            <div className="paper-section">
              <h3>EDUCATION</h3>
              <p className="paper-content">
                {form.education || "Add your degree and college details."}
              </p>
            </div>

            <div className="paper-section">
              <h3>TECHNICAL SKILLS</h3>
              <p className="paper-content">
                {form.skills || "Add your technical skills."}
              </p>
            </div>

            <div className="paper-section">
              <h3>PROJECTS</h3>
              <p className="paper-content">
                {form.projects || "Add your project details."}
              </p>
            </div>

            <div className="paper-section">
              <h3>EXPERIENCE</h3>
              <p className="paper-content">
                {form.experience || "Add your internship or work experience."}
              </p>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}

export default ResumeBuilder;