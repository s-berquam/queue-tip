"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "lib/supabase"
import { v4 as uuidv4 } from "uuid"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Pacifico, Poppins } from "next/font/google"
import TipModal from "../../components/TipModal"

const pacifico = Pacifico({ weight: "400", subsets: ["latin"] })
const poppins = Poppins({ weight: ["300", "400", "600"], subsets: ["latin"] })

const VIBES = ["Hype", "Sing-Along", "Feel-Good", "Slow Jam", "Throwback"] as const
type Vibe = typeof VIBES[number]

type ItunesTrack = { trackId: number; trackName: string; artistName: string; artworkUrl100: string }
type ItunesArtist = { artistId: number; artistName: string }

export default function RequestPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState("")
  const [artist, setArtist] = useState("")
  const [song, setSong] = useState("")
  const [djChoice, setDjChoice] = useState(false)
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [vibe, setVibe] = useState<Vibe | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const [submitted, setSubmitted] = useState<{ song: string; artist: string; requestId: string } | null>(null)
  const [tipAmount, setTipAmount] = useState<number | null>(null)
  const [activeTip, setActiveTip] = useState<{ tipAmount: number; requestId: string } | null>(null)
  const [firstNameError, setFirstNameError] = useState(false)
  const firstNameRef = useRef<HTMLInputElement>(null)
  const [itunesTracks, setItunesTracks] = useState<ItunesTrack[]>([])
  const [itunesOpen, setItunesOpen] = useState(false)
  const itunesDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const itunesDropdownRef = useRef<HTMLDivElement>(null)
  const [artistSuggestions, setArtistSuggestions] = useState<ItunesArtist[]>([])
  const [artistOpen, setArtistOpen] = useState(false)
  const artistDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const artistDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (itunesDropdownRef.current && !itunesDropdownRef.current.contains(e.target as Node)) {
        setItunesOpen(false)
      }
      if (artistDropdownRef.current && !artistDropdownRef.current.contains(e.target as Node)) {
        setArtistOpen(false)
      }
    }
    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [])

  function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  function validatePhone(phone: string) {
    return /^\+?[\d\s\-]{7,15}$/.test(phone)
  }

  function handleVibeSelect(selected: Vibe) {
    setVibe(selected)
  }

  function handleDjChoice() {
    setDjChoice(true)
    setSong("")
  }

  function handleSongInput(value: string) {
    setSong(value)
    if (value.trim()) {
      setDjChoice(false)
      setVibe(null)
    }
    clearTimeout(itunesDebounceRef.current)
    if (value.trim().length >= 2) {
      itunesDebounceRef.current = setTimeout(async () => {
        const term = `${artist} ${value}`.trim()
        const res = await fetch(`/api/itunes-search?term=${encodeURIComponent(term)}`)
        const json = await res.json()
        const filtered = (json.results ?? []).filter((t: ItunesTrack) =>
          t.trackName.toLowerCase().includes(value.trim().toLowerCase()) &&
          (!artist.trim() || t.artistName.toLowerCase().includes(artist.trim().toLowerCase()))
        )
        setItunesTracks(filtered)
        setItunesOpen(filtered.length > 0)
      }, 400)
    } else {
      setItunesTracks([])
      setItunesOpen(false)
    }
  }

  function handleArtistInput(value: string) {
    setArtist(value)
    clearTimeout(artistDebounceRef.current)
    if (value.trim().length >= 2) {
      artistDebounceRef.current = setTimeout(async () => {
        const res = await fetch(`/api/itunes-search?term=${encodeURIComponent(value)}&entity=musicArtist`)
        const json = await res.json()
        const filtered = (json.results ?? []).filter((a: ItunesArtist) =>
          a.artistName.toLowerCase().includes(value.trim().toLowerCase())
        )
        setArtistSuggestions(filtered)
        setArtistOpen(filtered.length > 0)
      }, 400)
    } else {
      setArtistSuggestions([])
      setArtistOpen(false)
    }
  }

  function applyArtist(a: ItunesArtist) {
    setArtist(a.artistName)
    setArtistOpen(false)
    setArtistSuggestions([])
  }

  function applyItunesTrack(track: ItunesTrack) {
    setSong(track.trackName)
    setArtist(track.artistName)
    setItunesOpen(false)
    setItunesTracks([])
    setDjChoice(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEmailError("")
    setPhoneError("")
    setLoading(true)

    if (!firstName.trim()) {
      setFirstNameError(true)
      firstNameRef.current?.focus()
      setLoading(false)
      return
    }
    if (!artist.trim() || (!djChoice && !song.trim()) || (djChoice && !vibe)) {
      setLoading(false)
      return
    }

    let hasContactError = false
    if (!email.trim() && !phone.trim()) {
      setEmailError("Email or phone is required.")
      setPhoneError("Email or phone is required.")
      hasContactError = true
    } else if (email && !validateEmail(email)) {
      setEmailError("Invalid email format.")
      hasContactError = true
    } else if (phone && !validatePhone(phone)) {
      setPhoneError("Invalid phone format.")
      hasContactError = true
    }
    if (hasContactError) {
      setLoading(false)
      return
    }

    const { data: eventData } = await supabase
      .from("events")
      .select("id")
      .eq("is_active", true)
      .single()
    const activeEventId = eventData?.id ?? null

    const { data, error } = await supabase
      .from("requests")
      .insert([{
        first_name: firstName.trim(),
        song_title: djChoice ? "" : song.trim(),
        artist: artist.trim(),
        apple_music_id: uuidv4(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        vibe: vibe,
        selfie_url: null,
        selfie_status: "none",
        event_id: activeEventId,
      }])
      .select("id")
      .single()

    if (error) {
      setLoading(false)
      return
    }

    const requestId = data.id
    const songLabel = djChoice ? "DJ's Choice" : song.trim()
    const artistLabel = artist.trim()

    localStorage.setItem("my_request_id", requestId)
    localStorage.setItem("my_request_song", songLabel)
    localStorage.setItem("my_request_artist", artistLabel)

    setLoading(false)
    if (tipAmount) {
      setActiveTip({ tipAmount, requestId })
    } else {
      setSubmitted({ song: songLabel, artist: artistLabel, requestId })
    }
  }

  function goToSelfie() {
    const params = new URLSearchParams({
      song: submitted?.song ?? "",
      artist: submitted?.artist ?? "",
    })
    router.push(`/selfie?${params.toString()}`)
  }

  return (
    <main className="request-page">

      {/* Falling olives background */}
      <div className="olives-bg" aria-hidden="true">
        {[
          { left: "4%",  size: "1rem",   delay: "0s",    dur: "13s"  },
          { left: "11%", size: "0.8rem", delay: "3s",    dur: "10s"  },
          { left: "20%", size: "1.1rem", delay: "6s",    dur: "15s"  },
          { left: "30%", size: "0.75rem",delay: "1.5s",  dur: "11s"  },
          { left: "40%", size: "1rem",   delay: "8s",    dur: "12s"  },
          { left: "50%", size: "1.2rem", delay: "4s",    dur: "14s"  },
          { left: "59%", size: "0.85rem",delay: "9.5s",  dur: "10s"  },
          { left: "68%", size: "1rem",   delay: "2s",    dur: "13s"  },
          { left: "77%", size: "0.9rem", delay: "5s",    dur: "11s"  },
          { left: "86%", size: "1.1rem", delay: "7s",    dur: "14s"  },
          { left: "94%", size: "0.8rem", delay: "11s",   dur: "12s"  },
          { left: "15%", size: "0.9rem", delay: "13s",   dur: "10s"  },
          { left: "45%", size: "1rem",   delay: "15s",   dur: "13s"  },
          { left: "72%", size: "0.85rem",delay: "17s",   dur: "11s"  },
        ].map((o, i) => (
          <span
            key={i}
            className="olive"
            style={{ left: o.left, fontSize: o.size, animationDelay: o.delay, animationDuration: o.dur }}
          >🫒</span>
        ))}
      </div>

      <div className="container">
        <div className="top-nav">
          <button className="back-arrow" onClick={() => router.push("/home")}>⌂ Home</button>
        </div>
        <h1 className={pacifico.className}>Song Requests</h1>
        <p className="intro">
          Tell us who you want to hear — then either name the song or let the DJ pick something perfect for the vibe.
        </p>

        {/* DJ tip payment modal */}
        {activeTip && (
          <TipModal
            title="Tip the DJ"
            tipAmount={activeTip.tipAmount}
            tipType="dj"
            requestId={activeTip.requestId}
            onSuccess={() => {
              const song = localStorage.getItem("my_request_song") ?? ""
              const artist = localStorage.getItem("my_request_artist") ?? ""
              setActiveTip(null)
              setSubmitted({ song, artist, requestId: activeTip.requestId })
            }}
            onClose={() => {
              const song = localStorage.getItem("my_request_song") ?? ""
              const artist = localStorage.getItem("my_request_artist") ?? ""
              setActiveTip(null)
              setSubmitted({ song, artist, requestId: activeTip.requestId })
            }}
          />
        )}

        {/* Success modal */}
        {submitted && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>Song submitted!</h2>
              <p className="modal-song">
                {submitted.song} <span className="modal-by">by</span> {submitted.artist}
              </p>
              <p className="modal-sub">Want to show your face on the big screen?</p>
              <button className="selfie-cta-btn" onClick={goToSelfie}>Take a Selfie</button>
              <Link href="/queue" className="skip-link" style={{ color: "#6b7c3a" }}>Skip — take me to the queue</Link>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            ref={firstNameRef}
            className={`input-field${firstNameError ? " input-error" : ""}`}
            name="first-name"
            autoComplete="given-name"
            placeholder="Your First Name"
            value={firstName}
            onChange={(e) => { setFirstName(e.target.value); if (e.target.value.trim()) setFirstNameError(false) }}
          />
          {firstNameError && <p className="field-error">First name is required to continue.</p>}

          <div ref={artistDropdownRef} style={{ position: "relative" }}>
            <input
              className="input-field"
              name="artist"
              autoComplete="off"
              placeholder="Artist *"
              value={artist}
              onFocus={(e) => {
                if (!firstName.trim()) {
                  e.preventDefault()
                  e.currentTarget.blur()
                  setFirstNameError(true)
                  firstNameRef.current?.focus()
                  return
                }
                if (artistSuggestions.length > 0) setArtistOpen(true)
              }}
              onChange={(e) => handleArtistInput(e.target.value)}
            />
            {artistOpen && artistSuggestions.length > 0 && (
              <div className="itunes-dropdown">
                {artistSuggestions.map((a) => (
                  <button
                    key={a.artistId}
                    type="button"
                    className="itunes-item"
                    onMouseDown={(e) => { e.preventDefault(); applyArtist(a) }}
                  >
                    <div className="itunes-text">
                      <div className="itunes-track">{a.artistName}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="song-section">
            <div className="song-row">
              {!djChoice && (
                <div ref={itunesDropdownRef} style={{ position: "relative", flex: 1 }}>
                  <input
                    className="input-field song-input"
                    name="song"
                    autoComplete="off"
                    placeholder="Song title *"
                    value={song}
                    onChange={(e) => handleSongInput(e.target.value)}
                    onFocus={() => { if (itunesTracks.length > 0) setItunesOpen(true) }}
                  />
                  {itunesOpen && itunesTracks.length > 0 && (
                    <div className="itunes-dropdown">
                      {itunesTracks.map((track) => (
                        <button
                          key={track.trackId}
                          type="button"
                          className="itunes-item"
                          onMouseDown={(e) => { e.preventDefault(); applyItunesTrack(track) }}
                        >
                          <img src={track.artworkUrl100} alt="" className="itunes-art" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                          <div className="itunes-text">
                            <div className="itunes-track">{track.trackName}</div>
                            <div className="itunes-artist">{track.artistName}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                className={`dj-choice-btn${djChoice ? " active" : ""}${song.trim() && !djChoice ? " inactive" : ""}`}
                onClick={djChoice ? () => { setDjChoice(false); setVibe(null) } : handleDjChoice}
                disabled={!!song.trim() && !djChoice}
              >
                {djChoice ? "Cancel" : "DJ's Choice"}
              </button>
            </div>
            {djChoice && <p className="dj-hint">Choose a vibe and I'll pick the perfect song for your artist.</p>}
          </div>

          {djChoice && (
            <div className="vibe-section">
              <p className="section-label">Pick a vibe <span className="required">*</span></p>
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
          )}

          <input
            className={`input-field${emailError ? " input-error" : ""}`}
            type="email"
            name="email"
            autoComplete="email"
            placeholder="Email (optional if phone provided)"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError(""); setPhoneError("") }}
          />
          {emailError && <p className="field-error">{emailError}</p>}
          <input
            className={`input-field${phoneError ? " input-error" : ""}`}
            type="tel"
            name="phone"
            autoComplete="tel"
            placeholder="Phone (optional if email provided)"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setPhoneError(""); setEmailError("") }}
          />
          {phoneError && <p className="field-error">{phoneError}</p>}
          <textarea
            className="input-field"
            name="notes"
            autoComplete="off"
            placeholder="Optional notes for the DJ"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="tip-section">
            <p className="section-label">Tip the DJ <span className="tip-optional">(optional)</span></p>
            <div className="tip-buttons">
              {[1, 3, 5, 10].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className={`tip-btn${tipAmount === amt ? " selected" : ""}`}
                  onClick={() => setTipAmount(tipAmount === amt ? null : amt)}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>

          <button disabled={loading} className="submit-btn">
            {loading ? "Submitting..." : "Send Request"}
          </button>
        </form>

      </div>

      <div className="socials">
        <a href="https://www.facebook.com/alllovejams/" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <path d="M22 12c0-5.522-4.478-10-10-10S2 6.478 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987H7.898V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
          </svg>
        </a>
        <a href="https://www.instagram.com/all_love_jams/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.975.975 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.975.975-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.975-.975-1.246-2.242-1.308-3.608C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608.975-.975 2.242-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.332.014 7.052.072 5.197.157 3.355.673 2.014 2.014.673 3.355.157 5.197.072 7.052.014 8.332 0 8.741 0 12c0 3.259.014 3.668.072 4.948.085 1.855.601 3.697 1.942 5.038 1.341 1.341 3.183 1.857 5.038 1.942C8.332 23.986 8.741 24 12 24s3.668-.014 4.948-.072c1.855-.085 3.697-.601 5.038-1.942 1.341-1.341 1.857-3.183 1.942-5.038C23.986 15.668 24 15.259 24 12s-.014-3.668-.072-4.948c-.085-1.855-.601-3.697-1.942-5.038C20.645.673 18.803.157 16.948.072 15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
          </svg>
        </a>
        <a href="https://discord.gg/PK7q35eCGY" target="_blank" rel="noopener noreferrer" aria-label="Discord">
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
        </a>
        <a href="https://www.twitch.tv/allloveolive" target="_blank" rel="noopener noreferrer" aria-label="Twitch">
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
          </svg>
        </a>
      </div>

      <style jsx>{`
        .request-page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 1rem;
          background-color: #2c1a3b;
          color: #f0e6f5;
          font-family: ${poppins.style.fontFamily};
          position: relative;
        }
        .olives-bg {
          position: fixed; inset: 0; pointer-events: none;
          overflow: hidden; z-index: 0;
        }
        .olive {
          position: absolute; top: -2rem;
          animation: olivefall linear infinite;
          opacity: 0.22; user-select: none;
        }
        @keyframes olivefall {
          0%   { transform: translateY(-2rem) translateX(0) rotate(0deg); }
          25%  { transform: translateY(25vh) translateX(10px) rotate(20deg); }
          50%  { transform: translateY(50vh) translateX(-8px) rotate(-15deg); }
          75%  { transform: translateY(75vh) translateX(12px) rotate(25deg); }
          100% { transform: translateY(110vh) translateX(0) rotate(0deg); }
        }
        .container { position: relative; z-index: 1; }
        .container {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
        }
        h1 {
          text-align: center;
          font-size: 1.8rem;
          margin-top: -0.5rem;
          margin-bottom: 0.15rem;
          color: #6b7c3a;
        }
        .intro {
          text-align: center;
          font-size: 0.8rem;
          color: #c9b8e0;
          margin: 0 0 0.5rem;
          line-height: 1.3;
        }
        form {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .input-field {
          padding: 0.45rem 0.75rem;
          border-radius: 12px;
          border: 2px solid #3d2656;
          font-size: 1rem;
          width: 100%;
          box-sizing: border-box;
          font-family: ${poppins.style.fontFamily};
          color: #f0e6f5;
          background-color: #3d2656;
          outline: none;
          transition: border-color 0.2s;
        }
        .input-field:focus { border-color: #a07cc5; }
        .input-error { border-color: #ff6b6b !important; }
        .field-error { font-size: 0.78rem; color: #ff6b6b; margin: 0.15rem 0 0; padding-left: 0.25rem; }
        .input-field::placeholder { color: #7a6a8a; }
        .input-field:-webkit-autofill,
        .input-field:-webkit-autofill:hover,
        .input-field:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px #3d2656 inset;
          -webkit-text-fill-color: #f0e6f5;
          caret-color: #f0e6f5;
        }
        .input-field.dimmed { opacity: 0.4; }
        textarea.input-field {
          resize: vertical;
          min-height: 50px;
        }
        .song-section,
        .vibe-section {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .section-label {
          font-size: 0.88rem;
          color: #c9b8e0;
          margin: 0;
        }
        .required { color: #FF6F61; }
        .song-row {
          display: flex;
          gap: 0.5rem;
          align-items: stretch;
        }
        .song-input { flex: 1; width: 100%; }
        .itunes-dropdown {
          position: absolute; top: calc(100% + 4px); left: 0; right: 0;
          background: #3d2656; border: 2px solid #a07cc5; border-radius: 12px;
          z-index: 200; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        }
        .itunes-item {
          display: flex; align-items: center; gap: 0.6rem;
          width: 100%; padding: 0.5rem 0.75rem;
          background: transparent; border: none; border-bottom: 1px solid #4e3268;
          color: #f0e6f5; font-family: ${poppins.style.fontFamily};
          cursor: pointer; text-align: left; transition: background 0.15s;
        }
        .itunes-item:last-child { border-bottom: none; }
        .itunes-item:hover { background: #4e3268; }
        .itunes-art { width: 40px; height: 40px; border-radius: 6px; flex-shrink: 0; }
        .itunes-text { flex: 1; min-width: 0; }
        .itunes-track {
          font-size: 0.9rem; font-weight: 600;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .itunes-artist {
          font-size: 0.78rem; color: #c9b8e0; margin-top: 0.1rem;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dj-choice-btn {
          flex-shrink: 0;
          padding: 0 1rem;
          border-radius: 12px;
          border: 2px solid #a07cc5;
          background: transparent;
          color: #c9b8e0;
          font-size: 0.85rem;
          font-family: ${pacifico.style.fontFamily};
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .dj-choice-btn.active {
          background: #a07cc5;
          color: #c9b8e0;
        }
        .dj-choice-btn.inactive {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .dj-hint {
          font-size: 0.82rem;
          color: #a07cc5;
          margin: 0;
          font-style: italic;
        }
        .vibe-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .vibe-btn {
          padding: 0.35rem 0.8rem;
          border-radius: 20px;
          border: 2px solid #a07cc5;
          background: transparent;
          color: #c9b8e0;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .vibe-btn.selected {
          background: #a07cc5;
          color: white;
        }
        .tip-section {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .tip-optional {
          font-size: 0.8rem;
          color: #7a6a8a;
        }
        .tip-buttons {
          display: flex;
          gap: 0.5rem;
        }
        .tip-btn {
          flex: 1;
          padding: 0.5rem 0;
          border-radius: 12px;
          border: 2px solid #a07cc5;
          background: transparent;
          color: #c9b8e0;
          font-size: 0.95rem;
          font-family: ${poppins.style.fontFamily};
          cursor: pointer;
          transition: all 0.2s;
        }
        .tip-btn.selected {
          background: #a07cc5;
          color: #f0e6f5;
        }
        .tip-btn:hover { background: #a07cc5; color: #f0e6f5; }
        .modal-tip { width: 100%; display: flex; flex-direction: column; gap: 0.5rem; align-items: center; }
        .submit-btn {
          background-color: #6b7c3a;
          color: #c9b8e0;
          font-weight: bold;
          cursor: pointer;
          border-radius: 12px;
          padding: 0.8rem;
          font-size: 1.2rem;
          font-family: ${pacifico.style.fontFamily};
          transition: transform 0.2s, background-color 0.2s;
        }
        .submit-btn:hover {
          transform: scale(1.05);
          background-color: #5a6830;
        }
        .top-nav { margin-bottom: 0.25rem; }
        .back-arrow {
          background: transparent; border: 2px solid #a07cc5;
          color: #c9b8e0; border-radius: 20px; padding: 0.2rem 0.6rem;
          font-size: 0.75rem; cursor: pointer; transition: all 0.2s;
        }
        .back-arrow:hover { background: #a07cc5; color: white; }

        /* Success modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .modal {
          background: #3d2656;
          border: 2px solid #a07cc5;
          border-radius: 20px;
          padding: 2rem 1.5rem;
          max-width: 340px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .modal-icon { font-size: 2.5rem; }
        .modal h2 {
          font-family: ${pacifico.style.fontFamily};
          font-size: 1.6rem;
          color: #6b7c3a;
          margin: 0;
        }
        .modal-song {
          font-size: 1rem;
          font-weight: bold;
          color: #6b7c3a;
          margin: 0;
        }
        .modal-by {
          font-weight: normal;
          color: #c9b8e0;
        }
        .modal-sub {
          font-size: 0.9rem;
          color: #c9b8e0;
          margin: 0;
        }
        .selfie-cta-btn {
          width: 100%;
          padding: 0.85rem;
          border-radius: 12px;
          border: none;
          background: #a07cc5;
          color: #2c1a3b;
          font-size: 1.2rem;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s;
          font-family: ${pacifico.style.fontFamily};
        }
        .selfie-cta-btn:hover { background: #8a63b0; }
        .skip-link {
          font-size: 0.85rem;
          color: #6b7c3a;
          text-decoration: underline;
          cursor: pointer;
        }

        .socials {
          position: fixed;
          bottom: 1.5rem;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 1.5rem;
          z-index: 100;
        }
        .socials a {
          color: #a07cc5;
          transition: color 0.2s;
        }
        .socials a:hover {
          color: #d8b8ff;
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
