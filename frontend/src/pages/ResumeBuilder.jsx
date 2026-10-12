import { useState } from "react";
import { Link } from "react-router-dom";
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

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
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

          <form className="builder-form" onSubmit={(event) => event.preventDefault()}>
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
          </form>
        </section>

        {/* RIGHT SIDE: LIVE PREVIEW */}
        <section className="builder-preview-panel">
          <div className="preview-heading">
            <div>
              <h2>Live Preview</h2>
              <p>Your resume updates as you type.</p>
            </div>
            <span className="preview-status">Live</span>
          </div>

          <article className="resume-paper">
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