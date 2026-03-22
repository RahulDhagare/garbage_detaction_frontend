import React, { useRef, useEffect, useState } from 'react'
const BACKEND_URL = "https://surveillance-api.onrender.com/api/process-image/";

function CameraDetector() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const outCanvasRef = useRef(null)
  const lastUploadRef = useRef(0)

  const [cvReady, setCvReady] = useState(false)
  const [status, setStatus] = useState('Idle')
  const [lastSaved, setLastSaved] = useState(null)

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: { exact: "environment" }
  }
})
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      })
      .catch((err) => {
        console.error("Camera access error:", err)
        setStatus("Camera blocked or not available")
      })

    // ✅ Wait for OpenCV
    const checkCv = setInterval(() => {
      if (window.cv && window.cv.Mat) {
        setCvReady(true)
        clearInterval(checkCv)
      }
    }, 500)

    // ✅ Frame loop
    const interval = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return

      const ctx = canvasRef.current.getContext("2d")
      canvasRef.current.width = videoRef.current.videoWidth
      canvasRef.current.height = videoRef.current.videoHeight
      ctx.drawImage(videoRef.current, 0, 0)

      // Detection stub
      if (cvReady) {
        setStatus("Garbage detected")
        captureAndUpload(canvasRef.current)
      }
    }, 1000) // every 1s (uploads throttled to 8s)

    return () => {
      clearInterval(checkCv)
      clearInterval(interval)
    }
  }, [cvReady])

  async function captureAndUpload(canvas) {
  const now = Date.now()
  if (now - lastUploadRef.current < 8000) return
  lastUploadRef.current = now

  // Convert canvas to blob instead of Base64
  canvas.toBlob(async (blob) => {
    const formData = new FormData()
    formData.append("image", blob, "snapshot.jpg")

    setLastSaved(new Date().toLocaleString())

    try {
      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        body: formData,   // no need for headers, browser sets it
      })
      console.log("📥 Backend response:", await res.json())
    } catch (e) {
      console.error('Upload failed', e)
    }
  }, 'image/jpeg', 0.9)
}


  return (
     <div className="detector-root">
      <div className="video-wrap">
        <video ref={videoRef} className="video" playsInline muted />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <canvas ref={outCanvasRef} className="overlay" />
        <div className="status-badge">
          {cvReady ? 'OpenCV ready' : 'Loading OpenCV...'}
        </div>
        <div className={`detection ${status}`}>{status}</div>
      </div>
      <div className="controls">
        <p>Detection status: <strong>{status}</strong></p>
        <p>Last saved: <strong>{lastSaved || '—'}</strong></p>
        <small>
          Tip: allow camera and position so garbage appears clearly in frame.
        </small>
        <button 
          onClick={() => captureAndUpload(canvasRef.current)} 
          className="snapshot-btn"
        >
          Save Snapshot
        </button>
      </div>
    </div>
  );
  
}

export default CameraDetector

