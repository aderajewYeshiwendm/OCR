import { API_BASE } from "../constants";

export async function uploadForOcr(uri, { includePipeline = true } = {}) {
  const form = new FormData();
  form.append("file", { uri, name: "capture.jpg", type: "image/jpeg" });

  const qs = includePipeline ? "" : "?include_pipeline=false";
  const resp = await fetch(`${API_BASE}/ocr${qs}`, {
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

export async function processJournalPages(uris, { onProgress } = {}) {
  const pages = [];
  let pipeline_images = null;
  let ocr_lang = null;

  for (let i = 0; i < uris.length; i++) {
    onProgress?.(i + 1, uris.length);
    const data = await uploadForOcr(uris[i], { includePipeline: i === 0 });
    if (i === 0) pipeline_images = data.pipeline_images;
    ocr_lang = data.ocr_lang;
    pages.push({
      page: i + 1,
      extracted_text: data.extracted_text,
      word_count: data.word_count,
      avg_confidence: data.avg_confidence,
      doc_detected: data.doc_detected,
    });
  }

  const combined_text = pages
    .map(
      (p) =>
        `--- ገጽ ${p.page} / Page ${p.page} ---\n${(p.extracted_text || "").trim()}`
    )
    .join("\n\n");

  const confs = pages.map((p) => p.avg_confidence).filter((c) => c > 0);
  const avg_confidence = confs.length
    ? Math.round(confs.reduce((a, b) => a + b, 0) / confs.length)
    : 0;

  return {
    mode: "batch",
    page_count: pages.length,
    pages,
    combined_text,
    extracted_text: combined_text,
    total_word_count: pages.reduce((s, p) => s + (p.word_count || 0), 0),
    word_count: pages.reduce((s, p) => s + (p.word_count || 0), 0),
    avg_confidence,
    doc_detected: pages.some((p) => p.doc_detected),
    pipeline_images,
    ocr_lang,
  };
}

export async function exportDocx({ title = "Amharic Journal OCR", pages }) {
  const resp = await fetch(`${API_BASE}/ocr/docx`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      pages: pages.map((p) => ({
        page: p.page,
        title: p.title,
        text: p.text ?? p.extracted_text ?? "",
      })),
    }),
  });

  if (!resp.ok) {
    const e = await resp.json().catch(() => ({ detail: `HTTP ${resp.status}` }));
    throw new Error(e.detail || `HTTP ${resp.status}`);
  }

  return resp.json();
}
