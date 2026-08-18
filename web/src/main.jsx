import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Brain, ChevronRight, FileVideo, LoaderCircle, Search, Sparkles, Upload, Zap } from 'lucide-react'
import './styles.css'

const API = 'http://localhost:8000'
const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${(seconds % 60).toFixed(1).padStart(4, '0')}`

export default function App() {
  const [file, setFile] = useState(null)
  const [url, setUrl] = useState('')
  const [interval, setIntervalValue] = useState(5)
  const [query, setQuery] = useState('missile launch')
  const [results, setResults] = useState([])
  const [stats, setStats] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Ready to build your video index.')

  async function processVideo(event) {
    event.preventDefault()
    setBusy(true); setMessage('Analyzing video: extracting frames, listening to audio, and captioning scenes…')
    const form = new FormData()
    if (file) form.append('video', file)
    if (url) form.append('url', url)
    form.append('interval', interval)
    try {
      const response = await fetch(`${API}/api/process`, { method: 'POST', body: form })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Processing failed')
      setStats(data); setMessage(`Index ready · ${data.frames} frames · ${data.segments} transcript segments · ${data.device}`)
    } catch (error) { setMessage(error.message) } finally { setBusy(false) }
  }

  async function searchVideo(event) {
    event.preventDefault(); if (!query.trim()) return
    setBusy(true); setMessage('Searching the visual and audio index…')
    try {
      const response = await fetch(`${API}/api/search?q=${encodeURIComponent(query)}&top_k=6`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Search failed')
      setResults(data.results); setMessage(`${data.results.length} relevant moments found.`)
    } catch (error) { setMessage(error.message) } finally { setBusy(false) }
  }

  return <main className="shell">
    <nav className="nav"><div className="brand"><span className="brand-mark"><Brain size={19}/></span>Moment<span className="muted">/</span>Seek</div><div className="nav-pill"><span className="pulse"/> LOCAL AI WORKSPACE</div></nav>
    <section className="hero"><div className="eyebrow"><Sparkles size={15}/> MULTIMODAL VIDEO INTELLIGENCE</div><h1>Find the moment.<br/><em>Not the whole video.</em></h1><p>Turn long-form video into a searchable timeline using what was said and what was shown.</p></section>
    <section className="workspace">
      <aside className="panel source-panel"><div className="panel-heading"><span className="step">01</span><div><h2>Build your index</h2><p>Give your video a source to begin.</p></div></div>
        <form onSubmit={processVideo}>
          <label className="dropzone">{file ? <><FileVideo size={26}/><strong>{file.name}</strong><small>Video selected</small></> : <><Upload size={26}/><strong>Drop a video here</strong><small>MP4, WebM or MOV · up to your local limits</small></>}<input type="file" accept="video/*" onChange={e => setFile(e.target.files[0])}/></label>
          <div className="or"><span>OR USE A URL</span></div><input className="text-input" placeholder="https://youtube.com/watch?..." value={url} onChange={e => setUrl(e.target.value)}/>
          <label className="range-label"><span>Frame interval</span><b>{interval}s</b></label><input className="range" type="range" min="2" max="20" value={interval} onChange={e => setIntervalValue(e.target.value)}/>
          <button className="primary" disabled={busy}><Zap size={17}/>{busy ? 'Processing…' : 'Build searchable index'}<ChevronRight size={17}/></button>
        </form>
        <div className="status"><span className={busy ? 'status-dot working' : 'status-dot'}/><span>{message}</span></div>
      </aside>
      <section className="panel search-panel"><div className="panel-heading"><span className="step">02</span><div><h2>Search your video</h2><p>Ask in natural language. Results know the context.</p></div></div>
        <form className="searchbar" onSubmit={searchVideo}><Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Try: people discussing the launch…"/><button disabled={busy}><Search size={17}/> Search</button></form>
        {stats && <div className="stats"><span><b>{stats.frames}</b> frames</span><span><b>{stats.segments}</b> audio moments</span><span><b>{stats.device}</b> device</span></div>}
        <div className="results">{results.length ? results.map((result, i) => <article className="result" key={`${result.timestamp}-${i}`}><div className="thumb">{result.frame && <img src={`${API}${result.frame}`} />}</div><div className="result-copy"><div className="result-meta"><span className="rank">0{i + 1}</span><span>{formatTime(result.timestamp)}</span><span className="score">match {(1 / (1 + result.distance)).toFixed(2)}</span></div><p>{result.text}</p></div></article>) : <div className="empty"><div className="empty-icon"><Search size={25}/></div><h3>Your moments will appear here</h3><p>Build an index, then search for a person, scene, phrase, or idea.</p></div>}</div>
      </section>
    </section>
    <footer><span>Powered by Whisper · BLIP · FAISS</span><span>Everything runs on your machine</span></footer>
  </main>
}

createRoot(document.getElementById('root')).render(<App />)
