import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");

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
    const username = formData.get("username")?.trim();
    const password = formData.get("password");
    const rememberMe = formData.get("rememberMe") === "on";

    if (!username || !password) {
      setError("Please enter your username and password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Authenticate with Django.
      const response = await fetch(
        `${API_BASE_URL}/auth/login/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.non_field_errors?.[0] ||
            "Invalid username or password."
        );
      }

      if (!data.access || !data.refresh) {
        throw new Error(
          "The server did not return the required tokens."
        );
      }

      // Step 2: Keep the existing Remember me behavior.
      localStorage.removeItem("resumeai-access-token");
      localStorage.removeItem("resumeai-refresh-token");
      sessionStorage.removeItem("resumeai-access-token");
      sessionStorage.removeItem("resumeai-refresh-token");

      const storage = rememberMe ? localStorage : sessionStorage;

      storage.setItem("resumeai-access-token", data.access);
      storage.setItem("resumeai-refresh-token", data.refresh);

      try {
        // Step 3: Fetch the logged-in user's details from Django.
        const userResponse = await fetch(
          `${API_BASE_URL}/auth/me/`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${data.access}`,
              "Content-Type": "application/json",
            },
          }
        );

        const userData = await userResponse.json();

        if (!userResponse.ok) {
          throw new Error(
            userData.detail ||
              "Unable to retrieve your account details."
          );
        }

        // Dashboard reads the user from localStorage.
        localStorage.setItem(
          "resumeai-user",
          JSON.stringify(userData)
        );
      } catch (userError) {
        // Avoid leaving an incomplete login session.
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

        <h1>Welcome Back!</h1>
        <p className="auth-description">
          Login to continue building your professional resume.
        </p>

        <form className="auth-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Enter your username"
              autoComplete="username"
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
            <a href="#forgot-password">Forgot password?</a>
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