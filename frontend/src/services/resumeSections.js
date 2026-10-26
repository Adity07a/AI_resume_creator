
import { apiRequest } from "./api";

const SECTIONS_URL = "/resume-sections/";

function requireId(value, label) {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${label} is required.`);
  }
}

export function getResumeSections() {
  return apiRequest(SECTIONS_URL);
}

export function getResumeSection(sectionId) {
  requireId(sectionId, "Section ID");

  return apiRequest(
    `${SECTIONS_URL}${encodeURIComponent(sectionId)}/`
  );
}

export function updateResumeSection(sectionId, updates) {
  requireId(sectionId, "Section ID");

  return apiRequest(
    `${SECTIONS_URL}${encodeURIComponent(sectionId)}/`,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    }
  );
}

export function deleteResumeSection(sectionId) {
  requireId(sectionId, "Section ID");

  return apiRequest(
    `${SECTIONS_URL}${encodeURIComponent(sectionId)}/`,
    { method: "DELETE" }
  );
}

export function reorderResumeSections(versionId, sectionIds) {
  requireId(versionId, "Version ID");

  if (!Array.isArray(sectionIds)) {
    throw new Error("Section IDs must be an array.");
  }

  return apiRequest(`${SECTIONS_URL}reorder/`, {
    method: "POST",
    body: JSON.stringify({
      version_id: versionId,
      section_ids: sectionIds,
    }),
  });
}

export function createResumeSection(
  resumeId,
  versionId,
  section
) {
  requireId(resumeId, "Resume ID");
  requireId(versionId, "Version ID");

  return apiRequest(
    `/resumes/${encodeURIComponent(resumeId)}/versions/${encodeURIComponent(versionId)}/sections/`,
    {
      method: "POST",
      body: JSON.stringify(section),
    }
  );
}
