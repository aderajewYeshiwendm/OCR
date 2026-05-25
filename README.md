# Document Scan OCR

Mobile document scanner with a classical computer-vision pipeline and OCR. Capture or pick an image on a phone, send it to a FastAPI backend, and inspect each pipeline stage plus extracted text.

**Approach:** Classical CV (OpenCV) for geometry and preprocessing, Tesseract for text recognition.

---

## Features

- Live camera capture and gallery upload (Expo / React Native)
- Server-side pipeline visualization: Original → Canny → Contours → Warped → Threshold
- Perspective correction when a 4-corner document is detected
- OCR with multi-PSM Tesseract scoring and form-artifact cleanup
- Result metrics: document detected, word count, average confidence
- Copy extracted text to clipboard

---

## Architecture

```
┌─────────────────────┐         POST /ocr (multipart)         ┌──────────────────────┐
│  React Native App   │  ──────────────────────────────────►  │  FastAPI Backend     │
│  (Expo SDK 54)      │  ◄──────────────────────────────────  │  OpenCV + Tesseract  │
│  frontend/          │         JSON + base64 PNG stages      │  backend/            │
└─────────────────────┘                                       └──────────────────────┘
```

| Component | Stack |
|-----------|--------|
| Mobile app | React Native 0.81, Expo 54, expo-camera, expo-image-picker, expo-clipboard |
| API server | FastAPI, Uvicorn, OpenCV, NumPy, Pillow, pytesseract |
| OCR engine | Tesseract OCR (system binary) |

---

## Project structure

```
OCR/
├── README.md
├── backend/
│   ├── main.py              # API + CV/OCR pipeline
│   └── requirements.txt
└── frontend/
    ├── App.js               # App state and navigation
    ├── index.js             # Expo entry + SafeAreaProvider
    ├── app.json
    ├── package.json
    └── src/
        ├── constants.js     # API_BASE, pipeline steps
        ├── styles.js
        ├── api/ocr.js       # Upload helper
        ├── components/      # Stat, PipelineImage
        └── screens/         # Permission, Camera, Result
```

---

## Prerequisites

### Backend

- Python 3.10+
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) installed on the host

```bash
# Ubuntu / Debian
sudo apt-get update
sudo apt-get install -y tesseract-ocr
```

### Frontend

- Node.js 18+
- npm
- [Expo Go](https://expo.dev/go) on a physical device (recommended), or Android/iOS emulator

Phone and backend machine must be on the **same LAN** when using a local API URL.

---

## Setup and run

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Verify:

```bash
curl http://localhost:8000/health
```

Expected: `{"status":"ok","tesseract":"..."}`

### 2. Frontend

Set the backend URL to your machine’s LAN IP (not `localhost` on a physical phone):

Edit `frontend/src/constants.js`:

```javascript
export const API_BASE = "http://<YOUR_LAN_IP>:8000";
```

Example: `http://192.168.1.42:8000`

```bash
cd frontend
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `a` (Android) / `i` (iOS) for an emulator.

---

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Service name and version |
| `GET` | `/health` | Tesseract availability check |
| `POST` | `/ocr` | Run full pipeline on uploaded image |

### `POST /ocr`

- **Body:** `multipart/form-data`, field `file` (JPEG/PNG, max 25 MB)
- **Response (JSON):**

| Field | Type | Description |
|-------|------|-------------|
| `pipeline_images` | object | Base64 PNG strings keyed by `original`, `canny`, `contours`, `warped`, `threshold` |
| `extracted_text` | string | OCR output after cleanup |
| `word_count` | number | Score from best PSM pass (alpha words length > 1) |
| `avg_confidence` | number | Mean Tesseract confidence (0–100) |
| `doc_detected` | boolean | Whether a 4-point document contour was found |
| `image_size` | object | `{ width, height }` of decoded source image |

---

## CV / OCR pipeline (backend)

1. **Decode & resize** — Load image; downscale display copy to max 1600 px edge.
2. **Canny edges** — Gaussian blur → Canny (20, 80) → dilation.
3. **Contours** — Largest contours; `approxPolyDP` to find a quadrilateral document.
4. **Perspective warp** — `four_point_transform` on full-resolution image when corners exist.
5. **Preprocess for OCR** — Grayscale, upscale (~2500 px), deskew, CLAHE, bilateral filter, Otsu threshold.
6. **Tesseract** — Try PSM 6, 4, 3; pick result with most clean words; regex cleanup for dotted form lines.

**Libraries:** OpenCV and NumPy implement the vision steps; Tesseract performs character recognition. The pipeline logic is custom; the algorithms are standard library functions.

---

## Configuration

| Setting | Location | Default |
|---------|----------|---------|
| API URL | `frontend/src/constants.js` | `http://10.5.232.236:8000` |
| Server port | `uvicorn` command | `8000` |
| Max upload size | `backend/main.py` | 25 MB |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Network error on phone | Use LAN IP in `API_BASE`; ensure firewall allows port 8000 |
| `degraded` on `/health` | Install Tesseract: `sudo apt-get install tesseract-ocr` |
| Empty OCR text | Improve lighting; hold document flat inside frame |
| Document not detected | Increase contrast; avoid heavy background clutter |
| Bundler module errors | `cd frontend && rm -rf node_modules && npm install` |

---

## Course context

Suitable for a **Computer Vision course project (Classical CV track)**: demonstrates edge detection, contour analysis, homography / perspective transform, image enhancement, and integration with a practical mobile client.

---

## License

Academic / course project. Add a license here if you publish or redistribute.
