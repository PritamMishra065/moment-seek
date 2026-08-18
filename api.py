"""Local HTTP API for the React video-search frontend."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import faiss
import numpy as np
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sentence_transformers import SentenceTransformer

from app import build_index, caption_frames, download_video, extract_frames, transcribe


ROOT = Path(__file__).parent
DATA = ROOT / "data"
VIDEO = DATA / "video.mp4"
FRAMES = DATA / "frames"
INDEX = DATA / "index.faiss"
DOCUMENTS = DATA / "documents.json"
DATA.mkdir(exist_ok=True)

app = FastAPI(title="Multimodal Video Search API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/media", StaticFiles(directory=str(DATA)), name="media")


def public_frame_url(path: str | None) -> str | None:
    if not path:
        return None
    return "/media/frames/" + Path(path).name


@app.get("/api/health")
def health() -> dict:
    return {"ready": INDEX.exists() and DOCUMENTS.exists(), "video": VIDEO.exists()}


@app.post("/api/process")
async def process_video(
    video: UploadFile | None = File(default=None),
    url: str = Form(default=""),
    interval: float = Form(default=5.0),
    cookies: UploadFile | None = File(default=None),
) -> dict:
    if not video and not url.strip() and not VIDEO.exists():
        raise HTTPException(400, "Upload a video or provide a video URL.")
    try:
        DATA.mkdir(exist_ok=True)
        if video and video.filename:
            with VIDEO.open("wb") as output:
                shutil.copyfileobj(video.file, output)
        elif url.strip():
            cookie_path = None
            if cookies and cookies.filename:
                cookie_path = DATA / "cookies.txt"
                with cookie_path.open("wb") as output:
                    shutil.copyfileobj(cookies.file, output)
            download_video(url.strip(), VIDEO, cookie_path)

        device = "cuda" if torch.cuda.is_available() else "cpu"
        frames = extract_frames(VIDEO, FRAMES, interval)
        segments = transcribe(VIDEO, device)
        captions = caption_frames(frames, device)
        documents = [
            {"text": "Auditory: " + segment["text"].strip(), "timestamp": segment["start"]}
            for segment in segments
        ] + captions
        documents.sort(key=lambda item: item["timestamp"])
        build_index(documents, INDEX, DOCUMENTS)
        return {"ok": True, "frames": len(frames), "segments": len(segments), "device": device}
    except Exception as exc:
        raise HTTPException(500, str(exc)) from exc


@app.get("/api/search")
def search(q: str, top_k: int = 6) -> dict:
    if not INDEX.exists() or not DOCUMENTS.exists():
        raise HTTPException(409, "Process a video before searching.")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    index = faiss.read_index(str(INDEX))
    documents = json.loads(DOCUMENTS.read_text(encoding="utf-8"))
    vector = model.encode([q], convert_to_numpy=True).astype(np.float32)
    distances, indices = index.search(vector, min(top_k, index.ntotal))
    results = []
    for distance, index_value in zip(distances[0], indices[0]):
        item = documents[int(index_value)]
        results.append({
            "text": item["text"],
            "timestamp": item["timestamp"],
            "distance": float(distance),
            "frame": public_frame_url(item.get("path")),
        })
    return {"query": q, "results": results}
