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
   LANDING PAGE (Professional Redesign)
-------------------------------------------------- */

function LandingPage() {
  return (
    <div className="app modern-landing" id="home">
      <header className="navbar professional-navbar">
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

      <main className="landing-main">
        <section className="hero professional-hero">
          <div className="hero-content">
            <div className="announcement-badge">
              <span>✨</span> Next-Gen AI Career Platform
            </div>

            <h1>
              Craft Resumes That <br />
              <span className="gradient-text">Command Attention.</span>
            </h1>

            <p className="hero-description">
              Elevate your job search with intelligent, ATS-optimized resumes tailored instantly to your target roles. Built for professionals who value precision and impact.
            </p>

            <div className="hero-actions">
              <Link to="/register" className="primary-btn hero-btn glow-effect">
                Create My Resume →
              </Link>
              <a href="#features" className="secondary-btn sleek-btn">
                Explore Features
              </a>
            </div>

            <div className="hero-note">
              <span>✓ ATS Optimized</span> <span>•</span> <span>✓ Smart AI Rewrites</span> <span>•</span> <span>✓ Instant PDF Export</span>
            </div>
          </div>

          <div className="resume-visual professional-visual" aria-label="Sample resume preview">
            <div className="floating-card card-top">
              <span>✦</span> AI-Powered Optimization
            </div>

            <div className="resume-paper polished-paper">
              <div className="resume-header">
                <div className="avatar">JD</div>
                <div>
                  <h3>Jane Doe</h3>
                  <p>Senior Software Engineer</p>
                </div>
              </div>

              <div className="resume-contact">
                jane.doe@email.com · San Francisco, CA · LinkedIn · GitHub
              </div>

              <div className="resume-section">
                <h4>PROFESSIONAL SUMMARY</h4>
                <div className="line wide" />
                <div className="line" />
                <div className="line medium" />
              </div>

              <div className="resume-section">
                <h4>EXPERIENCE</h4>
                <strong>Lead Full Stack Developer</strong>
                <div className="line wide" />
                <div className="line medium" />
              </div>

              <div className="resume-section">
                <h4>TECHNICAL SKILLS</h4>
                <div className="skill-tags">
                  <span>Python</span>
                  <span>React</span>
                  <span>TypeScript</span>
                  <span>FastAPI</span>
                  <span>Docker</span>
                </div>
              </div>
            </div>

            <div className="floating-card card-bottom">
              <span>✓</span> Ready for Top-Tier Companies
            </div>
          </div>
        </section>

        <section className="features professional-features" id="features">
          <div className="section-heading">
            <span className="eyebrow">INTELLIGENT SUITE</span>
            <h2>Designed to get you hired faster.</h2>
            <p>
              Powerful tools built to streamline your application process from start to finish.
            </p>
          </div>

          <div className="feature-grid">
            <article className="feature-card polished-card">
              <div className="feature-icon purple">✦</div>
              <h3>AI-Powered Tailoring</h3>
              <p>
                Dynamically adapt your experience metrics and summaries to target precise job descriptions effortlessly.
              </p>
            </article>

            <article className="feature-card polished-card">
              <div className="feature-icon blue">▤</div>
              <h3>Recruiter-Approved Templates</h3>
              <p>
                Choose from layout structures specifically engineered to pass automated Applicant Tracking Systems (ATS).
              </p>
            </article>

            <article className="feature-card polished-card">
              <div className="feature-icon green">↗</div>
              <h3>Deep Gap Analysis</h3>
              <p>
                Identify missing keywords, skill mismatches, and experience gaps before submitting your application.
              </p>
            </article>
          </div>
        </section>

        <section className="how-it-works professional-cta-section" id="how-it-works">
          <div className="cta-box">
            <span className="eyebrow">SEAMLESS WORKFLOW</span>
            <h2>Ready to accelerate your career path?</h2>
            <p>
              Join ambitious professionals building standout resumes in minutes, not hours.
            </p>
            <Link to="/create-resume" className="primary-btn glow-effect">
              Start Building Your Resume →
            </Link>
          </div>
        </section>

        <footer className="professional-footer" id="about">
          <div className="footer-content">
            <Link to="/" className="logo" aria-label="Back to top">
              <span className="logo-icon">R</span>
              Resume<span className="logo-highlight">AI</span>
            </Link>
            <p>Build your professional story. Secure your future.</p>
          </div>
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
   SHARED WORKSPACE LAYOUT (Modern Refined Sidebar)
-------------------------------------------------- */

const workspaceNavigation = [
  { label: "Dashboard", path: "/dashboard", icon: "▦" },
  { label: "Create Resume", path: "/create-resume", icon: "＋" },
  { label: "Resume Builder", path: "/resume-builder", icon: "▤" },
  { label: "Job Description", path: "/job-description", icon: "◎" },
  { label: "Saved JD History", path: "/saved-jd-history", icon: "◷" },
  { label: "Templates", path: "/templates", icon: "❖" },
  { label: "Gap Analysis", path: "/analysis", icon: "▥" },
  { label: "Optimization", path: "/optimization", icon: "✦" },
  { label: "Profile", path: "/profile", icon: "♙" },
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
      if (refreshToken) {
        await apiRequest("/auth/logout/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh: refreshToken }),
        });
      }
    } catch (error) {
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
    <div className="dashboard-page workspace-shell sleek-shell">
      <aside className="dashboard-sidebar workspace-sidebar polished-sidebar">
        <div className="sidebar-top-brand">
          <Link to="/dashboard" className="auth-logo dashboard-logo">
            <span className="logo-icon">R</span>
            Resume<span className="logo-highlight">AI</span>
          </Link>
        </div>

        <p className="sidebar-label">WORKSPACE MENU</p>

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
                <span className="nav-icon-wrap" aria-hidden="true">{item.icon}</span>
                <span className="nav-text">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="workspace-sidebar-bottom">
          <button
            type="button"
            className="workspace-theme-button polished-theme-btn"
            onClick={() => setDarkMode((previous) => !previous)}
            aria-label={
              darkMode ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>

          <button
            type="button"
            className="sidebar-logout polished-logout-btn"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            ↪ {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>

      <main className="dashboard-main workspace-main polished-main">
        <header className="dashboard-topbar workspace-topbar polished-topbar">
          <div>
            <span className="dashboard-breadcrumb">
              Workspace / {currentPage}
            </span>
            <h1>{currentPage}</h1>
          </div>

          <Link
            to="/profile"
            className="workspace-profile-link refined-profile-badge"
            aria-label="Open profile"
            title="Open profile"
          >
            <span aria-hidden="true">♙</span>
            <span>My Profile</span>
          </Link>
        </header>

        <div className="workspace-page-content refined-content-area">{children}</div>
      </main>
    </div>
  );
}

/* --------------------------------------------------
   APP + THEME ROUTING
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

        {/* Public authentication and info pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/resend-verification" element={<ResendVerification />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/about" element={<About />} />

        {/* Dashboard keeps its structural integrity */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Workspace wrapped protected routes */}
        <Route path="/create-resume" element={withWorkspace(<CreateResume />)} />
        <Route path="/resume-builder" element={withWorkspace(<ResumeBuilder />)} />
        <Route path="/templates" element={withWorkspace(<Templates />)} />
        <Route path="/job-description" element={withWorkspace(<JobDescription />)} />
        <Route path="/optimization" element={withWorkspace(<OptimizationWorkspace />)} />
        <Route path="/analysis" element={withWorkspace(<GapAnalysis />)} />
        <Route path="/profile" element={withWorkspace(<Profile />)} />
        <Route path="/saved-jd-history" element={withWorkspace(<SavedJDHistory />)} />

        {/* Fallback routing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;