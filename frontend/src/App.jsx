
import {
  Link,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useState, useEffect } from "react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CreateResume from "./pages/CreateResume";
import ResumeBuilder from "./pages/ResumeBuilder";
import Templates from "./pages/Templates";
import JobDescription from "./pages/JobDescription";
import VerifyEmail from "./pages/VerifyEmail";
import ResendVerification from "./pages/ResendVerification";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import OptimizationWorkspace from "./pages/OptimizationWorkspace";
import GapAnalysis from "./pages/GapAnalysis";
import Profile from "./pages/Profile";
import SavedJDHistory from "./pages/SavedJDHistory";
import About from "./pages/About";
import { apiRequest } from "./services/api";

import "./App.css";

/* --------------------------------------------------
   LANDING PAGE
-------------------------------------------------- */

function LandingPage() {
  return (
    <div className="app" id="home">
      <header className="navbar">
        <Link to="/" className="logo" aria-label="ResumeAI home">
          <span className="logo-icon">R</span>
          Resume<span className="logo-highlight">AI</span>
        </Link>

        <nav className="nav-links" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <Link to="/about">About</Link>
        </nav>

        <div className="nav-actions">
          <Link to="/login" className="login-btn">
            Login
          </Link>
          <Link to="/register" className="primary-btn">
            Get Started →
          </Link>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <div className="announcement">
              ✨ Your career journey starts here
            </div>

            <h1>
              Build a Resume That
              <br />
              <span>Gets You Noticed.</span>
            </h1>

            <p className="hero-description">
              Create professional, ATS-friendly resumes tailored to your
              dream job with the power of AI. Your experience, your story,
              your next opportunity.
            </p>

            <div className="hero-actions">
              <Link to="/register" className="primary-btn hero-btn">
                Create My Resume →
              </Link>
              <a href="#features" className="secondary-btn">
                Explore Features
              </a>
            </div>

            <div className="hero-note">
              ✓ Easy to use <span>•</span> ✓ Professional templates
              <span>•</span> ✓ Your experience stays truthful
            </div>
          </div>

          <div className="resume-visual" aria-label="Sample resume preview">
            <div className="floating-card card-top">
              <span>✦</span> AI-powered writing
            </div>

            <div className="resume-paper">
              <div className="resume-header">
                <div className="avatar">JD</div>
                <div>
                  <h3>Jane Doe</h3>
                  <p>Software Developer</p>
                </div>
              </div>

              <div className="resume-contact">
                jane.doe@email.com · LinkedIn · GitHub
              </div>

              <div className="resume-section">
                <h4>PROFESSIONAL SUMMARY</h4>
                <div className="line wide" />
                <div className="line" />
                <div className="line medium" />
              </div>

              <div className="resume-section">
                <h4>EXPERIENCE</h4>
                <strong>Software Developer</strong>
                <div className="line wide" />
                <div className="line medium" />
              </div>

              <div className="resume-section">
                <h4>PROJECTS</h4>
                <strong>Web Application Development</strong>
                <div className="line wide" />
                <div className="line medium" />
              </div>

              <div className="resume-section">
                <h4>TECHNICAL SKILLS</h4>
                <div className="skill-tags">
                  <span>Python</span>
                  <span>React</span>
                  <span>SQL</span>
                  <span>REST APIs</span>
                </div>
              </div>

              <div className="resume-section">
                <h4>EDUCATION</h4>
                <strong>Bachelor's Degree</strong>
                <div className="line medium" />
              </div>

              <div className="resume-section">
                <h4>CERTIFICATIONS</h4>
                <div className="line medium" />
              </div>
            </div>

            <div className="floating-card card-bottom">
              <span>✓</span> Resume ready to shine
            </div>
          </div>
        </section>

        <section className="features" id="features">
          <div className="section-heading">
            <span className="eyebrow">WHY RESUME AI?</span>
            <h2>Your next opportunity starts with you.</h2>
            <p>
              Everything you need to create your next professional resume.
            </p>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-icon purple">✦</div>
              <h3>AI-Powered Resumes</h3>
              <p>
                Tailor your genuine experience to match your target job
                description.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon blue">▤</div>
              <h3>Professional Templates</h3>
              <p>
                Choose clean, modern and ATS-friendly resume designs.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon green">↗</div>
              <h3>Job-Focused Content</h3>
              <p>
                Highlight relevant skills, projects and experience for each
                opportunity.
              </p>
            </article>
          </div>
        </section>

        <section className="how-it-works" id="how-it-works">
          <span className="eyebrow">SIMPLE PROCESS</span>
          <h2>From your story to your next opportunity.</h2>
          <p>
            Start with your existing resume or build one from scratch. Add a
            job description, customize your resume and preview your final
            design.
          </p>
          <Link to="/create-resume" className="primary-btn">
            Start Building Your Resume →
          </Link>
        </section>

        <footer id="about">
          <Link to="/" className="logo" aria-label="Back to top">
            <span className="logo-icon">R</span>
            Resume<span className="logo-highlight">AI</span>
          </Link>
          <p>Build your story. Create your future.</p>
        </footer>
      </main>
    </div>
  );
}

export { LandingPage };

