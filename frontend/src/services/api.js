const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1";

export async function apiRequest(path, options = {}) {
  const token =
    localStorage.getItem("resumeai-access-token") ||
    sessionStorage.getItem("resumeai-access-token");

  const headers = {
    ...(options.body instanceof FormData
      ? {}
      : options.body
        ? { "Content-Type": "application/json" }
        : {}),
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const result = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const message =
      result?.detail ||
      (result && JSON.stringify(result)) ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  return result;
}