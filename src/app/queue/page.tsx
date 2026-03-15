"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "lib/supabase"
import { useRouter } from "next/navigation"
import { Pacifico, Poppins } from "next/font/google"
import TipModal from "../../components/TipModal"

const pacifico = Pacifico({ weight: "400", subsets: ["latin"] })
const poppins = Poppins({ weight: ["300", "400", "600"], subsets: ["latin"] })

type Request = {
  id: string
  first_name: string
  song_title: string
  artist: string
  vibe: string | null
  votes: number
  status: "pending" | "up_next" | "played" | "archived"
  selfie_status: string | null
}

const BOOST_TIERS = [
  { amount: 2, label: "$2 — Move up 2 spots" },
  { amount: 5, label: "$5 — Jump to the top" },
]

const SELFIE_TIERS = [
  { amount: 1, label: "$1 — +15s" },
  { amount: 3, label: "$3 — +45s" },
  { amount: 5, label: "$5 — +90s" },
]

function sortQueue(reqs: Request[]) {
  return [...reqs].sort((a, b) => {
    if (a.status === "up_next" && b.status !== "up_next") return -1
    if (b.status === "up_next" && a.status !== "up_next") return 1
    return b.votes - a.votes
  })
}

export default function QueuePage() {
  const router = useRouter()
  const [requests, setRequests] = useState<Request[]>([])
  const [myRequestId, setMyRequestId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [boostTargetId, setBoostTargetId] = useState<string | null>(null)
  const [selfieModalOpen, setSelfieModalOpen] = useState(false)
  const [activeTip, setActiveTip] = useState<{ tipType: "boost" | "selfie"; tipAmount: number; requestId: string } | null>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [boostSuccess, setBoostSuccess] = useState(false)
  const [selfieSuccess, setSelfieSuccess] = useState(false)
  const [tipSuccess, setTipSuccess] = useState(false)
  const [showSelfiePrompt, setShowSelfiePrompt] = useState(false)
  const [showOptIn, setShowOptIn] = useState(false)
  const [optInSubmitting, setOptInSubmitting] = useState(false)
  const [optInDone, setOptInDone] = useState(false)
  const [djChoiceResult, setDjChoiceResult] = useState<{ song: string; artist: string } | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const myRequestIdRef = useRef<string | null>(null)
  const prevSongTitleRef = useRef<string>("")

  useEffect(() => {
    const id = localStorage.getItem("my_request_id")
    setMyRequestId(id)
    myRequestIdRef.current = id
    const alreadySeen = localStorage.getItem("opt_in_shown")
    if (id && !alreadySeen) setShowOptIn(true)
  }, [])

  async function handleOptIn() {
    if (!myRequestId || optInSubmitting) return
    setOptInSubmitting(true)
    await supabase.from("requests").update({ opt_in: true }).eq("id", myRequestId)
    setOptInSubmitting(false)
    setOptInDone(true)
    localStorage.setItem("opt_in_shown", "true")
    setTimeout(() => setShowOptIn(false), 2000)

  }

  function handleOptInDismiss() {
    localStorage.setItem("opt_in_shown", "true")
    setShowOptIn(false)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("boost_success") === "true") {
      setBoostSuccess(true)
      window.history.replaceState({}, "", window.location.pathname)
      successTimerRef.current = setTimeout(() => setBoostSuccess(false), 4000)
    }
    if (params.get("selfie_success") === "true") {
      setSelfieSuccess(true)
      window.history.replaceState({}, "", window.location.pathname)
      successTimerRef.current = setTimeout(() => setSelfieSuccess(false), 4000)
    }
    if (params.get("tip_success") === "true") {
      setTipSuccess(true)
      window.history.replaceState({}, "", window.location.pathname)
    }
    return () => clearTimeout(successTimerRef.current)
  }, [])

  useEffect(() => {
    function onScroll() { setShowScrollTop(window.scrollY > 300) }
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const id = myRequestIdRef.current
    if (!id) return
    const mine = requests.find((r) => r.id === id)
    if (mine) prevSongTitleRef.current = mine.song_title
  }, [requests])

  useEffect(() => {
    let activeEventId: string | null = null

    async function fetchQueue() {
      const { data: eventData } = await supabase
        .from("events")
        .select("id")
        .eq("is_active", true)
        .single()
      activeEventId = eventData?.id ?? null

      if (!activeEventId) {
        setRequests([])
        return
      }

      const { data } = await supabase
        .from("requests")
        .select("id, first_name, song_title, artist, vibe, votes, status, selfie_status")
        .eq("event_id", activeEventId)
        .in("status", ["pending", "up_next"])
        .order("votes", { ascending: false })
      if (data) setRequests(sortQueue(data))
    }
    fetchQueue()

    const channel = supabase
      .channel("queue-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const r = payload.new as Request & { event_id: string | null }
          if (r.event_id !== activeEventId) return
          if (r.status === "pending" || r.status === "up_next") {
            setRequests((prev) => [...prev, r].sort((a, b) => b.votes - a.votes))
          }
        } else if (payload.eventType === "UPDATE") {
          const r = payload.new as Request & { event_id: string | null }
          if (r.event_id !== activeEventId) return
          if (r.id === myRequestIdRef.current && prevSongTitleRef.current === "" && r.song_title !== "") {
            setDjChoiceResult({ song: r.song_title, artist: r.artist })
            prevSongTitleRef.current = r.song_title
          }
          setRequests((prev) => {
            const rest = prev.filter((x) => x.id !== r.id)
            if (r.status === "pending" || r.status === "up_next") {
              return sortQueue([...rest, r])
            }
            return rest
          })
        } else if (payload.eventType === "DELETE") {
          setRequests((prev) => prev.filter((x) => x.id !== (payload.old as Request).id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  function goToSelfie() {
    const song = localStorage.getItem("my_request_song") ?? ""
    const artist = localStorage.getItem("my_request_artist") ?? ""
    router.push(`/selfie?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}`)
  }

  function handleBoost(amount: number) {
    if (!boostTargetId) return
    setBoostTargetId(null)
    setActiveTip({ tipType: "boost", tipAmount: amount, requestId: boostTargetId })
  }

  function handleSelfieTip(amount: number) {
    if (!myRequestId) return
    setSelfieModalOpen(false)
    setActiveTip({ tipType: "selfie", tipAmount: amount, requestId: myRequestId })
  }

  const myRequest = myRequestId ? requests.find((r) => r.id === myRequestId) : null
  const isUpNext = myRequest?.status === "up_next"
  const showSelfieButton = myRequest?.selfie_status === "approved"
  const query = search.toLowerCase()
  const displayed = query
    ? requests.filter((r) =>
        (r.artist ?? "").toLowerCase().includes(query) ||
        (r.song_title ?? "").toLowerCase().includes(query) ||
        (r.first_name ?? "").toLowerCase().includes(query)
      )
    : requests

  return (
    <main className="queue-page" style={{ fontFamily: poppins.style.fontFamily }}>

      {/* Falling hearts background */}
      <div className="hearts-bg" aria-hidden="true">
        {[
          { left: "5%",  size: "1rem",   delay: "0s",    dur: "12s",  opacity: 0.18 },
          { left: "12%", size: "0.8rem", delay: "2.5s",  dur: "9s",   opacity: 0.20 },
          { left: "22%", size: "1.2rem", delay: "5s",    dur: "14s",  opacity: 0.16 },
          { left: "33%", size: "0.7rem", delay: "1s",    dur: "11s",  opacity: 0.18 },
          { left: "41%", size: "1rem",   delay: "7s",    dur: "10s",  opacity: 0.17 },
          { left: "50%", size: "1.3rem", delay: "3s",    dur: "13s",  opacity: 0.15 },
          { left: "58%", size: "0.8rem", delay: "8.5s",  dur: "9.5s", opacity: 0.20 },
          { left: "67%", size: "1.1rem", delay: "0.5s",  dur: "15s",  opacity: 0.16 },
          { left: "75%", size: "0.9rem", delay: "4s",    dur: "11s",  opacity: 0.18 },
          { left: "83%", size: "1.2rem", delay: "6s",    dur: "12s",  opacity: 0.17 },
          { left: "90%", size: "0.7rem", delay: "2s",    dur: "10s",  opacity: 0.20 },
          { left: "97%", size: "1rem",   delay: "9s",    dur: "13s",  opacity: 0.16 },
          { left: "17%", size: "0.9rem", delay: "11s",   dur: "14s",  opacity: 0.17 },
          { left: "46%", size: "0.8rem", delay: "13s",   dur: "10s",  opacity: 0.18 },
          { left: "72%", size: "1.1rem", delay: "15s",   dur: "12s",  opacity: 0.16 },
        ].map((h, i) => (
          <span
            key={i}
            className="heart"
            style={{ left: h.left, fontSize: h.size, animationDelay: h.delay, animationDuration: h.dur, opacity: h.opacity }}
          >♥</span>
        ))}
      </div>

      {/* DJ's Choice result popup */}
      {djChoiceResult && (
        <div className="popup-overlay">
          <div className="popup dj-result-popup">
            <div className="popup-icon">🎵</div>
            <p>The DJ chose <strong>{djChoiceResult.song}</strong> by <strong>{djChoiceResult.artist}</strong> for you!</p>
            <button onClick={() => setDjChoiceResult(null)}>Got it</button>
          </div>
        </div>
      )}

      {/* Tip success popup */}
      {tipSuccess && (
        <div className="popup-overlay">
          <div className="popup">
            <div className="popup-icon">💸</div>
            <p>Tip sent! The DJ appreciates you.</p>
            <button onClick={() => { setTipSuccess(false); setShowSelfiePrompt(true) }}>Next</button>
          </div>
        </div>
      )}

      {/* Selfie prompt popup */}
      {showSelfiePrompt && (
        <div className="popup-overlay">
          <div className="popup selfie-prompt-popup">
            <div className="popup-icon">📸</div>
            <p>Want to show your face on the big screen?</p>
            <button className="selfie-prompt-yes" onClick={() => { setShowSelfiePrompt(false); goToSelfie() }}>Take a Selfie</button>
            <button className="selfie-prompt-no" onClick={() => setShowSelfiePrompt(false)}>No thanks</button>
          </div>
        </div>
      )}

      {/* Boost success popup */}
      {boostSuccess && (
        <div className="popup-overlay">
          <div className="popup">
            <div className="popup-icon">🚀</div>
            <p>Your song has been boosted!</p>
            <button onClick={() => setBoostSuccess(false)}>Got it</button>
          </div>
        </div>
      )}

      {/* Selfie success popup */}
      {selfieSuccess && (
        <div className="popup-overlay">
          <div className="popup">
            <div className="popup-icon">🎉</div>
            <p>Your selfie will stay on screen longer!</p>
            <button onClick={() => setSelfieSuccess(false)}>Got it</button>
          </div>
        </div>
      )}

      {/* Opt-in popup */}
      {showOptIn && (
        <div className="popup-overlay">
          <div className="popup optin-popup">
            {optInDone ? (
              <>
                <p>You're in! We'll keep you posted on upcoming events.</p>
              </>
            ) : (
              <>
                <div className="popup-icon">🎶</div>
                <h2 className={pacifico.className}>Loving the Vibe?</h2>
                <p>Sign up for event notifications from Queen of Clubs Collective — no spam, just good music.</p>
                <button className="optin-yes-btn" onClick={handleOptIn} disabled={optInSubmitting}>
                  {optInSubmitting ? "Signing up..." : "Yes, notify me!"}
                </button>
                <button className="optin-no-btn" onClick={handleOptInDismiss}>No thanks</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tip payment modal */}
      {activeTip && (
        <TipModal
          title={activeTip.tipType === "boost" ? "Boost this song" : "Keep your selfie on screen"}
          tipAmount={activeTip.tipAmount}
          tipType={activeTip.tipType}
          requestId={activeTip.requestId}
          onSuccess={() => {
            setActiveTip(null)
            if (activeTip.tipType === "boost") setBoostSuccess(true)
            if (activeTip.tipType === "selfie") setSelfieSuccess(true)
          }}
          onClose={() => setActiveTip(null)}
        />
      )}

      {/* Boost tier selection modal */}
      {boostTargetId && (
        <div className="modal-overlay" onClick={() => setBoostTargetId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Boost your song</h2>
            <p className="modal-sub">Tip to move up in the queue:</p>
            <div className="tip-tiers">
              {BOOST_TIERS.map((tier) => (
                <button key={tier.amount} className="tip-tier-btn" onClick={() => handleBoost(tier.amount)}>
                  {tier.label}
                </button>
              ))}
            </div>
            <button className="modal-cancel" onClick={() => setBoostTargetId(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Selfie tip tier modal */}
      {selfieModalOpen && (
        <div className="modal-overlay" onClick={() => setSelfieModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Keep your selfie on screen! 🔥</h2>
            <p className="modal-sub">Tip to add more screen time:</p>
            <div className="tip-tiers">
              {SELFIE_TIERS.map((tier) => (
                <button key={tier.amount} className="tip-tier-btn" onClick={() => handleSelfieTip(tier.amount)}>
                  {tier.label}
                </button>
              ))}
            </div>
            <button className="modal-cancel" onClick={() => setSelfieModalOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="queue-header">
        <div className="top-nav">
          <button className="back-btn-top" onClick={() => router.back()}>← Back</button>
          <button className="back-btn-top" onClick={() => router.push("/home")}>⌂ Home</button>
        </div>

        <h1 className={pacifico.className}>
          Song <span style={{ position: "relative", display: "inline-block" }}>
            <span>Q</span>
            <svg style={{ position: "absolute", width: "36px", top: "8px", left: "50%", transform: "translateX(-60%) rotate(-14deg)" }} viewBox="0 0 52 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 24 L2 10 L13 18 L26 2 L39 18 L50 10 L50 24 Z" fill="#a07cc5" stroke="#d8b8ff" strokeWidth="1.5" strokeLinejoin="round"/>
              <rect x="2" y="22" width="48" height="6" rx="2" fill="#6b3fa0" stroke="#d8b8ff" strokeWidth="1.2"/>
              <circle cx="26" cy="5" r="3" fill="#6b7c3a"/>
              <circle cx="13" cy="19" r="2.2" fill="#f0e6f5"/>
              <circle cx="39" cy="19" r="2.2" fill="#f0e6f5"/>
              <circle cx="2" cy="11" r="1.8" fill="#6b7c3a"/>
              <circle cx="50" cy="11" r="1.8" fill="#6b7c3a"/>
            </svg>
          </span>ueue
        </h1>

        {/* Up Next banner */}
        {isUpNext && (
          <div className="up-next-banner">
            <span className="up-next-pulse">🎵</span>
            <span>Your song is up next!</span>
          </div>
        )}

        <div className="search-wrap">
          <input
            className="search-input"
            id="search"
            name="search"
            autoComplete="off"
            placeholder="Search artist, song, or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Selfie bump banner */}
        {showSelfieButton && (
          <div className="selfie-banner">
            <span>Your selfie is on the big screen!</span>
            <button className="selfie-btn" onClick={() => setSelfieModalOpen(true)}>Keep it on longer 🔥</button>
          </div>
        )}
      </div>

      <div className="queue-list">
        {displayed.length === 0 && <p className="empty">{search ? "No matches found." : "No requests yet — be the first!"}</p>}
        {displayed.map((req, i) => (
          <div
            key={req.id}
            className={`queue-card${req.status === "up_next" ? " up-next" : ""}${req.id === myRequestId ? " mine" : ""}`}
          >
            <div className="rank">#{i + 1}</div>
            <div className="song-info">
              <div className="song-title">
                {req.artist}{req.song_title ? ` — ${req.song_title}` : ""}
                {!req.song_title && <span className="dj-pick-badge">DJ's Pick</span>}
              </div>
              <div className="song-meta">{req.first_name}{req.vibe ? ` · ${req.vibe}` : ""}</div>
            </div>
            {req.status === "up_next" && <span className="up-next-badge">Up Next</span>}
            {req.id === myRequestId && req.status !== "up_next" && <span className="my-badge">Yours</span>}
            {req.status === "pending" && (
              <button className="row-boost-btn" onClick={() => setBoostTargetId(req.id)}>Boost</button>
            )}
          </div>
        ))}
      </div>

      {showScrollTop && (
        <button className="scroll-top-btn" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top">
          ↑
        </button>
      )}

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
        .queue-page {
          height: 100vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          padding: 2rem 1rem 0;
          box-sizing: border-box;
          background-color: #2c1a3b;
          color: #f0e6f5;
        }
        .queue-header {
          flex-shrink: 0;
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
        }
        .hearts-bg {
          position: fixed; inset: 0; pointer-events: none;
          overflow: hidden; z-index: 0;
        }
        .heart {
          position: absolute; top: -2rem; color: #c9b8e0;
          animation: fall linear infinite;
          user-select: none;
        }
        @keyframes fall {
          0%   { transform: translateY(-2rem) translateX(0) rotate(0deg); }
          25%  { transform: translateY(25vh) translateX(12px) rotate(15deg); }
          50%  { transform: translateY(50vh) translateX(-8px) rotate(-10deg); }
          75%  { transform: translateY(75vh) translateX(10px) rotate(12deg); }
          100% { transform: translateY(110vh) translateX(0) rotate(0deg); }
        }
        .queue-page > *:not(.hearts-bg):not(.scroll-top-btn):not(.socials),
        .queue-header { position: relative; z-index: 1; }
        .top-nav {
          max-width: 600px; margin: 0 auto 1rem;
          display: flex; gap: 0.5rem;
        }
        .back-btn-top {
          background: transparent; border: 2px solid #a07cc5;
          color: #c9b8e0; border-radius: 20px; padding: 0.35rem 0.9rem;
          font-size: 0.9rem; cursor: pointer; transition: all 0.2s;
        }
        .back-btn-top:hover { background: #a07cc5; color: #c9b8e0; }
        h1 {
          text-align: center; font-size: 2.8rem;
          margin-bottom: 1.5rem; color: #6b7c3a;
        }
        .up-next-banner {
          max-width: 600px; margin: 0 auto 1rem;
          background: #1a3b2c; border: 2px solid #9effa3;
          border-radius: 12px; padding: 0.9rem 1.2rem;
          display: flex; align-items: center; gap: 0.75rem;
          font-size: 1rem; font-weight: bold; color: #9effa3;
          justify-content: center;
        }
        .up-next-pulse {
          animation: pulse 1s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
        .search-wrap {
          max-width: 600px; margin: 0 auto 1rem;
        }
        .search-input {
          width: 100%; box-sizing: border-box;
          padding: 0.65rem 1rem; border-radius: 12px;
          border: 2px solid #3d2656; background: #3d2656;
          color: #f0e6f5; font-size: 0.95rem;
          font-family: inherit; outline: none; transition: border-color 0.2s;
        }
        .search-input::placeholder { color: #7a6a8a; }
        .search-input:focus { border-color: #a07cc5; }
        .row-boost-btn {
          background: transparent; border: 2px solid #a07cc5;
          color: #c9b8e0; border-radius: 12px;
          font-size: 0.85rem; font-family: ${poppins.style.fontFamily};
          cursor: pointer; padding: 0.25rem 0.75rem;
          white-space: nowrap; flex-shrink: 0; transition: all 0.2s;
        }
        .row-boost-btn:hover { background: #a07cc5; color: #c9b8e0; }
        .selfie-banner {
          max-width: 600px; margin: 0 auto 1rem;
          background: #3d2656; border: 2px solid #ffd77d;
          border-radius: 12px; padding: 0.75rem 1rem;
          display: flex; align-items: center;
          justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;
        }
        .selfie-banner span { font-size: 0.9rem; color: #ffd77d; }
        .selfie-btn {
          background: #ffd77d; color: #2c1a3b; border: none;
          border-radius: 20px; padding: 0.35rem 0.9rem;
          font-size: 0.85rem; font-weight: bold; cursor: pointer;
          white-space: nowrap; transition: background 0.2s;
        }
        .selfie-btn:hover { background: #ffc94d; }
        .queue-list {
          flex: 1;
          overflow-y: auto;
          max-width: 600px; margin: 0 auto;
          width: 100%;
          display: flex; flex-direction: column; gap: 0.75rem;
        }
        .empty { text-align: center; color: #a07cc5; margin-top: 2rem; }
        .queue-card {
          display: flex; align-items: center; gap: 0.75rem;
          background: #3d2656; border-radius: 12px;
          padding: 0.75rem 1rem; border: 2px solid transparent;
        }
        .queue-card.up-next { border-color: #9effa3; }
        .queue-card.mine { border-color: #a07cc5; }
        .queue-card.up-next.mine { border-color: #9effa3; }
        .rank { font-size: 0.9rem; color: #a07cc5; min-width: 28px; }
        .song-info { flex: 1; min-width: 0; }
        .song-title {
          font-weight: 600; font-size: 1rem; letter-spacing: 0.01em;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          text-shadow: 0 1px 6px rgba(160, 124, 197, 0.5);
        }
        .dj-pick-badge {
          display: inline-block; margin-left: 0.5rem;
          font-size: 0.78rem; font-family: ${poppins.style.fontFamily};
          background: #6b7c3a; color: #c9b8e0;
          border: 2px solid #6b7c3a;
          padding: 0.1rem 0.45rem; border-radius: 12px;
          vertical-align: middle;
        }
        .song-meta {
          font-size: 0.78rem; font-weight: 300; color: #c9b8e0; margin-top: 0.2rem;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          letter-spacing: 0.02em;
        }
        .up-next-badge {
          background: #9effa3; color: #1a3b2c; font-size: 0.75rem;
          font-weight: bold; padding: 0.2rem 0.5rem;
          border-radius: 20px; white-space: nowrap;
        }
        .my-badge {
          background: #a07cc5; color: white; font-size: 0.75rem;
          font-weight: bold; padding: 0.2rem 0.5rem;
          border-radius: 20px; white-space: nowrap;
        }
        .scroll-top-btn {
          position: fixed; bottom: 1.5rem; right: 1.5rem;
          width: 44px; height: 44px; border-radius: 50%;
          background: #d8b8ff; color: #2c1a3b; border: none;
          font-size: 1.2rem; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          transition: background 0.2s; z-index: 100;
        }
        .scroll-top-btn:hover { background: #c3a0ff; }

        .socials {
          flex-shrink: 0;
          display: flex;
          gap: 1.5rem;
          justify-content: center;
          padding: 0.75rem 0;
        }
        .socials a {
          color: #a07cc5;
          transition: color 0.2s;
        }
        .socials a:hover {
          color: #d8b8ff;
        }

        /* Modals */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.7);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 1rem;
        }
        .modal {
          background: #3d2656; border-radius: 16px;
          padding: 2rem; max-width: 340px; width: 100%;
          display: flex; flex-direction: column; gap: 1rem;
          border: 2px solid #a07cc5;
        }
        .modal h2 { font-size: 1.5rem; color: #6b7c3a; margin: 0; text-align: center; font-family: ${pacifico.style.fontFamily}; }
        .modal-sub { font-size: 0.9rem; color: #c9b8e0; margin: 0; text-align: center; }
        .tip-tiers { display: flex; flex-direction: column; gap: 0.5rem; }
        .tip-tier-btn {
          padding: 0.75rem; border-radius: 10px; border: 2px solid #a07cc5;
          background: #a07cc5; color: #f0e6f5; font-size: 1rem;
          font-family: ${poppins.style.fontFamily};
          cursor: pointer; transition: all 0.2s;
        }
        .tip-tier-btn:hover:not(:disabled) { background: #8a63b0; border-color: #8a63b0; }
        .tip-tier-btn:disabled { opacity: 0.6; cursor: default; }
        .modal-cancel {
          padding: 0.5rem; border-radius: 10px; border: 2px solid #6b586e;
          background: transparent; color: #c9b8e0; font-size: 0.9rem;
          cursor: pointer; transition: all 0.2s;
        }
        .modal-cancel:hover:not(:disabled) { border-color: #a07cc5; color: #f0e6f5; }

        /* Popups */
        .popup-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.7);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 1rem;
        }
        .popup {
          background: #3d2656; border: 2px solid #9effa3;
          border-radius: 16px; padding: 2rem; max-width: 300px;
          width: 100%; text-align: center; display: flex;
          flex-direction: column; gap: 0.75rem; align-items: center;
        }
        .popup-icon { font-size: 2.5rem; }
        .popup p { font-size: 1rem; color: #f0e6f5; margin: 0; }
        .popup button {
          padding: 0.5rem 1.5rem; border-radius: 20px; border: none;
          background: #9effa3; color: #2c1a3b; font-weight: bold; cursor: pointer;
        }
        .selfie-prompt-popup {
          border-color: #a07cc5;
          gap: 0.75rem;
        }
        .selfie-prompt-yes {
          width: 100%; padding: 0.75rem; border-radius: 12px; border: none;
          background: #a07cc5; color: #2c1a3b; font-size: 1rem;
          font-weight: bold; cursor: pointer; transition: background 0.2s;
        }
        .selfie-prompt-yes:hover { background: #8a63b0; }
        .selfie-prompt-no {
          background: transparent; border: none; color: #7a6a8a;
          font-size: 0.85rem; cursor: pointer; text-decoration: underline; padding: 0;
        }
        .selfie-prompt-no:hover { color: #c9b8e0; }
        .optin-popup {
          border-color: #d8b8ff;
          gap: 0.75rem;
        }
        .optin-popup h2 {
          font-size: 1.6rem; color: #d8b8ff; margin: 0;
        }
        .optin-popup p {
          font-size: 0.9rem; color: #c9b8e0; text-align: center;
        }
        .optin-yes-btn {
          width: 100%; padding: 0.75rem; border-radius: 12px; border: none;
          background: #d8b8ff; color: #2c1a3b; font-size: 1rem;
          font-weight: bold; cursor: pointer; transition: background 0.2s;
        }
        .optin-yes-btn:hover:not(:disabled) { background: #c3a0ff; }
        .optin-yes-btn:disabled { opacity: 0.6; cursor: default; }
        .optin-no-btn {
          background: transparent; border: none; color: #7a6a8a;
          font-size: 0.85rem; cursor: pointer; text-decoration: underline;
          padding: 0;
        }
        .optin-no-btn:hover { color: #c9b8e0; }
        .dj-result-popup { border-color: #6b7c3a; }
        .dj-result-popup strong { color: #6b7c3a; }

        @media (max-width: 480px) {
          h1 { font-size: 2.8rem; }
          .song-title { font-size: 0.95rem; }
          .song-meta { font-size: 0.75rem; }
        }
      `}</style>
    </main>
  )
}
