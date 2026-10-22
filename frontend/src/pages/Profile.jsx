import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../App.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");

function getAccessToken() {
  return (
    localStorage.getItem("resumeai-access-token") ||
    sessionStorage.getItem("resumeai-access-token")
  );
}

function Profile() {
  const [activeTab, setActiveTab] = useState("personal");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [personal, setPersonal] = useState({
    full_name: "",
    headline: "",
    summary: "",
    email: "",
    phone: "",
    location: "",
    github: "",
    linkedin: "",
    portfolio: "",
  });

  const [experiences, setExperiences] = useState([
    {
      company: "",
      role: "",
      location: "",
      start_date: "",
      end_date: "",
      currently_working: false,
      description: "",
      achievements: "",
      technologies: "",
    },
  ]);

  const [projects, setProjects] = useState([
    { name: "", description: "", technologies: "", link: "" },
  ]);

  const [skills, setSkills] = useState({
    backend: "",
    frontend: "",
    cloud: "",
    ai: "",
    tools: "",
  });

  const [education, setEducation] = useState([
    { institution: "", degree: "", location: "", start_date: "", end_date: "", grade: "" },
  ]);

  useEffect(() => {
    async function fetchProfile() {
      const token = getAccessToken();
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE_URL}/profile/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.personal) setPersonal((prev) => ({ ...prev, ...data.personal }));
          if (Array.isArray(data.experiences) && data.experiences.length) setExperiences(data.experiences);
          if (Array.isArray(data.projects) && data.projects.length) setProjects(data.projects);
          if (data.skills) setSkills((prev) => ({ ...prev, ...data.skills }));
          if (Array.isArray(data.education) && data.education.length) setEducation(data.education);
        }
      } catch (err) {
        console.warn("Could not load canonical profile from server:", err);
      }
    }

    fetchProfile();
  }, []);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const token = getAccessToken();
    const payload = { personal, experiences, projects, skills, education };

    try {
      if (token) {
        await fetch(`${API_BASE_URL}/profile/`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      localStorage.setItem("resumeai-canonical-profile", JSON.stringify(payload));
      setMessage("Profile updated successfully!");
    } catch (err) {
      setMessage("Saved locally! Server sync pending.");
    } finally {
      setSaving(false);
    }
  }

  // Helper functions to manage dynamic list items
  const addExperience = () =>
    setExperiences([
      ...experiences,
      { company: "", role: "", location: "", start_date: "", end_date: "", currently_working: false, description: "", achievements: "", technologies: "" },
    ]);

  const removeExperience = (index) =>
    setExperiences(experiences.filter((_, i) => i !== index));

  const addProject = () =>
    setProjects([...projects, { name: "", description: "", technologies: "", link: "" }]);

  const removeProject = (index) =>
    setProjects(projects.filter((_, i) => i !== index));

  return (
    <div className="builder-page">
      <header className="builder-header">
        <Link to="/dashboard" className="auth-logo builder-logo">
          <span className="logo-icon">R</span>
          Resume<span className="logo-highlight">AI</span>
        </Link>
        <span className="builder-header-label">Canonical Profile Builder</span>
        <Link to="/dashboard" className="builder-back-link">
          ← Back to Dashboard
        </Link>
      </header>

      <div className="builder-layout" style={{ display: "block", maxWidth: "1100px", margin: "0 auto", padding: "30px 20px" }}>
        <div className="dashboard-section-heading" style={{ marginBottom: "24px" }}>
          <div>
            <span className="welcome-label">CAREER FACTS MASTER STORE</span>
            <h1>Profile Builder</h1>
            <p>Store your canonical professional facts here. Optimization and bullet rewrites happen later.</p>
          </div>
        </div>

        {/* Stepper / Tabs */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
          {["personal", "experience", "projects", "skills", "education"].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`secondary-btn ${activeTab === tab ? "primary-btn" : ""}`}
              onClick={() => setActiveTab(tab)}
              style={{ textTransform: "capitalize" }}
            >
              {tab} Details
            </button>
          ))}
        </div>

        {message && <p className="form-success" role="status" style={{ marginBottom: "16px" }}>{message}</p>}

        <form onSubmit={handleSaveProfile} className="builder-form">
          {/* Personal Tab */}
          {activeTab === "personal" && (
            <section>
              <h2>Personal & Social Links</h2>
              <div className="jd-two-columns" style={{ marginTop: "16px" }}>
                <div className="builder-field">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={personal.full_name}
                    onChange={(e) => setPersonal({ ...personal, full_name: e.target.value })}
                  />
                </div>
                <div className="builder-field">
                  <label>Professional Headline</label>
                  <input
                    type="text"
                    placeholder="e.g. Full Stack Python & React Developer"
                    value={personal.headline}
                    onChange={(e) => setPersonal({ ...personal, headline: e.target.value })}
                  />
                </div>
              </div>

              <div className="builder-field" style={{ marginTop: "12px" }}>
                <label>Professional Summary</label>
                <textarea
                  rows={3}
                  value={personal.summary}
                  onChange={(e) => setPersonal({ ...personal, summary: e.target.value })}
                />
              </div>

              <div className="jd-two-columns" style={{ marginTop: "12px" }}>
                <div className="builder-field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={personal.email}
                    onChange={(e) => setPersonal({ ...personal, email: e.target.value })}
                  />
                </div>
                <div className="builder-field">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    value={personal.phone}
                    onChange={(e) => setPersonal({ ...personal, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="jd-two-columns" style={{ marginTop: "12px" }}>
                <div className="builder-field">
                  <label>GitHub URL</label>
                  <input
                    type="text"
                    value={personal.github}
                    onChange={(e) => setPersonal({ ...personal, github: e.target.value })}
                  />
                </div>
                <div className="builder-field">
                  <label>LinkedIn URL</label>
                  <input
                    type="text"
                    value={personal.linkedin}
                    onChange={(e) => setPersonal({ ...personal, linkedin: e.target.value })}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Experience Tab as per Guide Section 5 */}
          {activeTab === "experience" && (
            <section>
              <h2>Work & Internship Experience</h2>
              {experiences.map((exp, idx) => (
                <div key={idx} style={{ padding: "16px", border: "1px solid var(--border-color)", borderRadius: "10px", marginTop: "16px" }}>
                  <div className="jd-two-columns">
                    <div className="builder-field">
                      <label>Company Name</label>
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) => {
                          const updated = [...experiences];
                          updated[idx].company = e.target.value;
                          setExperiences(updated);
                        }}
                      />
                    </div>
                    <div className="builder-field">
                      <label>Role / Job Title</label>
                      <input
                        type="text"
                        value={exp.role}
                        onChange={(e) => {
                          const updated = [...experiences];
                          updated[idx].role = e.target.value;
                          setExperiences(updated);
                        }}
                      />
                    </div>
                  </div>

                  <div className="builder-field" style={{ marginTop: "12px" }}>
                    <label>Key Achievements (Facts / Bullet points)</label>
                    <textarea
                      rows={3}
                      value={exp.achievements}
                      onChange={(e) => {
                        const updated = [...experiences];
                        updated[idx].achievements = e.target.value;
                        setExperiences(updated);
                      }}
                    />
                  </div>

                  {experiences.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeExperience(idx)}
                      style={{ marginTop: "10px", color: "#dc2626", background: "none", border: "none" }}
                    >
                      - Remove Experience
                    </button>
                  )}
                </div>
              ))}

              <button type="button" className="secondary-btn" onClick={addExperience} style={{ marginTop: "16px" }}>
                + Add Another Experience
              </button>
            </section>
          )}

          {/* Projects Tab */}
          {activeTab === "projects" && (
            <section>
              <h2>Projects</h2>
              {projects.map((proj, idx) => (
                <div key={idx} style={{ padding: "16px", border: "1px solid var(--border-color)", borderRadius: "10px", marginTop: "16px" }}>
                  <div className="builder-field">
                    <label>Project Name</label>
                    <input
                      type="text"
                      value={proj.name}
                      onChange={(e) => {
                        const updated = [...projects];
                        updated[idx].name = e.target.value;
                        setProjects(updated);
                      }}
                    />
                  </div>
                  <div className="builder-field" style={{ marginTop: "12px" }}>
                    <label>Description & Technologies Used</label>
                    <textarea
                      rows={2}
                      value={proj.description}
                      onChange={(e) => {
                        const updated = [...projects];
                        updated[idx].description = e.target.value;
                        setProjects(updated);
                      }}
                    />
                  </div>

                  {projects.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProject(idx)}
                      style={{ marginTop: "10px", color: "#dc2626", background: "none", border: "none" }}
                    >
                      - Remove Project
                    </button>
                  )}
                </div>
              ))}

              <button type="button" className="secondary-btn" onClick={addProject} style={{ marginTop: "16px" }}>
                + Add Another Project
              </button>
            </section>
          )}

          {/* Categorized Skills Tab as per Guide Section 4 */}
          {activeTab === "skills" && (
            <section>
              <h2>Categorized Technical Skills</h2>
              <div className="builder-field" style={{ marginTop: "12px" }}>
                <label>Backend Skills</label>
                <input
                  type="text"
                  placeholder="Python, Django, FastAPI, PostgreSQL, Redis"
                  value={skills.backend}
                  onChange={(e) => setSkills({ ...skills, backend: e.target.value })}
                />
              </div>
              <div className="builder-field" style={{ marginTop: "12px" }}>
                <label>Frontend Skills</label>
                <input
                  type="text"
                  placeholder="React, JavaScript, HTML5, CSS3, Vite"
                  value={skills.frontend}
                  onChange={(e) => setSkills({ ...skills, frontend: e.target.value })}
                />
              </div>
              <div className="builder-field" style={{ marginTop: "12px" }}>
                <label>Cloud & DevOps Skills</label>
                <input
                  type="text"
                  placeholder="Docker, GitHub Actions, Linux, AWS"
                  value={skills.cloud}
                  onChange={(e) => setSkills({ ...skills, cloud: e.target.value })}
                />
              </div>
            </section>
          )}

          {/* Education Tab */}
          {activeTab === "education" && (
            <section>
              <h2>Education & Certifications</h2>
              <div className="builder-field">
                <label>Degree & University</label>
                <input
                  type="text"
                  value={education[0]?.degree || ""}
                  onChange={(e) => {
                    const updated = [...education];
                    updated[0].degree = e.target.value;
                    setEducation(updated);
                  }}
                />
              </div>
            </section>
          )}

          <div style={{ marginTop: "24px" }}>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? "Saving Profile..." : "Save Canonical Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Profile;