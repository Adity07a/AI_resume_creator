import { Link } from "react-router-dom";
import { useState } from "react";
import "../App.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");

function Register() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const formData = new FormData(event.currentTarget);
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    const payload = {
      first_name: formData.get("first_name").trim(),
      last_name: formData.get("last_name").trim(),
      username: formData.get("username").trim(),
      email: formData.get("email").trim(),
      password,
    };

    if (
      !payload.first_name ||
      !payload.last_name ||
      !payload.username ||
      !payload.email
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/register/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const message =
          data.detail ||
          Object.entries(data)
            .map(([field, value]) => {
              const details = Array.isArray(value)
                ? value.join(" ")
                : typeof value === "object" && value !== null
                  ? JSON.stringify(value)
                  : String(value);

              return `${field}: ${details}`;
            })
            .join(" ");

        throw new Error(message || "Registration failed.");
      }

      const emailSent = Boolean(
        data.email_verification_email_sent
      );

      setSuccess(
        emailSent
          ? "Account created successfully! We sent a verification link to your email. Open it before logging in, and check your spam folder if needed."
          : "Your account was created, but the verification email could not be sent. Use the resend option below to try again."
      );

      // Clear stale session data so an old account is not reused.
      localStorage.removeItem("resumeai-access-token");
      localStorage.removeItem("resumeai-refresh-token");
      sessionStorage.removeItem("resumeai-access-token");
      sessionStorage.removeItem("resumeai-refresh-token");
      localStorage.removeItem("resumeai-user");

    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Unable to connect to the server. Please check that Django is running."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo">
          <span className="logo-icon">R</span>
          Resume<span className="logo-highlight">AI</span>
        </Link>

        <h1>Create Account</h1>
        <p className="auth-description">
          Start building your professional resume with AI.
        </p>

        <form className="auth-form" onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <input
              type="text"
              id="firstName"
              name="first_name"
              placeholder="Enter your first name"
              autoComplete="given-name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <input
              type="text"
              id="lastName"
              name="last_name"
              placeholder="Enter your last name"
              autoComplete="family-name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Choose a username"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="registerEmail">Email Address</label>
            <input
              type="email"
              id="registerEmail"
              name="email"
              placeholder="Enter your email"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="registerPassword">Password</label>
            <input
              type="password"
              id="registerPassword"
              name="password"
              placeholder="Create a password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}

          {success && (
            <p role="status" className="form-success">
              {success}
            </p>
          )}

          <button
            type="submit"
            className="primary-btn auth-submit"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        {success && (
          <p className="auth-switch" style={{ marginTop: "1rem" }}>
            Didn't receive the email?{" "}
            <Link to="/resend-verification">
              Resend verification email
            </Link>
          </p>
        )}

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>

        <Link to="/" className="back-home">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

export default Register;