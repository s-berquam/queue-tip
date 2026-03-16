"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "lib/supabase"
import { Elsie, Pacifico } from "next/font/google"

const elsie = Elsie({ weight: "900", subsets: ["latin"] })
const pacifico = Pacifico({ weight: "400", subsets: ["latin"] })

type SelfieRequest = {
  id: string
  first_name: string
  song_title: string
  artist: string
  selfie_url: string
  selfie_duration: number
  selfie_status: string | null
}

export default function MonitorPage() {
  const [selfies, setSelfies] = useState<SelfieRequest[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [fading, setFading] = useState(false)
  const [contentKey, setContentKey] = useState(0)
  const selfiesRef = useRef<SelfieRequest[]>([])

  useEffect(() => {
    selfiesRef.current = selfies
  }, [selfies])

  useEffect(() => {
    async function fetchSelfies() {
      const { data } = await supabase
        .from("requests")
        .select("id, first_name, song_title, artist, selfie_url, selfie_duration, selfie_status")
        .eq("selfie_status", "approved")
        .not("selfie_url", "is", null)
        .order("datetime_requested", { ascending: true })
      if (data) setSelfies(data)
    }
    fetchSelfies()

    const channel = supabase
      .channel("monitor-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, (payload) => {
        if (payload.eventType === "UPDATE") {
          const r = payload.new as SelfieRequest
          if (r.selfie_status === "approved" && r.selfie_url) {
            setSelfies((prev) => {
              const exists = prev.find((x) => x.id === r.id)
              if (exists) return prev.map((x) => (x.id === r.id ? r : x))
              return [...prev, r]
            })
          } else {
            setSelfies((prev) => prev.filter((x) => x.id !== r.id))
          }
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Advance to next selfie after current one's duration
  useEffect(() => {
    if (selfies.length === 0) return
    const current = selfies[currentIndex % selfies.length]
    const duration = (current?.selfie_duration ?? 15) * 1000

    // Fade out 600ms before switching
    const fadeTimer = setTimeout(() => setFading(true), duration - 600)
    const switchTimer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % selfiesRef.current.length)
      setFading(false)
      setContentKey((k) => k + 1)
    }, duration)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(switchTimer)
    }
  }, [currentIndex, selfies])

  const SPARKLES = [
    { left: "8%",  delay: "0s",    dur: "8s",   size: "1.2rem" },
    { left: "18%", delay: "2.2s",  dur: "10s",  size: "0.9rem" },
    { left: "28%", delay: "0.8s",  dur: "7s",   size: "1.4rem" },
    { left: "40%", delay: "4s",    dur: "9s",   size: "1rem"   },
    { left: "52%", delay: "1.6s",  dur: "11s",  size: "0.8rem" },
    { left: "63%", delay: "3.2s",  dur: "8s",   size: "1.3rem" },
    { left: "74%", delay: "0.4s",  dur: "7.6s", size: "1rem"   },
    { left: "85%", delay: "2.8s",  dur: "10s",  size: "0.9rem" },
    { left: "93%", delay: "1.2s",  dur: "8.4s", size: "1.1rem" },
  ]

  if (selfies.length === 0) {
    return (
      <main className="monitor empty">
        <div className="waiting">
          <div className={`logo ${elsie.className}`}>🎶 All Love</div>
          <p>Waiting for selfies...</p>
        </div>
        <style jsx>{`
          .monitor {
            min-height: 100vh;
            background: #0d0d0d;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .waiting {
            text-align: center;
            color: #f0e6f5;
          }
          .logo {
            font-size: 3rem;
            margin-bottom: 1rem;
            color: #d8b8ff;
            text-shadow: 0 0 20px #a07cc5, 0 0 40px #6b3fa0;
          }
          p {
            font-size: 1.2rem;
            color: #a07cc5;
          }
        `}</style>
      </main>
    )
  }

  const current = selfies[currentIndex % selfies.length]

  return (
    <main className="monitor">
      <div className={`selfie-wrap${fading ? " fading" : ""}`}>
        <img
          key={current.id + currentIndex}
          src={current.selfie_url}
          alt={current.first_name}
          className="selfie-img"
        />

        {/* Sparkle particles */}
        <div className="sparkles" aria-hidden="true">
          {SPARKLES.map((s, i) => (
            <span key={i} className="sparkle" style={{ left: s.left, animationDelay: s.delay, animationDuration: s.dur, fontSize: s.size }}>✦</span>
          ))}
        </div>

        <div className="corner-info" key={contentKey}>
          <div className={`song-title ${pacifico.className}`}>"{current.song_title}"</div>
          <div className="artist">by {current.artist}</div>
        </div>
        <div className="requester-name-wrap" key={`name-${contentKey}`}>
          <span className={`requester-name ${elsie.className}`}>{current.first_name}</span>
        </div>
      </div>

      <style jsx>{`
        .monitor {
          width: 100vw;
          height: 100vh;
          background: #0d0d0d;
          overflow: hidden;
          position: relative;
        }
        .selfie-wrap {
          width: 100%;
          height: 100%;
          position: relative;
          transition: opacity 0.6s ease;
          opacity: 1;
        }
        .selfie-wrap.fading {
          opacity: 0;
        }
        .selfie-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* Sparkles */
        .sparkles {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .sparkle {
          position: absolute;
          bottom: -2rem;
          color: #ffd77d;
          animation: rise linear infinite;
          opacity: 0;
        }
        @keyframes rise {
          0%   { transform: translateY(0) scale(0.8) rotate(0deg);   opacity: 0; }
          10%  { opacity: 0.9; }
          80%  { opacity: 0.6; }
          100% { transform: translateY(-100vh) scale(1.2) rotate(180deg); opacity: 0; }
        }

        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        /* Song + artist — upper-left corner */
        .corner-info {
          position: absolute;
          top: 2.5rem;
          left: 3rem;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          border-radius: 10px;
          padding: 0.6rem 1.2rem;
          animation: slideUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        /* Name wrapper — handles positioning and backdrop */
        .requester-name-wrap {
          position: absolute;
          bottom: 2rem;
          left: 0;
          right: 0;
          width: fit-content;
          margin: 0 auto;
          white-space: nowrap;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          border-radius: 16px;
          padding: 0.25rem 1.5rem 0.5rem;
          animation: slideUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        /* Name — gradient text effect */
        .requester-name {
          display: block;
          font-size: 7rem;
          line-height: 1;
          letter-spacing: 0.04em;
          background: linear-gradient(90deg, #ffffff 0%, #d8b8ff 30%, #ffffff 50%, #ffd77d 70%, #ffffff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: nameShimmer 5s linear infinite, nameGlow 4s ease-in-out infinite alternate;
          filter: drop-shadow(0 0 18px rgba(216, 184, 255, 0.8));
        }
        @keyframes nameShimmer {
          from { background-position: 200% center; }
          to   { background-position: -200% center; }
        }
        @keyframes nameGlow {
          from { filter: drop-shadow(0 0 12px rgba(216, 184, 255, 0.6)); }
          to   { filter: drop-shadow(0 0 32px rgba(255, 215, 125, 0.9)); }
        }

        /* Song title */
        .song-title {
          font-size: 1.6rem;
          margin-top: 0.2rem;
          color: #ffd77d;
          text-shadow: 0 2px 8px rgba(0,0,0,0.6);
        }

        /* Artist */
        .artist {
          font-size: 1rem;
          color: #d8b8ff;
          margin-top: 0.15rem;
          text-shadow: 0 2px 8px rgba(0,0,0,0.6);
          letter-spacing: 0.05em;
        }

        @media (max-width: 768px) {
          .requester-name { font-size: 3.5rem; }
          .requester-name-wrap { bottom: 1.5rem; }
          .song-title { font-size: 1.2rem; }
          .artist { font-size: 0.85rem; }
          .corner-info { top: 1.5rem; left: 1.5rem; }
        }
      `}</style>
    </main>
  )
}
