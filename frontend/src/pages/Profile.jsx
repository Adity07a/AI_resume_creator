import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../services/api";
import "../App.css";

const EMPTY_EXPERIENCE = {
  id: null,
  company: "",
  role: "",
  location: "",
  start_date: "",
  end_date: "",
  currently_working: false,
  description: "",
  achievements: "",
  technologies: "",
};

const EMPTY_PROJECT = {
  id: null,
  name: "",
  description: "",
  technologies: "",
  link: "",
};

const EMPTY_EDUCATION = {
  id: null,
  institution: "",
  degree: "",
  location: "",
  start_date: "",
  end_date: "",
  grade: "",
};

const EMPTY_SKILLS = {
  backend: "",
  frontend: "",
  cloud: "",
  ai: "",
  tools: "",
};

const COLLECTIONS = {
  experiences: "/profile/experiences/",
  projects: "/profile/projects/",
  skills: "/profile/skills/",
  education: "/profile/education/",
};

function splitList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value !== "string") return [];

  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(value) {
  return Array.isArray(value) ? value.join(", ") : value || "";
}

function getErrorMessage(error) {
  return error?.message || "Something went wrong. Please try again.";
}

function Profile() {
  const [activeTab, setActiveTab] = useState("personal");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
    { ...EMPTY_EXPERIENCE },
  ]);
  const [projects, setProjects] = useState([{ ...EMPTY_PROJECT }]);
  const [skills, setSkills] = useState({ ...EMPTY_SKILLS });
  const [education, setEducation] = useState([{ ...EMPTY_EDUCATION }]);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoading(true);
      setError("");

      try {
        const [basicResponse, careerResponse] = await Promise.all([
          apiRequest("/auth/profile/"),
          apiRequest("/profile/"),
        ]);

        if (!active) return;

        const user = basicResponse?.user || careerResponse?.user || {};
        const basic = basicResponse?.profile || careerResponse?.profile || {};

        const fullName = [
          user.first_name,
          user.last_name,
        ]
          .filter(Boolean)
          .join(" ");

        setPersonal({
          full_name: fullName,
          headline: basic.headline || "",
          summary: basic.bio || "",
          email: user.email || "",
          phone: basic.phone || "",
          location: basic.location || "",
          github: basic.github_url || "",
          linkedin: basic.linked_url || "",
          portfolio: basic.portfolio_url || "",
        });

        const loadedExperiences = (careerResponse?.experiences || []).map(
          (item) => ({
            id: item.id,
            company: item.company || "",
            role: item.job_title || "",
            location: item.location || "",
            start_date: item.start_date || "",
            end_date: item.end_date || "",
            currently_working: Boolean(item.currently_working),
            description: item.description || "",
            achievements: joinList(item.achievements),
            technologies: joinList(item.technologies),
          })
        );

        setExperiences(
          loadedExperiences.length
            ? loadedExperiences
            : [{ ...EMPTY_EXPERIENCE }]
        );

        const loadedProjects = (careerResponse?.projects || []).map(
          (item) => ({
            id: item.id,
            name: item.name || "",
            description: item.description || "",
            technologies: joinList(item.technologies),
            link: item.project_url || "",
          })
        );

        setProjects(
          loadedProjects.length ? loadedProjects : [{ ...EMPTY_PROJECT }]
        );

        const loadedSkills = {
          backend: [],
          frontend: [],
          cloud: [],
          ai: [],
          tools: [],
        };

        (careerResponse?.skills || []).forEach((item) => {
          const category = String(item.category || "").toLowerCase();
          const key =
            category.includes("back")
              ? "backend"
              : category.includes("front")
              ? "frontend"
              : category.includes("cloud") || category.includes("devops")
              ? "cloud"
              : category.includes("ai") || category.includes("ml")
              ? "ai"
              : "tools";

          loadedSkills[key].push(item.name);
        });

        setSkills({
          backend: loadedSkills.backend.join(", "),
          frontend: loadedSkills.frontend.join(", "),
          cloud: loadedSkills.cloud.join(", "),
          ai: loadedSkills.ai.join(", "),
          tools: loadedSkills.tools.join(", "),
        });

        const loadedEducation = (careerResponse?.education || []).map(
          (item) => ({
            id: item.id,
            institution: item.institution || "",
            degree: item.degree || "",
            location: item.location || "",
            start_date: item.start_date || "",
            end_date: item.end_date || "",
            grade: item.grade || "",
          })
        );

        setEducation(
          loadedEducation.length ? loadedEducation : [{ ...EMPTY_EDUCATION }]
        );
      } catch (err) {
        if (active) {
          setError(
            `${getErrorMessage(err)} Make sure you are logged in and the backend is running.`
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  async function syncCollection(endpoint, originalItems, nextItems, mapItem) {
    const originalById = new Map(
      originalItems
        .filter((item) => item.id != null)
        .map((item) => [String(item.id), item])
    );

    const retainedIds = new Set();

    for (const item of nextItems) {
      if (!mapItem.isMeaningful(item)) continue;

      const payload = mapItem.toPayload(item);

      if (item.id != null) {
        retainedIds.add(String(item.id));

        await apiRequest(
          `${endpoint}${encodeURIComponent(item.id)}/`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );
      } else {
        await apiRequest(endpoint, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
    }

    for (const [id] of originalById) {
      if (!retainedIds.has(id)) {
        await apiRequest(`${endpoint}${encodeURIComponent(id)}/`, {
          method: "DELETE",
        });
      }
    }
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const nameParts = personal.full_name.trim().split(/\s+/);
      const firstName = nameParts.shift() || "";
      const lastName = nameParts.join(" ");

      await apiRequest("/auth/profile/", {
        method: "PATCH",
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          headline: personal.headline.trim(),
          bio: personal.summary.trim(),
          phone: personal.phone.trim(),
          location: personal.location.trim(),
          github_url: personal.github.trim(),
          linked_url: personal.linkedin.trim(),
          portfolio_url: personal.portfolio.trim(),
        }),
      });

      const originalCareer = await apiRequest("/profile/");

      await syncCollection(
        COLLECTIONS.experiences,
        originalCareer.experiences || [],
        experiences,
        {
          isMeaningful: (item) =>
            Boolean(item.company.trim() || item.role.trim()),
          toPayload: (item) => ({
            company: item.company.trim(),
            job_title: item.role.trim(),
            location: item.location.trim(),
            start_date: item.start_date || null,
            end_date: item.currently_working ? null : item.end_date || null,
            currently_working: item.currently_working,
            description: item.description.trim(),
            achievements: splitList(item.achievements),
            technologies: splitList(item.technologies),
          }),
        }
      );

      await syncCollection(
        COLLECTIONS.projects,
        originalCareer.projects || [],
        projects,
        {
          isMeaningful: (item) =>
            Boolean(item.name.trim() || item.description.trim()),
          toPayload: (item) => ({
            name: item.name.trim(),
            description: item.description.trim(),
            technologies: splitList(item.technologies),
            project_url: item.link.trim(),
          }),
        }
      );

      const originalSkills = originalCareer.skills || [];
      const skillGroups = [
        ["backend", "backend"],
        ["frontend", "frontend"],
        ["cloud", "cloud"],
        ["ai", "ai"],
        ["tools", "tools"],
      ];

      const nextSkills = skillGroups.flatMap(([key, category]) =>
        splitList(skills[key]).map((name) => ({ name, category }))
      );

      await syncCollection(
        COLLECTIONS.skills,
        originalSkills,
        nextSkills,
        {
          isMeaningful: (item) => Boolean(item.name.trim()),
          toPayload: (item) => ({
            name: item.name.trim(),
            category: item.category,
          }),
        }
      );

      await syncCollection(
        COLLECTIONS.education,
        originalCareer.education || [],
        education,
        {
          isMeaningful: (item) =>
            Boolean(item.institution.trim() || item.degree.trim()),
          toPayload: (item) => ({
            institution: item.institution.trim(),
            degree: item.degree.trim(),
            location: item.location.trim(),
            start_date: item.start_date || null,
            end_date: item.end_date || null,
            grade: item.grade.trim(),
          }),
        }
      );

      setMessage("Profile saved successfully to the server.");

      // Reload IDs and normalized values after creating or deleting records.
      const [basicResponse, careerResponse] = await Promise.all([
        apiRequest("/auth/profile/"),
        apiRequest("/profile/"),
      ]);

      const user = basicResponse?.user || careerResponse?.user || {};
      const basic = basicResponse?.profile || careerResponse?.profile || {};

      setPersonal((prev) => ({
        ...prev,
        full_name: [user.first_name, user.last_name].filter(Boolean).join(" "),
        email: user.email || prev.email,
        headline: basic.headline || "",
        summary: basic.bio || "",
        phone: basic.phone || "",
        location: basic.location || "",
        github: basic.github_url || "",
        linkedin: basic.linked_url || "",
        portfolio: basic.portfolio_url || "",
      }));

      setExperiences(
        (careerResponse.experiences || []).map((item) => ({
          id: item.id,
          company: item.company || "",
          role: item.job_title || "",
          location: item.location || "",
          start_date: item.start_date || "",
          end_date: item.end_date || "",
          currently_working: Boolean(item.currently_working),
          description: item.description || "",
          achievements: joinList(item.achievements),
          technologies: joinList(item.technologies),
        }))
      );

      setProjects(
        (careerResponse.projects || []).map((item) => ({
          id: item.id,
          name: item.name || "",
          description: item.description || "",
          technologies: joinList(item.technologies),
          link: item.project_url || "",
        }))
      );

      const refreshedSkills = {
        backend: [],
        frontend: [],
        cloud: [],
        ai: [],
        tools: [],
      };

      (careerResponse.skills || []).forEach((item) => {
        const category = String(item.category || "").toLowerCase();
        const key = category.includes("back")
          ? "backend"
          : category.includes("front")
          ? "frontend"
          : category.includes("cloud") || category.includes("devops")
          ? "cloud"
          : category.includes("ai") || category.includes("ml")
          ? "ai"
          : "tools";

        refreshedSkills[key].push(item.name);
      });

      setSkills({
        backend: refreshedSkills.backend.join(", "),
        frontend: refreshedSkills.frontend.join(", "),
        cloud: refreshedSkills.cloud.join(", "),
        ai: refreshedSkills.ai.join(", "),
        tools: refreshedSkills.tools.join(", "),
      });

      setEducation(
        (careerResponse.education || []).map((item) => ({
          id: item.id,
          institution: item.institution || "",
          degree: item.degree || "",
          location: item.location || "",
          start_date: item.start_date || "",
          end_date: item.end_date || "",
          grade: item.grade || "",
        }))
      );
    } catch (err) {
      setError(
        `${getErrorMessage(err)} Some earlier requests may already have saved successfully. Please reload the profile before retrying.`
      );
      setMessage("");
    } finally {
      setSaving(false);
    }
  }

  function updateItem(setter, items, index, field, value) {
    setter(
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  }

  function updatePersonal(field, value) {
    setPersonal((previous) => ({ ...previous, [field]: value }));
  }

  function updateSkill(field, value) {
    setSkills((previous) => ({ ...previous, [field]: value }));
  }

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

      <main
        className="builder-layout"
        style={{
          display: "block",
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "30px 20px",
        }}
      >
        <div
          className="dashboard-section-heading"
          style={{ marginBottom: "24px" }}
        >
          <div>
            <span className="welcome-label">CAREER FACTS MASTER STORE</span>
            <h1>Profile Builder</h1>
            <p>
              Store your professional details, experience, projects, skills
              and education for use in your resumes.
            </p>
          </div>
        </div>

        {error && (
          <p className="form-error" role="alert" style={{ marginBottom: 16 }}>
            {error}
          </p>
        )}

        {message && (
          <p
            className="form-success"
            role="status"
            style={{ marginBottom: 16 }}
          >
            {message}
          </p>
        )}

        {loading ? (
          <p className="empty-resumes">Loading profile from the server...</p>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 24,
                flexWrap: "wrap",
              }}
            >
              {["personal", "experience", "projects", "skills", "education"].map(
                (tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`secondary-btn ${
                      activeTab === tab ? "primary-btn" : ""
                    }`}
                    onClick={() => setActiveTab(tab)}
                    style={{ textTransform: "capitalize" }}
                  >
                    {tab} Details
                  </button>
                )
              )}
            </div>

            <form onSubmit={handleSaveProfile} className="builder-form">
              {activeTab === "personal" && (
                <section>
                  <h2>Personal & Social Links</h2>

                  <div className="jd-two-columns" style={{ marginTop: 16 }}>
                    <div className="builder-field">
                      <label htmlFor="fullName">Full Name</label>
                      <input
                        id="fullName"
                        value={personal.full_name}
                        onChange={(e) =>
                          updatePersonal("full_name", e.target.value)
                        }
                      />
                    </div>

                    <div className="builder-field">
                      <label htmlFor="headline">Professional Headline</label>
                      <input
                        id="headline"
                        placeholder="e.g. Python & React Developer"
                        value={personal.headline}
                        onChange={(e) =>
                          updatePersonal("headline", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="builder-field" style={{ marginTop: 12 }}>
                    <label htmlFor="summary">Professional Summary</label>
                    <textarea
                      id="summary"
                      rows={3}
                      value={personal.summary}
                      onChange={(e) =>
                        updatePersonal("summary", e.target.value)
                      }
                    />
                  </div>

                  <div className="jd-two-columns" style={{ marginTop: 12 }}>
                    <div className="builder-field">
                      <label htmlFor="email">Email Address</label>
                      <input
                        id="email"
                        type="email"
                        value={personal.email}
                        readOnly
                      />
                    </div>

                    <div className="builder-field">
                      <label htmlFor="phone">Phone Number</label>
                      <input
                        id="phone"
                        value={personal.phone}
                        onChange={(e) =>
                          updatePersonal("phone", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="builder-field" style={{ marginTop: 12 }}>
                    <label htmlFor="location">Location</label>
                    <input
                      id="location"
                      value={personal.location}
                      onChange={(e) =>
                        updatePersonal("location", e.target.value)
                      }
                      placeholder="City, State, Country"
                    />
                  </div>

                  <div className="jd-two-columns" style={{ marginTop: 12 }}>
                    <div className="builder-field">
                      <label htmlFor="github">GitHub URL</label>
                      <input
                        id="github"
                        type="url"
                        value={personal.github}
                        onChange={(e) =>
                          updatePersonal("github", e.target.value)
                        }
                        placeholder="https://github.com/username"
                      />
                    </div>

                    <div className="builder-field">
                      <label htmlFor="linkedin">LinkedIn URL</label>
                      <input
                        id="linkedin"
                        type="url"
                        value={personal.linkedin}
                        onChange={(e) =>
                          updatePersonal("linkedin", e.target.value)
                        }
                        placeholder="https://linkedin.com/in/username"
                      />
                    </div>
                  </div>

                  <div className="builder-field" style={{ marginTop: 12 }}>
                    <label htmlFor="portfolio">Portfolio URL</label>
                    <input
                      id="portfolio"
                      type="url"
                      value={personal.portfolio}
                      onChange={(e) =>
                        updatePersonal("portfolio", e.target.value)
                      }
                    />
                  </div>
                </section>
              )}

              {activeTab === "experience" && (
                <section>
                  <h2>Work & Internship Experience</h2>

                  {experiences.map((exp, index) => (
                    <div
                      key={exp.id ?? `new-experience-${index}`}
                      style={{
                        padding: 16,
                        border: "1px solid var(--border-color)",
                        borderRadius: 10,
                        marginTop: 16,
                      }}
                    >
                      <div className="jd-two-columns">
                        <div className="builder-field">
                          <label>Company Name</label>
                          <input
                            value={exp.company}
                            onChange={(e) =>
                              updateItem(
                                setExperiences,
                                experiences,
                                index,
                                "company",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="builder-field">
                          <label>Role / Job Title</label>
                          <input
                            value={exp.role}
                            onChange={(e) =>
                              updateItem(
                                setExperiences,
                                experiences,
                                index,
                                "role",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="jd-two-columns" style={{ marginTop: 12 }}>
                        <div className="builder-field">
                          <label>Location</label>
                          <input
                            value={exp.location}
                            onChange={(e) =>
                              updateItem(
                                setExperiences,
                                experiences,
                                index,
                                "location",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="builder-field">
                          <label>Technologies (comma-separated)</label>
                          <input
                            value={exp.technologies}
                            onChange={(e) =>
                              updateItem(
                                setExperiences,
                                experiences,
                                index,
                                "technologies",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="jd-two-columns" style={{ marginTop: 12 }}>
                        <div className="builder-field">
                          <label>Start Date</label>
                          <input
                            type="date"
                            value={exp.start_date}
                            onChange={(e) =>
                              updateItem(
                                setExperiences,
                                experiences,
                                index,
                                "start_date",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="builder-field">
                          <label>End Date</label>
                          <input
                            type="date"
                            value={exp.end_date}
                            disabled={exp.currently_working}
                            onChange={(e) =>
                              updateItem(
                                setExperiences,
                                experiences,
                                index,
                                "end_date",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>

                      <label
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          marginTop: 12,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={exp.currently_working}
                          onChange={(e) => {
                            const updated = experiences.map((item, i) =>
                              i === index
                                ? {
                                    ...item,
                                    currently_working: e.target.checked,
                                    end_date: e.target.checked
                                      ? ""
                                      : item.end_date,
                                  }
                                : item
                            );
                            setExperiences(updated);
                          }}
                        />
                        I currently work here
                      </label>

                      <div className="builder-field" style={{ marginTop: 12 }}>
                        <label>Description</label>
                        <textarea
                          rows={3}
                          value={exp.description}
                          onChange={(e) =>
                            updateItem(
                              setExperiences,
                              experiences,
                              index,
                              "description",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="builder-field" style={{ marginTop: 12 }}>
                        <label>Achievements (comma-separated or new lines)</label>
                        <textarea
                          rows={3}
                          value={exp.achievements}
                          onChange={(e) =>
                            updateItem(
                              setExperiences,
                              experiences,
                              index,
                              "achievements",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      {experiences.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExperiences((items) =>
                              items.filter((_, i) => i !== index)
                            )
                          }
                          style={{
                            marginTop: 10,
                            color: "#dc2626",
                            background: "none",
                            border: "none",
                          }}
                        >
                          − Remove Experience
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() =>
                      setExperiences((items) => [
                        ...items,
                        { ...EMPTY_EXPERIENCE },
                      ])
                    }
                    style={{ marginTop: 16 }}
                  >
                    + Add Another Experience
                  </button>
                </section>
              )}

              {activeTab === "projects" && (
                <section>
                  <h2>Projects</h2>

                  {projects.map((project, index) => (
                    <div
                      key={project.id ?? `new-project-${index}`}
                      style={{
                        padding: 16,
                        border: "1px solid var(--border-color)",
                        borderRadius: 10,
                        marginTop: 16,
                      }}
                    >
                      <div className="builder-field">
                        <label>Project Name</label>
                        <input
                          value={project.name}
                          onChange={(e) =>
                            updateItem(
                              setProjects,
                              projects,
                              index,
                              "name",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="builder-field" style={{ marginTop: 12 }}>
                        <label>Description</label>
                        <textarea
                          rows={3}
                          value={project.description}
                          onChange={(e) =>
                            updateItem(
                              setProjects,
                              projects,
                              index,
                              "description",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="builder-field" style={{ marginTop: 12 }}>
                        <label>Technologies (comma-separated)</label>
                        <input
                          value={project.technologies}
                          onChange={(e) =>
                            updateItem(
                              setProjects,
                              projects,
                              index,
                              "technologies",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="builder-field" style={{ marginTop: 12 }}>
                        <label>Project URL</label>
                        <input
                          type="url"
                          value={project.link}
                          onChange={(e) =>
                            updateItem(
                              setProjects,
                              projects,
                              index,
                              "link",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      {projects.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setProjects((items) =>
                              items.filter((_, i) => i !== index)
                            )
                          }
                          style={{
                            marginTop: 10,
                            color: "#dc2626",
                            background: "none",
                            border: "none",
                          }}
                        >
                          − Remove Project
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() =>
                      setProjects((items) => [
                        ...items,
                        { ...EMPTY_PROJECT },
                      ])
                    }
                    style={{ marginTop: 16 }}
                  >
                    + Add Another Project
                  </button>
                </section>
              )}

              {activeTab === "skills" && (
                <section>
                  <h2>Categorized Technical Skills</h2>
                  <p style={{ color: "var(--text-secondary)" }}>
                    Enter skills separated by commas.
                  </p>

                  {[
                    ["backend", "Backend Skills", "Python, Django, FastAPI"],
                    ["frontend", "Frontend Skills", "React, JavaScript, CSS"],
                    ["cloud", "Cloud & DevOps Skills", "Docker, AWS, Linux"],
                    ["ai", "AI & Machine Learning Skills", "LLMs, NLP"],
                    ["tools", "Databases & Other Tools", "PostgreSQL, Git, Redis"],
                  ].map(([key, label, placeholder]) => (
                    <div
                      className="builder-field"
                      style={{ marginTop: 12 }}
                      key={key}
                    >
                      <label>{label}</label>
                      <input
                        value={skills[key]}
                        placeholder={placeholder}
                        onChange={(e) => updateSkill(key, e.target.value)}
                      />
                    </div>
                  ))}
                </section>
              )}

              {activeTab === "education" && (
                <section>
                  <h2>Education</h2>

                  {education.map((item, index) => (
                    <div
                      key={item.id ?? `new-education-${index}`}
                      style={{
                        padding: 16,
                        border: "1px solid var(--border-color)",
                        borderRadius: 10,
                        marginTop: 16,
                      }}
                    >
                      <div className="builder-field">
                        <label>Institution / University</label>
                        <input
                          value={item.institution}
                          onChange={(e) =>
                            updateItem(
                              setEducation,
                              education,
                              index,
                              "institution",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="jd-two-columns" style={{ marginTop: 12 }}>
                        <div className="builder-field">
                          <label>Degree / Qualification</label>
                          <input
                            value={item.degree}
                            onChange={(e) =>
                              updateItem(
                                setEducation,
                                education,
                                index,
                                "degree",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="builder-field">
                          <label>Location</label>
                          <input
                            value={item.location}
                            onChange={(e) =>
                              updateItem(
                                setEducation,
                                education,
                                index,
                                "location",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="jd-two-columns" style={{ marginTop: 12 }}>
                        <div className="builder-field">
                          <label>Start Date</label>
                          <input
                            type="date"
                            value={item.start_date}
                            onChange={(e) =>
                              updateItem(
                                setEducation,
                                education,
                                index,
                                "start_date",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="builder-field">
                          <label>End Date</label>
                          <input
                            type="date"
                            value={item.end_date}
                            onChange={(e) =>
                              updateItem(
                                setEducation,
                                education,
                                index,
                                "end_date",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="builder-field" style={{ marginTop: 12 }}>
                        <label>Grade / CGPA</label>
                        <input
                          value={item.grade}
                          onChange={(e) =>
                            updateItem(
                              setEducation,
                              education,
                              index,
                              "grade",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      {education.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setEducation((items) =>
                              items.filter((_, i) => i !== index)
                            )
                          }
                          style={{
                            marginTop: 10,
                            color: "#dc2626",
                            background: "none",
                            border: "none",
                          }}
                        >
                          − Remove Education
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() =>
                      setEducation((items) => [
                        ...items,
                        { ...EMPTY_EDUCATION },
                      ])
                    }
                    style={{ marginTop: 16 }}
                  >
                    + Add Education
                  </button>
                </section>
              )}

              <div style={{ marginTop: 24 }}>
                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? "Saving Profile..." : "Save Canonical Profile"}
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

export default Profile;