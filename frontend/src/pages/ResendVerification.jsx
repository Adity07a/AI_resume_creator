import { useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");

function ResendVerification() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/verify-email/resend/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: email.trim() }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to process this request."
        );
      }

      setSuccess(
        data.detail ||
          "If the account requires verification, a new email will be sent."
      );
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Unable to connect to Django. Check that the backend is running."
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

        <h1>Resend verification email</h1>

        <p className="auth-description">
          Enter the email address you used to create your account.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="verificationEmail">
              Email address
            </label>

            <input
              id="verificationEmail"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p className="form-success" role="status">
              {success}
            </p>
          )}

          <button
            className="primary-btn auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send verification email"}
          </button>
        </form>

        <p className="auth-switch">
          Already verified? <Link to="/login">Go to Login</Link>
        </p>
      </div>
    </div>
  );
}

export default ResendVerification;