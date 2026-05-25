import { API_BASE } from "../constants";

export async function uploadForOcr(uri) {
  const form = new FormData();
  form.append("file", { uri, name: "capture.jpg", type: "image/jpeg" });

  const resp = await fetch(`${API_BASE}/ocr`, {
    method: "POST",
    body: form,
    headers: { Accept: "application/json" },
  });

  if (!resp.ok) {
    const e = await resp.json().catch(() => ({ detail: `HTTP ${resp.status}` }));
    throw new Error(e.detail || `HTTP ${resp.status}`);
  }

  return resp.json();
}
