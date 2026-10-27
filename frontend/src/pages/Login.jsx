import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import "../App.css";

function Login() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email")?.trim();
    const password = formData.get("password");
    const rememberMe = formData.get("rememberMe") === "on";

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Authenticate with the backend.
      const data = await apiRequest("/auth/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!data?.access || !data?.refresh) {
        throw new Error(
          "The server did not return the required tokens."
        );
      }

      // Step 2: Preserve the Remember Me behavior.
      localStorage.removeItem("resumeai-access-token");
      localStorage.removeItem("resumeai-refresh-token");
      sessionStorage.removeItem("resumeai-access-token");
      sessionStorage.removeItem("resumeai-refresh-token");
      localStorage.removeItem("resumeai-user");

      const storage = rememberMe ? localStorage : sessionStorage;

      storage.setItem("resumeai-access-token", data.access);
      storage.setItem("resumeai-refresh-token", data.refresh);

      try {
        // Step 3: Fetch the logged-in user's details.
        const userData = await apiRequest("/auth/me/", {
          method: "GET",
        });

        // Dashboard reads the user details from localStorage.
        localStorage.setItem(
          "resumeai-user",
          JSON.stringify(userData)
        );
      } catch (userError) {
        // Clear incomplete login state if fetching user details fails.
        localStorage.removeItem("resumeai-access-token");
        localStorage.removeItem("resumeai-refresh-token");
        sessionStorage.removeItem("resumeai-access-token");
        sessionStorage.removeItem("resumeai-refresh-token");
        localStorage.removeItem("resumeai-user");

        throw userError;
      }

      setSuccess("Login successful! Redirecting...");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Unable to connect to the server. Please check that Django is running."
          : err.message || "Login failed. Please try again."
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

        <h1>Welcome Back!</h1>
        <p className="auth-description">
          Login to continue building your professional resume.
        </p>

        <form className="auth-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your email"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              minLength={8}
              required
            />
          </div>

          <div className="auth-options">
            <label className="remember-option">
              <input type="checkbox" name="rememberMe" />
              Remember me
            </label>

            <Link to="/forgot-password">
              Forgot password?
            </Link>
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
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <Link
            to="/resend-verification"
            style={{
              fontSize: "0.85rem",
              color: "var(--text-muted)",
            }}
          >
            Didn't receive a verification email?
          </Link>
        </div>

        <p className="auth-switch">
          Don't have an account?{" "}
          <Link to="/register">Create an account</Link>
        </p>

        <Link to="/" className="back-home">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

export default Login;
