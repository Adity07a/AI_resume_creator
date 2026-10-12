import { Link } from "react-router-dom";
import "../App.css";

function CreateResume() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/dashboard" className="auth-logo">
          <span className="logo-icon">R</span>
          Resume<span className="logo-highlight">AI</span>
        </Link>

        <h1>Create Your Resume</h1>
        <p className="auth-description">
          Let's start building your professional resume.
        </p>

        <div className="auth-form">
          <Link to="/resume-builder" className="primary-btn auth-submit">
             Start from Scratch
          </Link>

          <button
            type="button"
            className="secondary-btn"
            onClick={() =>
              alert("Resume upload feature will be added in the next step.")
            }
          >
            Upload Existing Resume
          </button>

          <Link to="/dashboard" className="back-home">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default CreateResume;