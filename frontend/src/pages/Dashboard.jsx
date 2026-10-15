import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");

function getSavedResumes() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("resumeai-resumes") || "[]"
    );
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function getAccessToken() {
  return (
    localStorage.getItem("resumeai-access-token") ||
    sessionStorage.getItem("resumeai-access-token")
  );
}

// Convert backend resume objects into a consistent UI-friendly shape.
function normalizeResume(resume) {
  const versions = Array.isArray(resume.versions)
    ? resume.versions
    : [];

  const currentVersion =
    versions.find((version) => version.is_current) ||
    versions[versions.length - 1] ||
    null;

  const sections = currentVersion?.sections || [];

  // Keep structured backend sections available for the editor integration.
  const data = Array.isArray(sections)
    ? sections.reduce((result, section) => {
        if (section?.section_type) {
          result[section.section_type] = section.content;
        }
        return result;
      }, {})
    : sections;

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
  };
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString();
}

function Dashboard() {
  const [resumes, setResumes] = useState(() => getSavedResumes());
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [search, setSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function fetchResumes() {
      const token = getAccessToken();

      if (!token) {
        if (!cancelled) {
          setResumeError("Please log in to view your saved resumes.");
        }
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

        const normalizedResumes = backendResumes.map(normalizeResume);

        if (!cancelled) {
          setResumes(normalizedResumes);

          // Cache the backend list for the existing UI and offline fallback.
          localStorage.setItem(
            "resumeai-resumes",
            JSON.stringify(normalizedResumes)
          );
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

  const getUserDetails = () => {
    try {
      return JSON.parse(
        localStorage.getItem("resumeai-user") || "null"
      );
    } catch {
      return null;
    }
  };

  const user = getUserDetails();

  function handleLogout() {
    localStorage.removeItem("resumeai-access-token");
    localStorage.removeItem("resumeai-refresh-token");

    sessionStorage.removeItem("resumeai-access-token");
    sessionStorage.removeItem("resumeai-refresh-token");

    localStorage.removeItem("resumeai-user");

    navigate("/login", { replace: true });
  }

  async function deleteResume(id) {
    const confirmed = window.confirm("Delete this resume?");

    if (!confirmed) return;

    const token = getAccessToken();

    if (!token) {
      setResumeError("Please log in again to delete this resume.");
      return;
    }

    setResumeError("");

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

      // Update the UI only after the backend confirms deletion.
      setResumes((current) => {
        const updated = current.filter(
          (resume) => String(resume.id) !== String(id)
        );

        localStorage.setItem(
          "resumeai-resumes",
          JSON.stringify(updated)
        );

        return updated;
      });
    } catch (err) {
      setResumeError(err.message);
    }
  }

  const filteredResumes = resumes.filter((resume) =>
    (resume.title || "")
      .toLowerCase()
      .includes(search.toLowerCase())
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
          <Link to="/templates" className="sidebar-link">
            <span>▧</span> Templates
          </Link>
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
                  onClick={() => setProfileOpen(false)}
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

          {resumeError && (
            <p role="alert" className="form-error">
              {resumeError}
            </p>
          )}

          <div className="resume-list">
            {loadingResumes ? (
              <p className="empty-resumes">Loading your resumes...</p>
            ) : filteredResumes.length > 0 ? (
              filteredResumes.map((resume) => (
                <article className="resume-item" key={resume.id}>
                  <div className="resume-file-icon">▤</div>

                  <div className="resume-item-info">
                    <h3>{resume.title}</h3>
                    <p>
                      Last updated: {formatDate(resume.updated)}
                    </p>
                    <p className="resume-template-label">
                      Template:{" "}
                      {typeof resume.template === "string"
                        ? resume.template.charAt(0).toUpperCase() +
                          resume.template.slice(1)
                        : "Classic"}
                    </p>
                  </div>

                  <span className="resume-status">
                    {resume.status || "Saved"}
                  </span>

                  <div className="resume-item-actions">
                    <Link to={`/resume-builder?id=${resume.id}`}>
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
              ))
            ) : (
              <p className="empty-resumes">
                {resumeError
                  ? "Unable to load resumes. Please resolve the issue above and try again."
                  : search
                    ? "No resumes match your search. Try another search."
                    : "No resumes found. Create a new resume to get started."}
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