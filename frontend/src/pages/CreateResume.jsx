
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth/mammoth.browser";
import "../App.css";
import { apiRequest } from "../services/api";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function getAccessToken() {
  return (
    localStorage.getItem("resumeai-access-token") ||
    sessionStorage.getItem("resumeai-access-token")
  );
}

function CreateResume() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");

  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState("");
  const [isReading, setIsReading] = useState(false);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  function handleFileChange(event) {
    setError("");

    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const fileName = file.name.toLowerCase();
    const isPdf = fileName.endsWith(".pdf");
    const isDocx = fileName.endsWith(".docx");

    if (!isPdf && !isDocx) {
      setSelectedFile(null);
      setError("Please select a PDF or DOCX file.");
      event.target.value = "";
      return;
    }

    if (file.size === 0) {
      setSelectedFile(null);
      setError("The selected file is empty. Please choose another file.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setError("File size must not exceed 5 MB.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  async function extractText(file) {
    const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();

    if (fileName.endsWith(".pdf")) {
      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
      }).promise;

      const pages = [];

      for (
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber++
      ) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const lines = new Map();

        for (const item of content.items) {
          if (!("str" in item) || !item.str.trim()) continue;

          const y = Math.round(item.transform[5]);

          if (!lines.has(y)) {
            lines.set(y, []);
          }

          lines.get(y).push(item.str.trim());
        }

        const pageLines = [...lines.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([, parts]) => parts.join(" "))
          .filter(Boolean);

        pages.push(pageLines.join("\n"));
      }

      return pages.join("\n\n");
    }

    if (fileName.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value || "";
    }

    return "";
  }

  async function handleContinue() {
    if (!selectedFile || isReading) {
      setError("Please select your resume first.");
      return;
    }

    if (!getAccessToken()) {
      setError("Please log in before uploading your resume.");
      return;
    }

    setError("");
    setIsReading(true);

    try {
      // Extract text locally for the existing editor import flow.
      const extractedText = await extractText(selectedFile);

      if (!extractedText.trim()) {
        setError(
          "No readable text found. Try a text-based PDF or DOCX."
        );
        return;
      }

      // Send the original file to the authenticated backend parser.
      const formData = new FormData();
      formData.append("file", selectedFile);

      const parsedResume = await apiRequest(
        "/resumes/ai/parse-resume/",
        {
          method: "POST",
          body: formData,
        }
      );

      if (
        !parsedResume ||
        typeof parsedResume !== "object" ||
        Array.isArray(parsedResume)
      ) {
        throw new Error(
          "The resume parser returned an invalid response."
        );
      }

      sessionStorage.setItem(
        "resumeai-imported-text",
        extractedText
      );

      sessionStorage.setItem(
        "resumeai-imported-filename",
        selectedFile.name
      );

      sessionStorage.setItem(
        "resumeai-parsed-resume",
        JSON.stringify(parsedResume)
      );

      sessionStorage.setItem(
        "resumeai-creation-mode",
        mode === "tailor" ? "ai" : "manual"
      );

      navigate(
        mode === "tailor"
          ? "/job-description?source=upload"
          : "/resume-builder?import=1"
      );
    } catch (err) {
      console.error("Resume import failed:", err);

      setError(
        err.message ||
          "Could not process this resume. Check your connection and try again."
      );
    } finally {
      setIsReading(false);
    }
  }

  function renderUploadSection(isTailor = false) {
    return (
      <div className="upload-section">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          aria-label="Choose an existing resume"
          disabled={isReading}
        />

        {selectedFile && (
          <p className="form-success" role="status">
            Selected: {selectedFile.name}
          </p>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          className="secondary-btn"
          onClick={() => {
            setError("");
            fileInputRef.current?.click();
          }}
          disabled={isReading}
          style={{ marginTop: "0.5rem" }}
        >
          Browse Resume File
        </button>

        <button
          type="button"
          className="primary-btn auth-submit"
          onClick={handleContinue}
          disabled={!selectedFile || isReading}
          style={{ marginTop: "0.75rem" }}
        >
          {isReading
            ? "Processing Resume..."
            : isTailor
              ? "Continue to Job Description"
              : "Continue to Editor"}
        </button>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/dashboard" className="auth-logo">
          <span className="logo-icon">R</span>
          Resume<span className="logo-highlight">AI</span>
        </Link>

        {!mode && (
          <>
            <h1>Create New Resume</h1>
            <p className="auth-description">
              Choose how you want to start building your professional resume.
            </p>
          </>
        )}

        {mode === "upload" && (
          <>
            <h1>Upload Existing Resume</h1>
            <p className="auth-description">
              Upload your current resume to import it into the editor.
              PDF and DOCX files up to 5 MB are supported.
            </p>
          </>
        )}

        {mode === "tailor" && (
          <>
            <h1>Tailor for Job</h1>
            <p className="auth-description">
              Start from scratch or upload an existing resume before
              matching it with a job description.
            </p>
          </>
        )}

        <div className="auth-form">
          {!mode && (
            <>
              <Link to="/resume-builder" className="primary-btn auth-submit">
                1. Start from Scratch
              </Link>

              <Link
                to="/create-resume?mode=upload"
                className="secondary-btn auth-submit"
              >
                2. Choose / Upload Existing
              </Link>

              <Link
                to="/create-resume?mode=tailor"
                className="secondary-btn auth-submit"
              >
                🎯 Tailor for Job
              </Link>
            </>
          )}

          {mode === "upload" && (
            <>
              {renderUploadSection()}

              <Link
                to="/create-resume"
                className="back-home"
                style={{ marginTop: "1rem", display: "inline-block" }}
              >
                ← Back to Create Options
              </Link>
            </>
          )}

          {mode === "tailor" && (
            <div
              className="tailor-options-section"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <p
                className="auth-description"
                style={{
                  color: "#4f46e5",
                  fontWeight: "600",
                  margin: "0",
                }}
              >
                Select a source for your resume:
              </p>

              <Link
                to="/resume-builder?tailor=true"
                className="primary-btn auth-submit"
                style={{ textAlign: "center" }}
              >
                ✦ Start from Scratch &amp; Tailor for Job
              </Link>

              <div
                style={{
                  textAlign: "center",
                  margin: "0.2rem 0",
                  color: "#6b7280",
                  fontSize: "0.9rem",
                }}
              >
                — OR —
              </div>

              <div
                style={{
                  borderTop: "1px solid #e5e7eb",
                  paddingTop: "1rem",
                }}
              >
                <h3>Upload Existing Resume for Tailoring</h3>
                {renderUploadSection(true)}
              </div>

              <Link
                to="/create-resume"
                className="back-home"
                style={{ marginTop: "0.5rem", display: "inline-block" }}
              >
                ← Back to Create Options
              </Link>
            </div>
          )}

          <Link
            to="/dashboard"
            className="back-home"
            style={{ marginTop: "1.5rem" }}
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default CreateResume;
