# Multimodal Video Search

A local AI video-search workspace with a React frontend. Search video moments using both audio transcription and visual frame captions.

## What it does

1. Accepts a local video file or downloads one with `yt-dlp`.
2. Extracts frames at a configurable interval with FFmpeg.
3. Transcribes the audio with Whisper.
4. Captions sampled frames with Salesforce BLIP.
5. Embeds audio and visual documents with `all-MiniLM-L6-v2`.
6. Indexes the documents with FAISS and searches them from the command line.

## Setup

Install Python 3.10+ and FFmpeg, then run:

```powershell
cd multimodal_video_search
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Install Node.js 18+ as well, then install the frontend dependencies:

```powershell
cd web
npm install
cd ..
```

If YouTube requires authentication, export a `cookies.txt` file and pass it with `--cookies`. Keep that file private; it is ignored by Git.

## Run the web app

Start the Python API in one terminal:

```powershell
cd multimodal_video_search
.\.venv\Scripts\Activate.ps1
uvicorn api:app --reload --port 8000
```

Start the React development server in a second terminal:

```powershell
cd multimodal_video_search\web
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Upload a video or paste a URL, choose the frame interval, and click **Build searchable index**. When processing finishes, type a natural-language query and click **Search**. Each result includes a relevance score, timestamp, matching text, and the sampled frame.

The first processing run downloads Whisper, BLIP, and SentenceTransformer model files. CPU processing may take several minutes; CUDA is used automatically when available. Keep the API terminal running while using the frontend.

## Run the command-line version

Using a local video:

```powershell
python app.py --video path\to\video.mp4 --query "missile launch"
```

Using the source URL from the supplied notebook:

```powershell
python app.py --url "https://www.youtube.com/watch?v=CiVelfKFtcQ" --cookies path\to\cookies.txt --query "missile launch"
```

The first run downloads model files and can take time, especially on CPU. Results are printed with timestamps and source text. Use `--top-k` to change the number of matches.

## Project layout

- `app.py` — reusable pipeline and command-line interface.
- `api.py` — FastAPI backend used by the React app.
- `web/` — React/Vite frontend.
- `requirements.txt` — Python dependencies.
- `data/` — generated videos, frames, metadata, and indexes (created at runtime).
- `.gitignore` — excludes generated media, model caches, and credentials.
