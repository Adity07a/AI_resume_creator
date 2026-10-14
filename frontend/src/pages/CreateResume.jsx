
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
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  
  function handleFileChange(event) {
    setError("");
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedExtensions = [".pdf", ".docx"];
    const fileName = file.name.toLowerCase();
    const isAllowed = allowedExtensions.some((extension) =>
      fileName.endsWith(extension)
    );

    if (!isAllowed) {
      setSelectedFile(null);
      setError("Please select a PDF or DOCX file.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setSelectedFile(null);
      setError("File size must be less than 10 MB.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }



async function handleContinue() {
  if (!selectedFile) {
    setError("Please select your resume first.");
    return;
  }

  setError("");

  try {
    let extractedText = "";
    const fileName = selectedFile.name.toLowerCase();
    const arrayBuffer = await selectedFile.arrayBuffer();

    if (fileName.endsWith(".pdf")) {
      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
      }).promise;

      const pages = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const groupedLines = new Map();

        for (const item of content.items) {
          if (!("str" in item) || !item.str.trim()) continue;

          const y = Math.round(item.transform[5]);

          if (!groupedLines.has(y)) {
            groupedLines.set(y, []);
          }

          groupedLines.get(y).push(item.str.trim());
        }

        const pageLines = [...groupedLines.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([, parts]) => parts.join(" "))
          .filter(Boolean);

        pages.push(pageLines.join("\n"));
      }

      extractedText = pages.join("\n");
    } else if (fileName.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ arrayBuffer });
      extractedText = result.value;
    }

    if (!extractedText.trim()) {
      setError(
        "No readable text found. This may be a scanned PDF. Please try another file."
      );
      return;
    }

    sessionStorage.setItem("resumeai-imported-text", extractedText);
    navigate("/resume-builder?import=1");
  } catch {
    setError("Could not read this file. Please try another PDF or DOCX.");
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
          Start from scratch or choose an existing resume to continue.
        </p>

        <div className="auth-form">
          <Link to="/resume-builder" className="primary-btn auth-submit">
            Start from Scratch
          </Link>

          <Link
              to="/job-description"
             className="secondary-btn auth-submit"
            >
         <span>🎯</span> Tailor Resume for a Job
           </Link>

          <div className="upload-section">
            <h3>Upload Existing Resume</h3>
            <p className="auth-description">
              Select a PDF or DOCX file (maximum 10 MB).
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              aria-label="Choose an existing resume"
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
              onClick={() => fileInputRef.current?.click()}
            >
              Choose Resume File
            </button>

            <button
              type="button"
              className="primary-btn auth-submit"
              onClick={handleContinue}
              disabled={!selectedFile}
            >
              Continue
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
