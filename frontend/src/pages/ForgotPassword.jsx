import { useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");

function getErrorMessage(data) {
  if (typeof data?.detail === "string") {
    return data.detail;
  }

  return Object.entries(data || {})
    .map(([field, value]) => {
      const message = Array.isArray(value)
        ? value.join(" ")
        : String(value);

      return `${field}: ${message}`;
    })
    .join(" ");
}

function ForgotPassword() {
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
        `${API_BASE_URL}/auth/password-reset/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data) ||
            "Unable to process your request."
        );
      }

      setSuccess(
        data.detail ||
          "If an account matches this email, a reset link will be sent."
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

        <h1>Forgot Password?</h1>

        <p className="auth-description">
          Enter the email address associated with your account.
          We will send you a password-reset link if the account exists.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="resetEmail">
              Email Address
            </label>

            <input
              id="resetEmail"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
            type="submit"
            className="primary-btn auth-submit"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="auth-switch">
          Remembered your password?{" "}
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;