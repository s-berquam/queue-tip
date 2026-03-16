"use client"

import { useRef, useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { supabase } from "lib/supabase"
import { v4 as uuidv4 } from "uuid"
import { Pacifico, Poppins } from "next/font/google"

const pacifico = Pacifico({ weight: "400", subsets: ["latin"] })
const poppins = Poppins({ weight: ["300", "400", "600"], subsets: ["latin"] })

function SelfiePage() {
  const router = useRouter()
  const params = useSearchParams()
  const song = params.get("song") ?? ""
  const artist = params.get("artist") ?? ""

  const [requestId, setRequestId] = useState<string | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [isPortrait, setIsPortrait] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setRequestId(localStorage.getItem("my_request_id"))
  }, [])

  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)")
    setIsPortrait(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelfieFile(file)
    setSelfiePreview(URL.createObjectURL(file))
  }

  function removeSelfie() {
    setSelfieFile(null)
    setSelfiePreview(null)
    if (cameraRef.current) cameraRef.current.value = ""
  }

  async function handleUpload() {
    if (!selfieFile || !requestId) return
    setUploading(true)
    setErrorMsg("")

    const filename = `${uuidv4()}.jpg`
    const { error: uploadError } = await supabase.storage
      .from("selfies")
      .upload(filename, selfieFile, { contentType: selfieFile.type, upsert: false })

    if (uploadError) {
      setErrorMsg("Upload failed. Please try again.")
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from("selfies").getPublicUrl(filename)

    const { error: updateError } = await supabase
      .from("requests")
      .update({ selfie_url: data.publicUrl, selfie_status: "pending" })
      .eq("id", requestId)

    setUploading(false)

    if (updateError) {
      setErrorMsg("Something went wrong saving your selfie. Try again.")
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <main className="selfie-page" style={{ fontFamily: poppins.style.fontFamily }}>
        <div className="content">
          <div className="icon">🎉</div>
          <h1 className={pacifico.className}>You're on the list!</h1>
          <p className="sub">Your selfie is queued for the big screen. Keep an eye out!</p>
          <button className="queue-btn" onClick={() => router.push("/queue")}>See the Queue</button>
        </div>
        <Styles pacifico={pacifico.style.fontFamily} poppins={poppins.style.fontFamily} />
      </main>
    )
  }

  return (
    <main className="selfie-page" style={{ fontFamily: poppins.style.fontFamily }}>
      <div className="content">
        <h1 className={pacifico.className}>Take a Selfie</h1>
        <p className="confirmed">
          Request confirmed: <strong>{song}</strong> by <strong>{artist}</strong>
        </p>
        <p className="sub">Show your face on the big screen while your song plays!</p>

        {selfiePreview ? (
          <div className="preview-wrap">
            <img src={selfiePreview} alt="Your selfie" className="preview-img" />
            <button className="retake-btn" onClick={removeSelfie}>Retake</button>
            {errorMsg && <p className="error">{errorMsg}</p>}
            <button className="upload-btn" onClick={handleUpload} disabled={uploading}>
              {uploading ? "Uploading..." : "Submit Selfie"}
            </button>
          </div>
        ) : isPortrait ? (
          <div className="rotate-prompt">
            <div className="rotate-icon">↺</div>
            <p>Rotate your phone to landscape to take your selfie</p>
          </div>
        ) : (
          <button className="camera-btn" onClick={() => cameraRef.current?.click()}>
            Open Camera
          </button>
        )}

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture={"user" as never}
          onChange={handleCapture}
          style={{ display: "none" }}
        />

        <button className="skip-btn" onClick={() => router.push("/queue")}
          style={{ color: "#6b7c3a" }}>
          Skip — take me to the queue
        </button>
      </div>
      <Styles pacifico={pacifico.style.fontFamily} poppins={poppins.style.fontFamily} />
    </main>
  )
}

function Styles({ pacifico, poppins }: { pacifico: string; poppins: string }) {
  return (
    <style jsx global>{`
      .selfie-page {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem 1rem;
        background-color: #2c1a3b;
        color: #f0e6f5;
      }
      .selfie-page .content {
        width: 100%;
        max-width: 400px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        text-align: center;
      }
      .selfie-page h1 {
        font-size: 2.2rem;
        color: #6b7c3a;
        margin: 0;
      }
      .selfie-page .icon {
        font-size: 3rem;
      }
      .selfie-page .confirmed {
        font-size: 0.95rem;
        color: #6b7c3a;
        margin: 0;
        background: #3d2656;
        padding: 0.6rem 1rem;
        border-radius: 10px;
        width: 100%;
        box-sizing: border-box;
      }
      .selfie-page .sub {
        font-size: 0.9rem;
        color: #c9b8e0;
        margin: 0;
      }
      .selfie-page .rotate-prompt {
        width: 100%;
        padding: 1.5rem 1rem;
        border-radius: 16px;
        border: 2px dashed #a07cc5;
        background: #3d2656;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
      }
      .selfie-page .rotate-icon {
        font-size: 2.5rem;
        color: #d8b8ff;
        animation: rotatePulse 1.5s ease-in-out infinite;
      }
      .selfie-page .rotate-prompt p {
        color: #c9b8e0;
        font-size: 0.95rem;
        margin: 0;
      }
      @keyframes rotatePulse {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(90deg); }
      }
      .selfie-page .camera-btn {
        width: 100%;
        padding: 1rem;
        border-radius: 16px;
        border: 2px dashed #a07cc5;
        background: #6b7c3a;
        color: #d8b8ff;
        font-size: 1.2rem;
        font-family: ${pacifico};
        cursor: pointer;
        transition: background 0.2s;
      }
      .selfie-page .camera-btn:hover { background: #5a6830; }
      .selfie-page .preview-wrap {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
      }
      .selfie-page .preview-img {
        width: 100%;
        max-height: 300px;
        object-fit: cover;
        border-radius: 16px;
        border: 2px solid #a07cc5;
      }
      .selfie-page .retake-btn {
        background: transparent;
        border: none;
        color: #6b7c3a;
        font-size: 0.85rem;
        cursor: pointer;
        text-decoration: underline;
      }
      .selfie-page .upload-btn {
        width: 100%;
        padding: 0.85rem;
        border-radius: 12px;
        border: none;
        background: #6b7c3a;
        color: #c9b8e0;
        font-size: 1.2rem;
        cursor: pointer;
        font-family: ${pacifico};
        transition: background 0.2s;
      }
      .selfie-page .upload-btn:hover:not(:disabled) { background: #5a6830; }
      .selfie-page .upload-btn:disabled { opacity: 0.6; cursor: default; }
      .selfie-page .queue-btn {
        width: 100%;
        padding: 0.85rem;
        border-radius: 12px;
        border: none;
        background: #6b7c3a;
        color: #c9b8e0;
        font-size: 1.2rem;
        cursor: pointer;
        font-family: ${pacifico};
        transition: background 0.2s;
      }
      .selfie-page .queue-btn:hover { background: #5a6830; }
      .selfie-page .skip-btn {
        background: transparent;
        border: none;
        font-size: 0.85rem;
        cursor: pointer;
        text-decoration: underline;
        margin-top: 0.5rem;
        font-family: ${poppins};
      }
      .selfie-page .error {
        color: #6b7c3a;
        font-size: 0.85rem;
        font-weight: bold;
      }
    `}</style>
  )
}

export default function SelfiePageWrapper() {
  return (
    <Suspense>
      <SelfiePage />
    </Suspense>
  )
}
