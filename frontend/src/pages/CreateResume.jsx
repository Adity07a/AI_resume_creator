import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth/mammoth.browser";
import "../App.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

function CreateResume() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode"); // 'upload', 'tailor', or null

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

    if (file.size > 10 * 1024 * 1024) {
      setSelectedFile(null);
      setError("File size must not exceed 10 MB.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  async function handleContinue() {
    if (!selectedFile || isReading) {
      setError("Please select your resume first.");
      return;
    }

    setError("");
    setIsReading(true);

    try {
      const fileName = selectedFile.name.toLowerCase();
      const arrayBuffer = await selectedFile.arrayBuffer();
      let extractedText = "";

      if (fileName.endsWith(".pdf")) {
        const pdf = await pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
        }).promise;

        const pages = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          const lines = new Map();

          for (const item of content.items) {
            if (!("str" in item) || !item.str.trim()) continue;
            const y = Math.round(item.transform[5]);
            if (!lines.has(y)) lines.set(y, []);
            lines.get(y).push(item.str.trim());
          }

          const pageLines = [...lines.entries()]
            .sort((a, b) => b[0] - a[0])
            .map(([, parts]) => parts.join(" "))
            .filter(Boolean);

          pages.push(pageLines.join("\n"));
        }

        extractedText = pages.join("\n\n");
      } else if (fileName.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value || "";
      }

      if (!extractedText.trim()) {
        setError("No readable text found. Try a text-based PDF or DOCX.");
        return;
      }

      sessionStorage.setItem("resumeai-imported-text", extractedText);
      sessionStorage.setItem("resumeai-imported-filename", selectedFile.name);

      // Navigate to Job Description page with imported data
      navigate("/job-description?imported=1");
    } catch (err) {
      console.error("Resume import failed:", err);
      setError("Could not read this file. Please try a valid PDF or DOCX.");
    } finally {
      setIsReading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/dashboard" className="auth-logo">
          <span className="logo-icon">R</span>
          Resume<span className="logo-highlight">AI</span>
        </Link>

        {/* Dynamic Titles based on Notebook Diagram Flow */}
        {mode === "upload" ? (
          <>
            <h1>Upload Existing Resume</h1>
            <p className="auth-description">
              Upload your current resume file to import and improve it.
            </p>
          </>
        ) : mode === "tailor" ? (
          <>
            <h1>Tailor for Job</h1>
            <p className="auth-description">
              Choose how you want to provide your resume before matching with a Job Description (JD).
            </p>
          </>
        ) : (
          <>
            <h1>Create New Resume</h1>
            <p className="auth-description">
              Choose how you want to start building your professional resume.
            </p>
          </>
        )}

        <div className="auth-form">
          {/* Main selection view when no specific sub-mode is selected */}
          {!mode && (
            <>
              <Link to="/resume-builder" className="primary-btn auth-submit">
                1. Start from Scratch
              </Link>
              <Link to="/create-resume?mode=upload" className="secondary-btn auth-submit">
                2. Choose / Upload Existing
              </Link>
              <Link to="/create-resume?mode=tailor" className="secondary-btn auth-submit">
                🎯 Tailor for Job
              </Link>
            </>
          )}

          {/* Tailor Flow Sub-options (As per notebook diagram: Start from Scratch OR Upload Existing + JD) */}
          {mode === "tailor" && (
            <div className="tailor-options-section" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <p className="auth-description" style={{ color: "#4f46e5", fontWeight: "600", margin: "0" }}>
                Select a source for your resume to tailor:
              </p>

              {/* Option A: Start from Scratch */}
              <Link to="/resume-builder?tailor=true" className="primary-btn auth-submit" style={{ textAlign: "center" }}>
                ✦ Start from Scratch & Tailor for Job
              </Link>

              <div style={{ textAlign: "center", margin: "0.2rem 0", color: "#6b7280", fontSize: "0.9rem" }}>
                — OR —
              </div>

              {/* Option B: Upload Existing to Tailor */}
              <div className="upload-section" style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
                <h3>Upload Existing Resume for Tailoring</h3>
                
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
                  {isReading ? "Reading Resume..." : "Continue to Job Description"}
                </button>
              </div>

              <Link to="/create-resume" className="back-home" style={{ marginTop: "0.5rem", display: "inline-block" }}>
                ← Back to Create Options
              </Link>
            </div>
          )}

          {/* Standard Upload Flow View */}
          {mode === "upload" && (
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
              >
                Browse Resume File
              </button>

              <button
                type="button"
                className="primary-btn auth-submit"
                onClick={() => {
                  // Direct upload continue to editor
                  handleContinue();
                }}
                disabled={!selectedFile || isReading}
              >
                {isReading ? "Reading Resume..." : "Continue to Editor"}
              </button>

              <Link to="/create-resume" className="back-home" style={{ marginTop: "1rem", display: "inline-block" }}>
                ← Back to Create Options
              </Link>
            </div>
          )}

          <Link to="/dashboard" className="back-home" style={{ marginTop: "1.5rem" }}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default CreateResume;