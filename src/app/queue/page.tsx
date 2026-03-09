"use client"

import { useEffect, useState } from "react"
import { supabase } from "lib/supabase"
import Link from "next/link"
import { Pacifico, Roboto } from "next/font/google"

const pacifico = Pacifico({ weight: "400", subsets: ["latin"] })
const roboto = Roboto({ weight: "400", subsets: ["latin"] })

type Request = {
  id: string
  first_name: string
  song_title: string
  artist: string
  vibe: string | null
  votes: number
  status: "pending" | "up_next" | "played" | "archived"
}

const VIBES = ["Hype", "Sing-Along", "Feel-Good", "Slow Jam", "Throwback"]

export default function QueuePage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [vibeFilter, setVibeFilter] = useState<string | null>(null)
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set())
  const [voting, setVoting] = useState<Set<string>>(new Set())

  useEffect(() => {
    const voted = new Set<string>()
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith("voted_")) voted.add(key.replace("voted_", ""))
    }
    setVotedIds(voted)
  }, [])

  useEffect(() => {
    async function fetchQueue() {
      const { data } = await supabase
        .from("requests")
        .select("id, first_name, song_title, artist, vibe, votes, status")
        .in("status", ["pending", "up_next"])
        .order("votes", { ascending: false })
      if (data) setRequests(data)
    }
    fetchQueue()

    const channel = supabase
      .channel("queue-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const r = payload.new as Request
          if (r.status === "pending" || r.status === "up_next") {
            setRequests((prev) => [...prev, r].sort((a, b) => b.votes - a.votes))
          }
        } else if (payload.eventType === "UPDATE") {
          const r = payload.new as Request
          setRequests((prev) => {
            const rest = prev.filter((x) => x.id !== r.id)
            if (r.status === "pending" || r.status === "up_next") {
              return [...rest, r].sort((a, b) => b.votes - a.votes)
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

  async function handleVote(requestId: string) {
    if (votedIds.has(requestId) || voting.has(requestId)) return

    localStorage.setItem(`voted_${requestId}`, "true")
    setVotedIds((prev) => new Set(prev).add(requestId))
    setVoting((prev) => new Set(prev).add(requestId))

    // Optimistic update
    setRequests((prev) =>
      prev
        .map((r) => (r.id === requestId ? { ...r, votes: r.votes + 1 } : r))
        .sort((a, b) => b.votes - a.votes)
    )

    await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    })

    setVoting((prev) => { const s = new Set(prev); s.delete(requestId); return s })
  }

  const displayed = vibeFilter ? requests.filter((r) => r.vibe === vibeFilter) : requests

  return (
    <main className="queue-page" style={{ fontFamily: roboto.style.fontFamily }}>
      <h1 className={pacifico.className}>Song Queue 🔥</h1>

      <div className="vibe-filters">
        <button
          className={`filter-btn${!vibeFilter ? " active" : ""}`}
          onClick={() => setVibeFilter(null)}
        >
          All
        </button>
        {VIBES.map((v) => (
          <button
            key={v}
            className={`filter-btn${vibeFilter === v ? " active" : ""}`}
            onClick={() => setVibeFilter(v)}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="queue-list">
        {displayed.length === 0 && (
          <p className="empty">No requests yet — be the first!</p>
        )}
        {displayed.map((req, i) => (
          <div key={req.id} className={`queue-card${req.status === "up_next" ? " up-next" : ""}`}>
            <div className="rank">#{i + 1}</div>
            <div className="song-info">
              <div className="song-title">{req.song_title}</div>
              <div className="song-meta">
                {req.artist} · {req.first_name}
                {req.vibe ? ` · ${req.vibe}` : ""}
              </div>
            </div>
            {req.status === "up_next" && <span className="up-next-badge">Up Next</span>}
            <button
              className={`fire-btn${votedIds.has(req.id) ? " voted" : ""}`}
              onClick={() => handleVote(req.id)}
              disabled={votedIds.has(req.id)}
            >
              🔥 {req.votes}
            </button>
          </div>
        ))}
      </div>

      <Link href="/">
        <button className="back-btn">⬅️ Back to Home</button>
      </Link>

      <style jsx>{`
        .queue-page {
          min-height: 100vh;
          padding: 2rem 1rem;
          background-color: #2c1a3b;
          color: #f0e6f5;
        }
        h1 {
          text-align: center;
          font-size: 2.5rem;
          margin-bottom: 1.5rem;
          color: #FF6F61;
        }
        .vibe-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: center;
          margin-bottom: 1.5rem;
        }
        .filter-btn {
          padding: 0.35rem 0.9rem;
          border-radius: 20px;
          border: 2px solid #a07cc5;
          background: transparent;
          color: #f0e6f5;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .filter-btn.active {
          background: #a07cc5;
          color: white;
        }
        .queue-list {
          max-width: 600px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .empty {
          text-align: center;
          color: #a07cc5;
          margin-top: 2rem;
        }
        .queue-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #3d2656;
          border-radius: 12px;
          padding: 0.75rem 1rem;
          border: 2px solid transparent;
        }
        .queue-card.up-next {
          border-color: #ffd77d;
        }
        .rank {
          font-size: 0.9rem;
          color: #a07cc5;
          min-width: 28px;
        }
        .song-info {
          flex: 1;
          min-width: 0;
        }
        .song-title {
          font-weight: bold;
          font-size: 1rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .song-meta {
          font-size: 0.8rem;
          color: #c9b8e0;
          margin-top: 0.15rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .up-next-badge {
          background: #ffd77d;
          color: #333;
          font-size: 0.75rem;
          font-weight: bold;
          padding: 0.2rem 0.5rem;
          border-radius: 20px;
          white-space: nowrap;
        }
        .fire-btn {
          background: transparent;
          border: 2px solid #FF6F61;
          color: #FF6F61;
          border-radius: 20px;
          padding: 0.3rem 0.75rem;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          min-width: 60px;
          text-align: center;
        }
        .fire-btn:hover:not(:disabled) {
          background: #FF6F61;
          color: white;
        }
        .fire-btn.voted {
          background: #FF6F61;
          color: white;
          cursor: default;
        }
        .back-btn {
          display: block;
          max-width: 600px;
          margin: 1.5rem auto 0;
          width: 100%;
          padding: 0.75rem;
          border-radius: 12px;
          border: none;
          background-color: #FFDE59;
          color: #333;
          font-weight: bold;
          font-size: 1rem;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .back-btn:hover {
          transform: scale(1.02);
        }
        @media (max-width: 480px) {
          h1 { font-size: 2rem; }
          .song-title { font-size: 0.95rem; }
          .song-meta { font-size: 0.75rem; }
        }
      `}</style>
    </main>
  )
}
