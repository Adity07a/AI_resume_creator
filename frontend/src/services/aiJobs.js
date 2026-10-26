
import { apiRequest } from "./api";

const AI_JOBS_URL = "/ai-jobs/";

export function createAIJob(jobType, payload) {
  if (!jobType || !payload || typeof payload !== "object") {
    throw new Error("Job type and payload are required.");
  }

  return apiRequest(AI_JOBS_URL, {
    method: "POST",
    body: JSON.stringify({
      job_type: jobType,
      payload,
    }),
  });
}

export function getAIJob(jobId) {
  if (!jobId) {
    throw new Error("AI job ID is required.");
  }

  return apiRequest(
    `${AI_JOBS_URL}${encodeURIComponent(jobId)}/`
  );
}

export function getAIJobHistory({
  status,
  jobType,
  limit = 20,
  offset = 0,
} = {}) {
  const params = new URLSearchParams();

  if (status) params.set("status", status);
  if (jobType) params.set("job_type", jobType);
  params.set("limit", String(limit));
  params.set("offset", String(offset));

  return apiRequest(
    `${AI_JOBS_URL}history/?${params.toString()}`
  );
}
