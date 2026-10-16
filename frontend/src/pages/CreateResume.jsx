
import { Link, useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth/mammoth.browser";
import "../App.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

function CreateResume() {
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

        for (
          let pageNumber = 1;
          pageNumber <= pdf.numPages;
          pageNumber++
        ) {
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          const lines = new Map();

          for (const item of content.items) {
            if (!("str" in item) || !item.str.trim()) {
              continue;
            }

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

        extractedText = pages.join("\n\n");
      } else if (fileName.endsWith(".docx")) {
        const result = await mammoth.extractRawText({
          arrayBuffer,
        });

        extractedText = result.value || "";
      }

      if (!extractedText.trim()) {
        setError(
          "No readable text was found. If your PDF is scanned, please try a text-based PDF or DOCX file."
        );
        return;
      }

      // Pass the extracted resume text to the existing editor.
      sessionStorage.setItem(
        "resumeai-imported-text",
        extractedText
      );

      // Preserve the source filename for the editor if needed.
      sessionStorage.setItem(
        "resumeai-imported-filename",
        selectedFile.name
      );

      navigate("/resume-builder?import=1");
    } catch (err) {
      console.error("Resume import failed:", err);

      setError(
        "Could not read this file. Please check that it is a valid PDF or DOCX and try again."
      );
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

        <h1>Create Your Resume</h1>

        <p className="auth-description">
          Create a new resume, tailor one for a job, or import
          your existing resume.
        </p>

        <div className="auth-form">
          <Link
            to="/resume-builder"
            className="primary-btn auth-submit"
          >
            Start from Scratch
          </Link>

          <Link
            to="/job-description"
            className="secondary-btn auth-submit"
          >
            <span aria-hidden="true">🎯</span>{" "}
            Tailor Resume for a Job
          </Link>

          <div className="upload-section">
            <h3>Upload Existing Resume</h3>

            <p className="auth-description">
              Import a PDF or DOCX file (maximum 10 MB).
              Your extracted text will be sent to the resume editor.
            </p>

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
              Choose Resume File
            </button>

            <button
              type="button"
              className="primary-btn auth-submit"
              onClick={handleContinue}
              disabled={!selectedFile || isReading}
            >
              {isReading ? "Reading Resume..." : "Continue"}
            </button>
          </div>

          <Link to="/dashboard" className="back-home">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default CreateResume;
