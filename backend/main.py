

import cv2
import numpy as np
import pytesseract
import base64
import re
import logging
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image as PILImage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="OCR Pipeline API", version="3.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#  Helpers 

def encode_image(img: np.ndarray) -> str:
    _, buf = cv2.imencode(".png", img)
    return base64.b64encode(buf.tobytes()).decode("utf-8")


def order_points(pts):
    rect = np.zeros((4, 2), dtype="float32")
    s    = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def four_point_transform(image, pts):
    rect = order_points(pts)
    tl, tr, br, bl = rect
    maxW = max(int(np.linalg.norm(br - bl)), int(np.linalg.norm(tr - tl)))
    maxH = max(int(np.linalg.norm(tr - br)), int(np.linalg.norm(tl - bl)))
    dst  = np.array([[0,0],[maxW-1,0],[maxW-1,maxH-1],[0,maxH-1]], dtype="float32")
    M    = cv2.getPerspectiveTransform(rect, dst)
    return cv2.warpPerspective(image, M, (maxW, maxH))


def find_document_contour(edged, orig_area):
    contours, _ = cv2.findContours(edged, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    for c in sorted(contours, key=cv2.contourArea, reverse=True)[:10]:
        if cv2.contourArea(c) < orig_area * 0.1:
            continue
        peri   = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4:
            return approx.reshape(4, 2).astype("float32")
    return None


def deskew(gray):
    thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]
    coords = np.column_stack(np.where(thresh > 0))
    if len(coords) < 10:
        return gray
    angle = cv2.minAreaRect(coords)[-1]
    angle = -(90 + angle) if angle < -45 else -angle
    if abs(angle) < 0.3:
        return gray
    h, w  = gray.shape
    M     = cv2.getRotationMatrix2D((w//2, h//2), angle, 1.0)
    return cv2.warpAffine(gray, M, (w, h), flags=cv2.INTER_CUBIC,
                          borderMode=cv2.BORDER_REPLICATE)


def preprocess_for_ocr(bgr: np.ndarray) -> np.ndarray:
    """
    Proven pipeline for colored forms with dotted lines:
      grayscale → upscale → CLAHE → bilateral filter → Otsu threshold
    Bilateral filter preserves sharp text edges while smoothing repetitive dots.
    """
    gray  = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    h, w  = gray.shape

    target = 2500
    if max(h, w) < target:
        scale = target / max(h, w)
        gray  = cv2.resize(gray, (int(w * scale), int(h * scale)),
                           interpolation=cv2.INTER_CUBIC)

    gray = deskew(gray)

    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    gray  = clahe.apply(gray)

    gray = cv2.bilateralFilter(gray, 9, 75, 75)

    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)

    return binary


def clean_ocr_text(text: str) -> str:
    """
    Post-process Tesseract output to remove form fill artifacts
    (dot sequences, repeated dashes, orphaned punctuation).
    """
    lines = text.split('\n')
    out   = []
    for line in lines:
        line = re.sub(r'[.\-_·•]{3,}', ' ', line)
        line = re.sub(r'([^a-zA-Z0-9\s:,./])\1{2,}', ' ', line)
        line = re.sub(r'  +', ' ', line).strip()
        if re.search(r'[a-zA-Z]{2,}', line):
            out.append(line)
    return '\n'.join(out)


#  Pipeline 

def run_ocr_pipeline(img_bytes: bytes) -> dict:
    nparr    = np.frombuffer(img_bytes, np.uint8)
    original = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if original is None:
        raise ValueError("Could not decode image")

    h, w = original.shape[:2]
    if max(h, w) > 1600:
        s        = 1600 / max(h, w)
        display  = cv2.resize(original, (int(w*s), int(h*s)), interpolation=cv2.INTER_AREA)
    else:
        display  = original.copy()
    dh, dw   = display.shape[:2]
    orig_area = dh * dw

    pipeline = {"original": encode_image(display)}

    #  Canny 
    gray_d  = cv2.cvtColor(display, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray_d, (5, 5), 0)
    canny   = cv2.Canny(blurred, 20, 80)
    dilated = cv2.dilate(canny, np.ones((5, 5), np.uint8), iterations=2)
    pipeline["canny"] = encode_image(cv2.cvtColor(dilated, cv2.COLOR_GRAY2BGR))

    #  Contours 
    contour_img = display.copy()
    doc_corners = find_document_contour(dilated, orig_area)
    if doc_corners is not None:
        cv2.drawContours(contour_img, [doc_corners.astype(int)], -1, (0, 255, 80), 3)
        for pt in doc_corners:
            cv2.circle(contour_img, tuple(pt.astype(int)), 12, (0, 100, 255), -1)
    else:
        cnts, _ = cv2.findContours(dilated, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(contour_img,
                         sorted(cnts, key=cv2.contourArea, reverse=True)[:5],
                         -1, (0, 255, 80), 2)
    pipeline["contours"] = encode_image(contour_img)

    #  Perspective warp 
    if doc_corners is not None:
        warped = four_point_transform(original, doc_corners * (max(h,w)/max(dh,dw)))
    else:
        warped = original.copy()

    wh, ww = warped.shape[:2]
    if max(wh, ww) > 1600:
        ws = 1600 / max(wh, ww)
        warped_display = cv2.resize(warped, (int(ww*ws), int(wh*ws)))
    else:
        warped_display = warped.copy()
    pipeline["warped"] = encode_image(warped_display)

    #  Threshold (for display — downscaled version) 
    binary_full   = preprocess_for_ocr(warped) 
    bh, bw        = binary_full.shape
    if max(bh, bw) > 1600:
        bs         = 1600 / max(bh, bw)
        binary_disp = cv2.resize(binary_full, (int(bw*bs), int(bh*bs)),
                                 interpolation=cv2.INTER_AREA)
    else:
        binary_disp = binary_full.copy()
    pipeline["threshold"] = encode_image(cv2.cvtColor(binary_disp, cv2.COLOR_GRAY2BGR))

    #  Tesseract OCR 
    pil_img    = PILImage.fromarray(binary_full)
    best_text  = ""
    best_score = 0

    for psm in [6, 4, 3]:
        cfg   = f"--oem 3 --psm {psm} -c preserve_interword_spaces=1"
        raw   = pytesseract.image_to_string(pil_img, config=cfg, lang="eng")
        cleaned = clean_ocr_text(raw)
        score   = sum(1 for ww in cleaned.split() if ww.isalpha() and len(ww) > 1)
        logger.info(f"PSM {psm}: {score} clean words")
        if score > best_score:
            best_score = score
            best_text  = cleaned

    # Word stats
    data      = pytesseract.image_to_data(pil_img, config="--oem 3 --psm 6",
                                          output_type=pytesseract.Output.DICT)
    good_words = [ww for ww, c in zip(data["text"], data["conf"])
                  if ww.strip() and int(c) > 40]
    confs      = [int(c) for c in data["conf"] if int(c) > 0]
    avg_conf   = int(np.mean(confs)) if confs else 0

    return {
        "pipeline_images": pipeline,
        "extracted_text":  best_text,
        "word_count":      best_score,
        "avg_confidence":  avg_conf,
        "doc_detected":    doc_corners is not None,
        "image_size":      {"width": w, "height": h},
    }


# Endpoints 

@app.get("/")
async def root():
    return {"service": "OCR Pipeline API", "version": "3.0.0"}

@app.get("/health")
async def health():
    try:
        return {"status": "ok", "tesseract": str(pytesseract.get_tesseract_version())}
    except Exception as e:
        return {"status": "degraded", "error": str(e)}

@app.post("/ocr")
async def ocr_endpoint(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")
    data = await file.read()
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(413, "Image too large (max 25 MB)")
    try:
        return run_ocr_pipeline(data)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.error(f"Pipeline error: {e}", exc_info=True)
        raise HTTPException(500, f"Pipeline error: {str(e)}")