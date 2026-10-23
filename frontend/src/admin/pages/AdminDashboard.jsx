
import "./Admin.css";

const stats = [
  {
    label: "Total Users",
    value: "—",
    note: "Awaiting backend integration",
    icon: "users",
  },
  {
    label: "Total Resumes",
    value: "—",
    note: "Awaiting backend integration",
    icon: "file",
  },
  {
    label: "AI Generated Resumes",
    value: "—",
    note: "Awaiting backend integration",
    icon: "sparkles",
  },
  {
    label: "Manual Drafts",
    value: "—",
    note: "Awaiting backend integration",
    icon: "edit",
  },
];

const plannedFeatures = [
  {
    title: "User Management",
    description: "Manage registered accounts and access roles.",
    icon: "users",
  },
  {
    title: "Resume Management",
    description: "Review resume records and creation types.",
    icon: "file",
  },
  {
    title: "Template Management",
    description: "Manage available resume templates.",
    icon: "layout",
  },
  {
    title: "Reports & Analytics",
    description: "Review platform usage and activity.",
    icon: "chart",
  },
];

function DashboardIcon({ name, size = 20 }) {
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h8" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" />
        <path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z" />
      </>
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z" />
      </>
    ),
    layout: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </>
    ),
    chart: (
      <>
        <path d="M3 3v18h18" />
        <path d="m7 14 4-4 4 3 6-7" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.grid}
    </svg>
  );
}

function AdminDashboard() {
  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-icon">
            <DashboardIcon name="sparkles" size={25} />
          </div>

          <div>
            <h2>ResumeAI</h2>
            <span>Administration</span>
          </div>
        </div>

        <div className="admin-nav-label">WORKSPACE</div>

        <nav className="admin-navigation" aria-label="Admin navigation">
          <div className="admin-nav-item active">
            <DashboardIcon name="grid" />
            <span>Overview</span>
          </div>

          <div className="admin-nav-item planned">
            <DashboardIcon name="users" />
            <span>Users</span>
            <span className="admin-nav-tag">Planned</span>
          </div>

          <div className="admin-nav-item planned">
            <DashboardIcon name="file" />
            <span>Resumes</span>
            <span className="admin-nav-tag">Planned</span>
          </div>

          <div className="admin-nav-item planned">
            <DashboardIcon name="layout" />
            <span>Templates</span>
            <span className="admin-nav-tag">Planned</span>
          </div>

          <div className="admin-nav-item planned">
            <DashboardIcon name="chart" />
            <span>Reports</span>
            <span className="admin-nav-tag">Planned</span>
          </div>

          <div className="admin-nav-label admin-nav-label-bottom">
            SYSTEM
          </div>

          <div className="admin-nav-item planned">
            <DashboardIcon name="settings" />
            <span>Settings</span>
            <span className="admin-nav-tag">Planned</span>
          </div>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-security-icon">
            <DashboardIcon name="shield" size={19} />
          </div>
          <div>
            <strong>Admin Workspace</strong>
            <span>UI preview mode</span>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>Overview</strong>
          </div>

          <div className="admin-topbar-right">
            <span className="admin-status-dot" />
            <span className="admin-preview-label">Frontend preview</span>

            <div className="admin-avatar" title="Admin preview">
              A
            </div>
          </div>
        </header>

        <div className="admin-content">
          <section className="admin-welcome">
            <div>
              <div className="admin-eyebrow">
                <DashboardIcon name="sparkles" size={15} />
                ADMINISTRATOR WORKSPACE
              </div>

              <h1>Dashboard Overview</h1>

              <p>
                Welcome to your ResumeAI control center. Your admin
                workspace is taking shape.
              </p>
            </div>

            <div className="admin-date-card">
              <span className="admin-date-icon">
                <DashboardIcon name="grid" size={19} />
              </span>
              <div>
                <strong>System overview</strong>
                <span>Live data will be connected later</span>
              </div>
            </div>
          </section>

          <section className="admin-section">
            <div className="admin-section-heading">
              <div>
                <h2>Platform Statistics</h2>
                <p>Summary of your resume platform</p>
              </div>
              <span className="admin-demo-badge">Awaiting backend</span>
            </div>

            <div className="admin-stats-grid">
              {stats.map((stat) => (
                <article className="admin-stat-card" key={stat.label}>
                  <div className="admin-stat-top">
                    <span className="admin-stat-icon">
                      <DashboardIcon name={stat.icon} size={21} />
                    </span>
                    <span className="admin-stat-placeholder">—</span>
                  </div>

                  <h3>{stat.value}</h3>
                  <p className="admin-stat-label">{stat.label}</p>
                  <p className="admin-stat-note">{stat.note}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-section">
            <div className="admin-section-heading">
              <div>
                <h2>Management Workspace</h2>
                <p>
                  Areas we can connect after the backend requirements
                  are finalized.
                </p>
              </div>
            </div>

            <div className="admin-features-grid">
              {plannedFeatures.map((feature) => (
                <article
                  className="admin-feature-card"
                  key={feature.title}
                >
                  <div className="admin-feature-icon">
                    <DashboardIcon name={feature.icon} size={22} />
                  </div>

                  <div className="admin-feature-copy">
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>

                  <span className="admin-feature-arrow" aria-hidden="true">
                    →
                  </span>

                  <span className="admin-feature-status">Coming later</span>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-bottom-grid">
            <article className="admin-info-card">
              <div className="admin-info-icon">
                <DashboardIcon name="shield" size={22} />
              </div>
              <div>
                <h3>Security first</h3>
                <p>
                  Admin permissions and account verification will be
                  enforced by the backend before this dashboard is
                  enabled for real administrative use.
                </p>
              </div>
            </article>

            <article className="admin-info-card">
              <div className="admin-info-icon">
                <DashboardIcon name="settings" size={22} />
              </div>
              <div>
                <h3>Integration status</h3>
                <p>
                  This page currently uses static placeholder content.
                  No user records or database changes are being made.
                </p>
                <span className="admin-integration-status">
                  <span />
                  Frontend UI only
                </span>
              </div>
            </article>
          </section>

          <footer className="admin-footer">
            <span>ResumeAI Admin Workspace</span>
            <span>Dashboard preview · Backend not connected</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