/* --------------------------------------------------
   AUTHENTICATION GUARD
-------------------------------------------------- */

function ProtectedRoute({ children }) {
  const accessToken =
    localStorage.getItem("resumeai-access-token") ||
    sessionStorage.getItem("resumeai-access-token");

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/* --------------------------------------------------
   SHARED WORKSPACE LAYOUT

   Dashboard keeps its own existing sidebar.
   Other protected pages use this shared sidebar.
-------------------------------------------------- */

const workspaceNavigation = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: "▦",
  },
  {
    label: "Create Resume",
    path: "/create-resume",
    icon: "＋",
  },
  {
    label: "Resume Builder",
    path: "/resume-builder",
    icon: "▤",
  },
  {
    label: "Job Description",
    path: "/job-description",
    icon: "◎",
  },
  {
    label: "Saved JD History",
    path: "/saved-jd-history",
    icon: "◷",
  },
  {
    label: "Templates",
    path: "/templates",
    icon: "❖",
  },
  {
    label: "Gap Analysis",
    path: "/analysis",
    icon: "▥",
  },
  {
    label: "Optimization",
    path: "/optimization",
    icon: "✦",
  },
  {
    label: "Profile",
    path: "/profile",
    icon: "♙",
  },
];

function WorkspaceLayout({ children, darkMode, setDarkMode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const currentPage =
    workspaceNavigation.find((item) => {
      if (item.path === "/create-resume") {
        return location.pathname === "/create-resume";
      }

      return location.pathname === item.path;
    })?.label || "ResumeAI Workspace";

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    const refreshToken =
      localStorage.getItem("resumeai-refresh-token") ||
      sessionStorage.getItem("resumeai-refresh-token");

    try {
      await apiRequest("/auth/logout/", {
        method: "POST",
        body: JSON.stringify({
          refresh: refreshToken,
        }),
      });
    } catch (error) {
      // Clear the local session even if the server logout request fails.
      console.error("Logout request failed:", error);
    } finally {
      localStorage.removeItem("resumeai-access-token");
      localStorage.removeItem("resumeai-refresh-token");
      sessionStorage.removeItem("resumeai-access-token");
      sessionStorage.removeItem("resumeai-refresh-token");
      localStorage.removeItem("resumeai-user");
      sessionStorage.removeItem("resumeai-user");

      setLoggingOut(false);
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="dashboard-page workspace-shell">
      <aside className="dashboard-sidebar workspace-sidebar">
        <Link to="/dashboard" className="auth-logo dashboard-logo">
          <span className="logo-icon">R</span>
          Resume<span className="logo-highlight">AI</span>
        </Link>

        <p className="sidebar-label">WORKSPACE</p>

        <nav className="sidebar-nav" aria-label="Workspace navigation">
          {workspaceNavigation.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path === "/resume-builder" &&
                location.pathname.startsWith("/resume-builder/"));

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-link ${isActive ? "active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="workspace-sidebar-bottom">
          <button
            type="button"
            className="workspace-theme-button"
            onClick={() => setDarkMode((previous) => !previous)}
            aria-label={
              darkMode ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>

          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            ↪ {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>

      <main className="dashboard-main workspace-main">
        <header className="dashboard-topbar workspace-topbar">
          <div>
            <span className="dashboard-breadcrumb">ResumeAI / Workspace</span>
            <h1>{currentPage}</h1>
          </div>

          <Link
            to="/profile"
            className="workspace-profile-link"
            aria-label="Open profile"
            title="Open profile"
          >
            <span aria-hidden="true">♙</span>
            <span>My Profile</span>
          </Link>
        </header>

        <div className="workspace-page-content">{children}</div>
      </main>
    </div>
  );
}

/* --------------------------------------------------
   APP + THEME
-------------------------------------------------- */

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("resumeai-theme") === "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      darkMode ? "dark" : "light"
    );

    localStorage.setItem("resumeai-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const withWorkspace = (page) => (
    <ProtectedRoute>
      <WorkspaceLayout darkMode={darkMode} setDarkMode={setDarkMode}>
        {page}
      </WorkspaceLayout>
    </ProtectedRoute>
  );

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* Public authentication and information pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route
          path="/resend-verification"
          element={<ResendVerification />}
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/about" element={<About />} />

        {/* Dashboard keeps its current internal navigation and UI */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* All other protected pages share the workspace sidebar */}
        <Route
          path="/create-resume"
          element={withWorkspace(<CreateResume />)}
        />
        <Route
          path="/resume-builder"
          element={withWorkspace(<ResumeBuilder />)}
        />
        <Route
          path="/templates"
          element={withWorkspace(<Templates />)}
        />
        <Route
          path="/job-description"
          element={withWorkspace(<JobDescription />)}
        />
        <Route
          path="/optimization"
          element={withWorkspace(<OptimizationWorkspace />)}
        />
        <Route
          path="/analysis"
          element={withWorkspace(<GapAnalysis />)}
        />
        <Route
          path="/profile"
          element={withWorkspace(<Profile />)}
        />
        <Route
          path="/saved-jd-history"
          element={withWorkspace(<SavedJDHistory />)}
        />

        {/* Keep unknown URLs from rendering a blank page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
