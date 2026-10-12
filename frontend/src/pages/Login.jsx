import { useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";

function Login() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleLogin(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setSuccess(
      "Login successfully!."
    );
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
            <label htmlFor="email">Email Address</label>
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

          <button type="submit" className="primary-btn auth-submit">
            Login
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