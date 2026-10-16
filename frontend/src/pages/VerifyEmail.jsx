import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "../App.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState(
    "Verifying your email address..."
  );

  useEffect(() => {
    let cancelled = false;

    async function verifyEmail() {
      if (!token) {
        setStatus("error");
        setMessage(
          "The verification link is missing its token. Request a new email."
        );
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/auth/verify-email/confirm/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token }),
          }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "This verification link is invalid or expired."
          );
        }

        if (!cancelled) {
          setStatus("success");
          setMessage(
            data.detail ||
              "Your email has been verified successfully."
          );
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setMessage(
            error instanceof TypeError
              ? "Unable to connect to Django. Please try again."
              : error.message
          );
        }
      }
    }

    verifyEmail();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo">
          <span className="logo-icon">R</span>
          Resume<span className="logo-highlight">AI</span>
        </Link>

        <h1>
          {status === "loading"
            ? "Verify your email"
            : status === "success"
              ? "Email verified!"
              : "Verification unsuccessful"}
        </h1>

        <p
          role={status === "error" ? "alert" : "status"}
          className={
            status === "error" ? "form-error" : "auth-description"
          }
        >
          {message}
        </p>

        {status === "success" && (
          <Link
            to="/login"
            className="primary-btn auth-submit"
          >
            Continue to Login
          </Link>
        )}

        {status === "error" && (
          <Link
            to="/resend-verification"
            className="primary-btn auth-submit"
          >
            Request a New Verification Link
          </Link>
        )}

        {status === "loading" && (
          <p className="auth-description">
            Please keep this page open.
          </p>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;