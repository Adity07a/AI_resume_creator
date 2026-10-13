
import { Link, useNavigate } from "react-router-dom";
import "../App.css";

const templates = [
  {
    id: "classic",
    name: "Classic",
    description: "Simple and ATS-friendly layout",
    style: "classic",
  },
  {
    id: "professional",
    name: "Professional",
    description: "A polished corporate design",
    style: "professional",
  },
  {
    id: "modern",
    name: "Modern",
    description: "A contemporary professional look",
    style: "modern",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean layout with minimal styling",
    style: "minimal",
  },
  {
    id: "technical",
    name: "Technical",
    description: "Highlights skills and projects",
    style: "technical",
  },
  {
    id: "executive",
    name: "Executive",
    description: "An elegant, formal design",
    style: "executive",
  },
];

function Templates() {
  const navigate = useNavigate();

  function useTemplate(templateId) {
    navigate(`/resume-builder?template=${templateId}`);
  }

  return (
    <div className="templates-page">
      <header className="templates-header">
        <Link to="/dashboard" className="auth-logo">
          <span className="logo-icon">R</span>
          Resume<span className="logo-highlight">AI</span>
        </Link>

        <Link to="/dashboard" className="builder-back-link">
          ← Back to Dashboard
        </Link>
      </header>

      <main className="templates-main">
        <div className="templates-intro">
          <span className="welcome-label">MAKE IT YOURS</span>
          <h1>Choose Your Resume Template</h1>
          <p>
            Select a professional design for your resume.
            You can customize your details in the next step.
          </p>
        </div>

        <div className="templates-grid">
          {templates.map((template) => (
            <article className="template-card" key={template.id}>
              <div className={`template-preview ${template.style}`}>
                <div className="mini-resume">
                  <div className="mini-resume-header">
                    <div className="mini-name">YOUR NAME</div>
                    <div className="mini-contact">
                      email@example.com | Phone
                    </div>
                  </div>

                  <div className="mini-section">
                    <strong>PROFESSIONAL SUMMARY</strong>
                    <span />
                    <span />
                    <span className="short-line" />
                  </div>

                  <div className="mini-section">
                    <strong>EDUCATION</strong>
                    <span />
                    <span className="short-line" />
                  </div>

                  <div className="mini-section">
                    <strong>TECHNICAL SKILLS</strong>
                    <span />
                    <span />
                  </div>

                  <div className="mini-section">
                    <strong>PROJECTS</strong>
                    <span />
                    <span className="short-line" />
                  </div>

                  <div className="mini-section">
                    <strong>EXPERIENCE</strong>
                    <span />
                    <span className="short-line" />
                  </div>
                </div>
              </div>

              <div className="template-card-info">
                <div>
                  <h2>{template.name}</h2>
                  <p>{template.description}</p>
                </div>

                <button
                  type="button"
                  className="primary-btn template-use-btn"
                  onClick={() => useTemplate(template.id)}
                >
                  Use Template →
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}

export default Templates;
