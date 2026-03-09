"use client"

import { useState } from "react"
import { supabase } from "lib/supabase"
import { v4 as uuidv4 } from "uuid"
import Link from "next/link"
import { Pacifico, Roboto } from "next/font/google"

const pacifico = Pacifico({ weight: "400", subsets: ["latin"] })
const roboto = Roboto({ weight: "400", subsets: ["latin"] })

const VIBES = ["Hype", "Sing-Along", "Feel-Good", "Slow Jam", "Throwback"] as const
type Vibe = typeof VIBES[number]

type Suggestion = { song_title: string; artist: string; request_count: number }

export default function RequestPage() {
  const [firstName, setFirstName] = useState("")
  const [song, setSong] = useState("")
  const [artist, setArtist] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [vibe, setVibe] = useState<Vibe | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  function validatePhone(phone: string) {
    return /^\+?[\d\s\-]{7,15}$/.test(phone)
  }

  async function handleVibeSelect(selected: Vibe) {
    setVibe(selected)
    setSuggestions([])
    setLoadingSuggestions(true)
    try {
      const res = await fetch(`/api/suggestions?vibe=${encodeURIComponent(selected)}`)
      const json = await res.json()
      setSuggestions(json.suggestions ?? [])
    } catch {
      // suggestions are optional, fail silently
    } finally {
      setLoadingSuggestions(false)
    }
  }

  function applySuggestion(s: Suggestion) {
    setSong(s.song_title)
    setArtist(s.artist)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg("")
    setLoading(true)

    if (!firstName.trim()) {
      setErrorMsg("First name is required.")
      setLoading(false)
      return
    }
    if (!song.trim() || !artist.trim()) {
      setErrorMsg("Song title and artist are required.")
      setLoading(false)
      return
    }
    if (!email.trim() && !phone.trim()) {
      setErrorMsg("Please provide either an email or phone number.")
      setLoading(false)
      return
    }
    if (email && !validateEmail(email)) {
      setErrorMsg("Invalid email format.")
      setLoading(false)
      return
    }
    if (phone && !validatePhone(phone)) {
      setErrorMsg("Invalid phone format. Include country code if needed.")
      setLoading(false)
      return
    }

    const appleId = uuidv4()

    const { error } = await supabase.from("requests").insert([
      {
        first_name: firstName.trim(),
        song_title: song.trim(),
        artist: artist.trim(),
        apple_music_id: appleId,
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        vibe: vibe,
      },
    ])

    setLoading(false)

    if (error) {
      setErrorMsg(`Supabase insert error: ${error.message}`)
    } else {
      setFirstName("")
      setSong("")
      setArtist("")
      setEmail("")
      setPhone("")
      setNotes("")
      setVibe(null)
      setSuggestions([])
      setSuccess(true)
    }
  }

  return (
    <main className="request-page">
      <div className="container">
        <h1 className={pacifico.className}>All Love Song Requests 🎶</h1>

        <form onSubmit={handleSubmit}>
          {errorMsg && <p className="error">{errorMsg}</p>}
          {success && <p className="success">Request sent successfully!</p>}

          <input
            className="input-field"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <input
            className="input-field"
            placeholder="Song Title"
            value={song}
            onChange={(e) => setSong(e.target.value)}
          />
          <input
            className="input-field"
            placeholder="Artist"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
          />

          <div className="vibe-section">
            <p className="vibe-label">Pick a vibe (optional)</p>
            <div className="vibe-buttons">
              {VIBES.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`vibe-btn${vibe === v ? " selected" : ""}`}
                  onClick={() => handleVibeSelect(v)}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {vibe && (
            <div className="suggestions">
              {loadingSuggestions && (
                <p className="suggestions-hint">Finding popular songs...</p>
              )}
              {!loadingSuggestions && suggestions.length > 0 && (
                <>
                  <p className="suggestions-hint">Popular {vibe} picks — tap to fill in:</p>
                  <div className="suggestion-chips">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        className="suggestion-chip"
                        onClick={() => applySuggestion(s)}
                      >
                        {s.song_title} – {s.artist}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <input
            className="input-field"
            type="email"
            placeholder="Email (optional if phone provided)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input-field"
            type="tel"
            placeholder="Phone (optional if email provided)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <textarea
            className="input-field"
            placeholder="Optional notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button disabled={loading} className="submit-btn">
            {loading ? "Submitting..." : "Send Request"}
          </button>
        </form>

        <Link href="/">
          <button className="back-btn">⬅️ Back to Home</button>
        </Link>
      </div>

      <style jsx>{`
        .request-page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 2rem 1rem;
          background: linear-gradient(135deg, #fff5e1 0%, #ffe4c4 100%);
          color: #333;
          font-family: ${roboto.style.fontFamily};
        }
        .container {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
        }
        h1 {
          text-align: center;
          font-size: 2.5rem;
          margin-bottom: 1.5rem;
          color: #FF6F61;
        }
        form {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }
        .input-field {
          padding: 0.75rem;
          border-radius: 12px;
          border: none;
          font-size: 1rem;
          width: 100%;
          box-sizing: border-box;
          font-family: ${roboto.style.fontFamily};
          color: #2c1a3b;
          background-color: #ffe4c4;
        }
        textarea.input-field {
          resize: vertical;
          min-height: 90px;
        }
        .vibe-section {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .vibe-label {
          font-size: 0.88rem;
          color: #777;
          margin: 0;
        }
        .vibe-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .vibe-btn {
          padding: 0.35rem 0.8rem;
          border-radius: 20px;
          border: 2px solid #FF6F61;
          background: transparent;
          color: #FF6F61;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .vibe-btn.selected {
          background: #FF6F61;
          color: white;
        }
        .suggestions {
          margin-top: -0.2rem;
        }
        .suggestions-hint {
          font-size: 0.82rem;
          color: #888;
          margin: 0 0 0.4rem;
        }
        .suggestion-chips {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .suggestion-chip {
          padding: 0.4rem 0.75rem;
          border-radius: 8px;
          border: none;
          background: #ffe4c4;
          color: #2c1a3b;
          font-size: 0.85rem;
          cursor: pointer;
          text-align: left;
          transition: background 0.2s;
        }
        .suggestion-chip:hover {
          background: #ffd4a0;
        }
        .submit-btn {
          background-color: #A3DE83;
          color: #2c1a3b;
          font-weight: bold;
          cursor: pointer;
          border-radius: 12px;
          padding: 0.8rem;
          font-family: ${pacifico.style.fontFamily};
          transition: transform 0.2s, background-color 0.2s;
        }
        .submit-btn:hover {
          transform: scale(1.05);
          background-color: #9bd775;
        }
        .back-btn {
          margin-top: 1rem;
          background-color: #FFDE59;
          color: #333;
          font-family: ${pacifico.style.fontFamily};
          font-weight: bold;
          width: 100%;
          border-radius: 12px;
          padding: 0.8rem;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .back-btn:hover {
          transform: scale(1.05);
        }
        .error {
          color: #ff6b6b;
          text-align: center;
          font-weight: bold;
        }
        .success {
          color: #2e7d32;
          text-align: center;
          font-weight: bold;
        }
        @media (max-width: 480px) {
          h1 { font-size: 2rem; }
          .input-field,
          .submit-btn,
          .back-btn { font-size: 1rem; padding: 0.7rem; }
        }
      `}</style>
    </main>
  )
}
