import { Link } from "react-router-dom";
import "../App.css";

function About() {
  return (
    <div className="about-page-wrapper" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top Header / Public Navigation Bar */}
      <header className="builder-header" style={{ padding: "1.2rem 5%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to="/" className="auth-logo builder-logo">
          <span className="logo-icon">R</span>
          Resume<span className="logo-highlight">AI</span>
        </Link>

        <nav style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          <Link to="/#features" style={{ textDecoration: "none", color: "var(--text-secondary)", fontWeight: 500 }}>
            Features
          </Link>
          <Link to="/#how-it-works" style={{ textDecoration: "none", color: "var(--text-secondary)", fontWeight: 500 }}>
            How it works
          </Link>
          <Link to="/about" style={{ textDecoration: "none", color: "var(--primary, #635bff)", fontWeight: 600 }}>
            About
          </Link>
        </nav>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link to="/login" style={{ textDecoration: "none", color: "var(--text-main)", fontWeight: 600 }}>
            Login
          </Link>
          <Link to="/register" className="primary-btn" style={{ padding: "0.5rem 1.2rem", fontSize: "0.9rem" }}>
            Get Started →
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "3rem 5%", maxWidth: "1200px", width: "100%", margin: "0 auto" }}>
        {/* Hero Banner */}
        <section className="dashboard-welcome" style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", padding: "3.5rem 2rem", marginBottom: "3rem" }}>
          <span className="welcome-label">ABOUT RESUME AI</span>
          
          <h1 style={{ fontSize: "2.6rem", margin: "1rem 0", color: "var(--text-main)", fontWeight: 800, lineHeight: "1.3" }}>
            Build Winning, ATS-Friendly Resumes Effortlessly
          </h1>
          
          <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", maxWidth: "780px", lineHeight: "1.6", margin: "0 auto 2rem" }}>
            ResumeAI is an intelligent platform designed to help developers and job seekers build, customize, and optimize their professional resumes to stand out to recruiters and pass ATS filters.
          </p>

          <Link to="/resume-builder" className="primary-btn dashboard-create-btn">
            + Start Building Your Resume →
          </Link>
        </section>

        {/* User Features Grid */}
        <section className="action-grid" style={{ marginBottom: "3rem" }}>
          <div className="action-card" style={{ cursor: "default" }}>
            <div className="action-icon purple-icon">✦</div>
            <h3 style={{ color: "var(--text-main)" }}>Smart Resume Builder</h3>
            <p style={{ color: "var(--text-secondary)" }}>
              Easily enter your experience, education, and skills with real-time live preview and structured inputs designed for fast editing.
            </p>
          </div>

          <div className="action-card" style={{ cursor: "default" }}>
            <div className="action-icon green-icon">◎</div>
            <h3 style={{ color: "var(--text-main)" }}>Job Description Tailoring</h3>
            <p style={{ color: "var(--text-secondary)" }}>
              Tailor your existing resume for specific job roles to highlight relevant technical skills, keywords, and qualifications recruiters look for.
            </p>
          </div>

          <div className="action-card" style={{ cursor: "default" }}>
            <div className="action-icon blue-icon">❖</div>
            <h3 style={{ color: "var(--text-main)" }}>Professional ATS Templates</h3>
            <p style={{ color: "var(--text-secondary)" }}>
              Choose from classic, professional, navy, burgundy, and compact template designs that parse smoothly through recruiter screening tools.
            </p>
          </div>
        </section>

        {/* Mission Banner */}
        <section className="action-card" style={{ padding: "2.5rem", cursor: "default", display: "flex", flexDirection: "column", gap: "1rem", borderLeft: "4px solid var(--primary, #635bff)" }}>
          <span className="sidebar-label" style={{ margin: 0 }}>OUR MISSION</span>
          <h2 style={{ fontSize: "1.8rem", margin: 0, color: "var(--text-main)" }}>Empowering Candidates for Career Success</h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: "1.7", fontSize: "1rem", margin: 0 }}>
            Whether you are a fresh graduate, intern, or experienced software developer, ResumeAI provides an end-to-end workspace to organize your achievements, generate clean PDFs, and apply with confidence.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="dashboard-footer" style={{ marginTop: "auto", padding: "1.8rem 0", textAlign: "center" }}>
        Build your story. Create your future. <span>ResumeAI</span>
      </footer>
    </div>
  );
}

export default About;