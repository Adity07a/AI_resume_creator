import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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

function ResetPassword() {
  const [searchParams] = useSearchParams();

  // Django includes both values in the emailed reset URL.
  const uid = searchParams.get("uid") || "";
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!uid || !token) {
      setError(
        "This password-reset link is incomplete. Request a new link."
      );
      return;
    }

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/password-reset/confirm/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uid,
            token,
            new_password: password,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data) ||
            "Unable to reset your password. The link may have expired."
        );
      }

      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
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

        {success ? (
          <>
            <h1>Password Reset Successful</h1>

            <p className="form-success" role="status">
              Your password has been changed successfully.
              You can now log in using your new password.
            </p>

            <Link
              to="/login"
              className="primary-btn auth-submit"
            >
              Continue to Login
            </Link>
          </>
        ) : (
          <>
            <h1>Set a New Password</h1>

            <p className="auth-description">
              Enter your new password twice to confirm it.
            </p>

            {!uid || !token ? (
              <>
                <p className="form-error" role="alert">
                  The reset link is missing its UID or token.
                  Please request a new link.
                </p>

                <Link
                  to="/forgot-password"
                  className="primary-btn auth-submit"
                >
                  Request New Reset Link
                </Link>
              </>
            ) : (
              <form
                className="auth-form"
                onSubmit={handleSubmit}
              >
                <div className="form-group">
                  <label htmlFor="newPassword">
                    New Password
                  </label>

                  <input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="Enter your new password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmNewPassword">
                    Confirm New Password
                  </label>

                  <input
                    id="confirmNewPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="Enter it again"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    required
                  />
                </div>

                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="primary-btn auth-submit"
                  disabled={loading}
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            )}
          </>
        )}

        <p className="auth-switch">
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;