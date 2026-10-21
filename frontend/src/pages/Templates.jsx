import { Link, useNavigate } from "react-router-dom";
import "../App.css";

const templates = [
  { id: "classic", name: "Classic ATS", description: "Simple, clean and ATS-friendly", style: "classic" },
  { id: "professional", name: "Navy Professional", description: "Professional navy sidebar design", style: "professional" },
  { id: "modern", name: "Modern ATS", description: "Modern design with subtle teal accents", style: "modern" },
  { id: "minimal", name: "Minimal ATS", description: "Minimal styling and easy readability", style: "minimal" },
  { id: "technical", name: "Technical ATS", description: "Clean layout for technical professionals", style: "technical" },
  { id: "executive", name: "Executive ATS", description: "Formal and elegant resume layout", style: "executive" },
  { id: "contemporary", name: "Contemporary ATS", description: "Modern typography with subtle purple accents", style: "contemporary" },
  { id: "compact", name: "Compact ATS", description: "Space-efficient, single-column layout", style: "compact" },
  { id: "burgundy", name: "Burgundy Professional", description: "Professional burgundy sidebar design", style: "burgundy" },
];

function Templates({ hideHeader = false }) {
  const navigate = useNavigate();

  function useTemplate(templateId) {
    navigate(`/resume-builder?template=${templateId}`);
  }

  return (
    <div className="templates-page" style={hideHeader ? { background: "transparent" } : {}}>
      {!hideHeader && (
        <header className="templates-header">
          <Link to="/dashboard" className="auth-logo">
            <span className="logo-icon">R</span>
            Resume<span className="logo-highlight">AI</span>
          </Link>

          <Link to="/dashboard" className="builder-back-link">
            ← Back to Dashboard
          </Link>
        </header>
      )}

      <main className="templates-main" style={hideHeader ? { padding: "10px 2%" } : undefined}>
        {!hideHeader && (
          <div className="templates-intro">
            <span className="welcome-label">MAKE IT YOURS</span>
            <h1>Choose Your Resume Template</h1>
            <p>
              Choose a professional design for your resume.
              You can customize your details in the next step.
            </p>
          </div>
        )}

        <div className="templates-grid">
          {templates.map((template) => (
            <article className="template-card" key={template.id}>
              <div className={`template-preview ${template.style}`}>
                {template.id === "professional" ||
                template.id === "burgundy" ? (
                  <div className="mini-sidebar-resume">
                    <div className="mini-colored-sidebar">
                      <div className="mini-name">YOUR NAME</div>
                      <strong>CONTACT</strong>
                      <span />
                      <span />
                      <strong>SKILLS</strong>
                      <span />
                      <span />
                      <span />
                    </div>

                    <div className="mini-sidebar-content">
                      <strong>PROFESSIONAL SUMMARY</strong>
                      <span />
                      <span />
                      <strong>EXPERIENCE</strong>
                      <span />
                      <span />
                      <strong>EDUCATION</strong>
                      <span />
                    </div>
                  </div>
                ) : (
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
                )}
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