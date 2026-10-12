import { useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";

const initialResumes = [
  {
    id: 1,
    title: "Software Developer Resume",
    updated: "Updated today",
    status: "Draft",
  },
  {
    id: 2,
    title: "Python Developer Resume",
    updated: "Updated yesterday",
    status: "Draft",
  },
];

function Dashboard() {
  const [resumes, setResumes] = useState(initialResumes);
  const [search, setSearch] = useState("");

  function deleteResume(id) {
    const confirmed = window.confirm("Delete this resume?");
    if (confirmed) {
      setResumes((current) => current.filter((resume) => resume.id !== id));
    }
  }

  const filteredResumes = resumes.filter((resume) =>
    resume.title.toLowerCase().includes(search.toLowerCase())
  );

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
          <a href="#templates" className="sidebar-link">
            <span>▧</span> Templates
          </a>
          <a href="#settings" className="sidebar-link">
            <span>⚙</span> Settings
          </a>
        </nav>

        <div className="sidebar-bottom">
          <p>Ready for your next opportunity?</p>
          <span>Create a resume tailored to your dream job.</span>
          <Link to="/register" className="sidebar-upgrade">
            Get Started →
          </Link>
        </div>

        <Link to="/" className="sidebar-logout">
          ← Back to Home
        </Link>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <span className="dashboard-breadcrumb">Workspace / Dashboard</span>
            <h1>My Dashboard</h1>
          </div>
          <div className="dashboard-avatar">U</div>
        </header>

        <section className="dashboard-welcome">
          <div>
            <span className="welcome-label">YOUR CAREER, YOUR STORY</span>
            <h2>Welcome back!</h2>
            <p>
              Create a resume that highlights your strengths and helps you
              move toward your next opportunity.
            </p>
          </div>
          <Link to="/create-resume" className="primary-btn dashboard-create-btn">
            + Create New Resume
          </Link>
        </section>

        <section className="quick-actions">
          <div className="dashboard-section-heading">
            <h2>What would you like to do?</h2>
            <p>Choose your next step.</p>
          </div>

          <div className="action-grid">
            <Link to="/create-resume" className="action-card">
              <div className="action-icon purple-icon">✦</div>
              <h3>Create New Resume</h3>
              <p>Build a professional resume from scratch.</p>
              <span className="action-arrow">→</span>
            </Link>

            <Link to="/create-resume" className="action-card">
              <div className="action-icon blue-icon">↑</div>
              <h3>Upload Existing Resume</h3>
              <p>Start with your current resume and improve it.</p>
              <span className="action-arrow">→</span>
            </Link>

            <Link to="/create-resume" className="action-card">
              <div className="action-icon green-icon">◎</div>
              <h3>Tailor for a Job</h3>
              <p>Prepare your resume for a specific job description.</p>
              <span className="action-arrow">→</span>
            </Link>
          </div>
        </section>

        <section className="my-resumes-section" id="my-resumes">
          <div className="dashboard-section-heading resume-heading">
            <div>
              <h2>Recent Resumes</h2>
              <p>Your resume workspace.</p>
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

          <div className="resume-list">
            {filteredResumes.length > 0 ? (
              filteredResumes.map((resume) => (
                <article className="resume-item" key={resume.id}>
                  <div className="resume-file-icon">▤</div>
                  <div className="resume-item-info">
                    <h3>{resume.title}</h3>
                    <p>{resume.updated}</p>
                  </div>
                  <span className="resume-status">{resume.status}</span>
                  <div className="resume-item-actions">
                    <Link to="/create-resume">Edit</Link>
                    <button
                      type="button"
                      onClick={() => deleteResume(resume.id)}
                      aria-label={`Delete ${resume.title}`}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-resumes">
                No resumes found. Try another search or create a new resume.
              </p>
            )}
          </div>
        </section>

        <footer className="dashboard-footer">
          Build your story. Create your future. <span>ResumeAI</span>
        </footer>
      </main>
    </div>
  );
}

export default Dashboard;