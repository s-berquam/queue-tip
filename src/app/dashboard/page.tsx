"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "lib/supabase"
import { Pacifico, Poppins } from "next/font/google"

const pacifico = Pacifico({ weight: "400", subsets: ["latin"] })
const poppins = Poppins({ weight: ["300", "400", "600"], subsets: ["latin"] })

type Request = {
  id: string
  first_name: string
  song_title: string
  artist: string
  notes: string | null
  status: "pending" | "up_next" | "played" | "archived"
  datetime_requested: string
  price_paid?: number
  votes: number
  boost_amount?: number
  vibe: string | null
  selfie_url: string | null
  selfie_status: string | null
  selfie_duration: number
}

const STATUS_VALUES: Record<string, Request["status"]> = {
  Played: "played",
  "Up Next": "up_next",
  Archived: "archived",
}

const VIBES = ["Hype", "Sing-Along", "Feel-Good", "Slow Jam", "Throwback"]

type ItunesTrack = { trackId: number; trackName: string; artistName: string; artworkUrl100: string }
type Event = { id: string; name: string; venue: string | null; is_active: boolean }

export default function Dashboard() {
  const [requests, setRequests] = useState<Request[]>([])
  const [activeEvent, setActiveEvent] = useState<Event | null | undefined>(undefined)
  const [showStartForm, setShowStartForm] = useState(false)
  const [eventName, setEventName] = useState("")
  const [eventVenue, setEventVenue] = useState("")
  const [eventSaving, setEventSaving] = useState(false)
  const [vibeFilter, setVibeFilter] = useState<string | null>(null)
  const [djSearchTerms, setDjSearchTerms] = useState<Record<string, string>>({})
  const [djSearchResults, setDjSearchResults] = useState<Record<string, ItunesTrack[]>>({})
  const [djSearchOpen, setDjSearchOpen] = useState<string | null>(null)
  const djDebounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const djDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (djDropdownRef.current && !djDropdownRef.current.contains(e.target as Node)) {
        setDjSearchOpen(null)
      }
    }
    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [])

  useEffect(() => {
    async function fetchActiveEvent() {
      const { data } = await supabase.from("events").select("id, name, venue, is_active").eq("is_active", true).single()
      setActiveEvent(data ?? null)
    }
    fetchActiveEvent()
  }, [])

  async function startEvent() {
    if (!eventName.trim() || eventSaving) return
    setEventSaving(true)
    await supabase.from("events").update({ is_active: false }).eq("is_active", true)
    const { data } = await supabase
      .from("events")
      .insert([{ name: eventName.trim(), venue: eventVenue.trim() || null, is_active: true }])
      .select("id, name, venue, is_active")
      .single()
    setActiveEvent(data ?? null)
    setShowStartForm(false)
    setEventName("")
    setEventVenue("")
    setEventSaving(false)
  }

  async function endEvent() {
    if (!activeEvent || eventSaving) return
    setEventSaving(true)
    const { data: eventRequests } = await supabase
      .from("requests")
      .select("price_paid")
      .eq("event_id", activeEvent.id)
    const totalTips = (eventRequests ?? []).reduce((sum, r) => sum + (r.price_paid ?? 0), 0)
    await supabase.from("events").update({ is_active: false, total_tips: totalTips }).eq("id", activeEvent.id)
    setActiveEvent(null)
    setEventSaving(false)
  }

  function formatStatus(status: string) {
    return status
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  }

  async function updateStatusGroup(ids: string[], status: Request["status"]) {
    await Promise.all(ids.map((id) => supabase.from("requests").update({ status }).eq("id", id)))
  }

  function handleDjSearch(groupKey: string, value: string, artist: string) {
    setDjSearchTerms((prev) => ({ ...prev, [groupKey]: value }))
    setDjSearchResults((prev) => ({ ...prev, [groupKey]: [] }))
    clearTimeout(djDebounceRefs.current[groupKey])
    if (value.trim().length >= 2) {
      djDebounceRefs.current[groupKey] = setTimeout(async () => {
        const term = `${artist} ${value}`.trim()
        const res = await fetch(`/api/itunes-search?term=${encodeURIComponent(term)}`)
        const json = await res.json()
        const filtered = (json.results ?? []).filter((t: ItunesTrack) =>
          t.trackName.toLowerCase().includes(value.trim().toLowerCase()) &&
          (!artist.trim() || t.artistName.toLowerCase().includes(artist.trim().toLowerCase()))
        )
        setDjSearchResults((prev) => ({ ...prev, [groupKey]: filtered }))
        setDjSearchOpen(filtered.length > 0 ? groupKey : null)
      }, 400)
    } else {
      setDjSearchOpen(null)
    }
  }

  async function applyDjTrack(groupKey: string, ids: string[], track: ItunesTrack) {
    setDjSearchOpen(null)
    setDjSearchTerms((prev) => ({ ...prev, [groupKey]: "" }))
    setDjSearchResults((prev) => ({ ...prev, [groupKey]: [] }))
    await Promise.all(ids.map((id) => supabase.from("requests").update({ song_title: track.trackName }).eq("id", id)))
  }

  async function moderateSelfie(id: string, status: "approved" | "rejected") {
    const { error } = await supabase
      .from("requests")
      .update({ selfie_status: status })
      .eq("id", id)
    if (error) { console.error("Moderation error:", error); return }
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, selfie_url: null } : r))
  }

  useEffect(() => {
    let activeEventId: string | null = null

    async function fetchRequests() {
      const { data: eventData } = await supabase
        .from("events")
        .select("id")
        .eq("is_active", true)
        .single()
      activeEventId = eventData?.id ?? null

      const query = supabase
        .from("requests")
        .select("*")
        .order("datetime_requested", { ascending: false })

      if (activeEventId) query.eq("event_id", activeEventId)

      const { data, error } = await query
      if (data) setRequests(data)
      if (error) console.error("Fetch error:", error.message, error.details, error.hint, error.code)
    }

    fetchRequests()

    const channel = supabase
      .channel("dashboard-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const r = payload.new as Request & { event_id: string | null }
          if (r.event_id !== activeEventId) return
          setRequests((prev) => [r, ...prev])
        } else if (payload.eventType === "UPDATE") {
          const updated = payload.new as Request & { event_id: string | null }
          if (updated.event_id !== activeEventId) return
          setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
        } else if (payload.eventType === "DELETE") {
          const id = (payload.old as { id: string }).id
          setRequests((prev) => prev.filter((r) => r.id !== id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const songKey = (r: Request) => `${r.artist.toLowerCase()}|${r.song_title.toLowerCase()}`

  const filtered = vibeFilter ? requests.filter((r) => r.vibe === vibeFilter) : requests

  // Group by song+artist, preserving newest-first order
  const groupMap = new Map<string, Request[]>()
  for (const r of filtered) {
    const key = songKey(r)
    if (!groupMap.has(key)) groupMap.set(key, [])
    groupMap.get(key)!.push(r)
  }
  const groups = Array.from(groupMap.values()).map((reqs) => {
    const rep = reqs[0] // newest first
    const selfieReq = reqs.find((r) => r.selfie_url && r.selfie_status === "pending") ?? null
    const allPlayed = reqs.every((r) => r.status === "played")
    const anyUpNext = reqs.some((r) => r.status === "up_next")
    const totalTip = reqs.reduce((sum, r) => sum + (r.price_paid ?? 0), 0)
    const totalBoost = reqs.reduce((sum, r) => sum + (r.boost_amount ?? 0), 0)
    return { key: songKey(rep), rep, reqs, selfieReq, allPlayed, anyUpNext, totalTip, totalBoost, count: reqs.length }
  }).sort((a, b) => Number(b.anyUpNext) - Number(a.anyUpNext))

  return (
    <main className="dashboard" style={{ fontFamily: poppins.style.fontFamily }}>
      <h1 className={pacifico.className}>Live Song Requests</h1>

      <div className="event-bar">
        {activeEvent === undefined ? null : activeEvent ? (
          <div className="event-active">
            <div className="event-info">
              <span className="event-dot" />
              <span className="event-name">{activeEvent.name}</span>
              {activeEvent.venue && <span className="event-venue">@ {activeEvent.venue}</span>}
            </div>
            <button className="end-event-btn" onClick={endEvent} disabled={eventSaving}>
              {eventSaving ? "Ending..." : "End Event"}
            </button>
          </div>
        ) : showStartForm ? (
          <div className="start-event-form">
            <input
              className="event-input"
              placeholder="Event name *"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startEvent()}
              autoFocus
            />
            <input
              className="event-input"
              placeholder="Venue (optional)"
              value={eventVenue}
              onChange={(e) => setEventVenue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startEvent()}
            />
            <div className="event-form-actions">
              <button className="confirm-event-btn" onClick={startEvent} disabled={!eventName.trim() || eventSaving}>
                {eventSaving ? "Starting..." : "Start"}
              </button>
              <button className="cancel-event-btn" onClick={() => { setShowStartForm(false); setEventName(""); setEventVenue("") }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="start-event-btn" onClick={() => setShowStartForm(true)}>
            + Start Event
          </button>
        )}
      </div>

      <div className="vibe-filters">
        <button className={`filter-btn${!vibeFilter ? " active" : ""}`} onClick={() => setVibeFilter(null)}>All</button>
        {VIBES.map((v) => (
          <button key={v} className={`filter-btn${vibeFilter === v ? " active" : ""}`} onClick={() => setVibeFilter(v)}>{v}</button>
        ))}
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Song</th>
              <th>#</th>
              <th>Artist</th>
              <th>Requester</th>
              <th>Vibe</th>
              <th>Notes</th>
              <th>Tip</th>
              <th>Boost</th>
              <th>Status</th>
              <th>Time</th>
              <th>Selfie</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(({ key, rep, reqs, selfieReq, allPlayed, anyUpNext, totalTip, totalBoost, count }) => {
              const ids = reqs.map((r) => r.id)
              return (
              <tr key={key} className={allPlayed ? "played" : ""}>
                <td>
                  {rep.song_title === "" ? (
                    <div
                      ref={djSearchOpen === key ? djDropdownRef : null}
                      style={{ position: "relative", minWidth: "160px" }}
                    >
                      <input
                        className="dj-search-input"
                        placeholder="Search song..."
                        value={djSearchTerms[key] ?? ""}
                        onChange={(e) => handleDjSearch(key, e.target.value, rep.artist)}
                        onFocus={() => { if ((djSearchResults[key] ?? []).length > 0) setDjSearchOpen(key) }}
                      />
                      {djSearchOpen === key && (djSearchResults[key] ?? []).length > 0 && (
                        <div className="dj-itunes-dropdown">
                          {djSearchResults[key].map((track) => (
                            <button
                              key={track.trackId}
                              type="button"
                              className="dj-itunes-item"
                              onMouseDown={(e) => { e.preventDefault(); applyDjTrack(key, ids, track) }}
                            >
                              <img src={track.artworkUrl100} alt="" className="dj-itunes-art" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                              <div className="dj-itunes-text">
                                <div className="dj-itunes-track">{track.trackName}</div>
                                <div className="dj-itunes-artist">{track.artistName}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : rep.song_title}
                </td>
                <td><span className={`dupe-badge count-${Math.min(count, 4)}`}>×{count}</span></td>
                <td>{rep.artist}</td>
                <td>{rep.first_name}</td>
                <td>{rep.vibe || "—"}</td>
                <td className="notes">{rep.notes || "—"}</td>
                <td>${totalTip}</td>
                <td>
                  {totalBoost > 0
                    ? <span className={`boost-badge boost-${totalBoost >= 5 ? 2 : 1}`}>${totalBoost}</span>
                    : <span className="no-boost">—</span>}
                </td>
                <td>{formatStatus(anyUpNext ? "up_next" : rep.status)}</td>
                <td>
                  {new Date(rep.datetime_requested).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="selfie-cell">
                  {selfieReq ? (
                    <div className="selfie-controls">
                      <img src={selfieReq.selfie_url!} alt="selfie" className="selfie-thumb" />
                      <img src={selfieReq.selfie_url!} alt="" className="selfie-preview" />
                      <div className="selfie-actions">
                        <span className="selfie-badge pending">Pending</span>
                        <button className="mod-btn approve" onClick={() => moderateSelfie(selfieReq.id, "approved")}>✓ Approve</button>
                        <button className="mod-btn deny" onClick={() => moderateSelfie(selfieReq.id, "rejected")}>✕ Deny</button>
                      </div>
                    </div>
                  ) : (
                    <span className="no-selfie">—</span>
                  )}
                </td>
                <td className="actions">
                  {!anyUpNext && (
                    <button className="up-next-btn" onClick={() => updateStatusGroup(ids, "up_next")}>▶ Up Next</button>
                  )}
                  <button className="played-btn" onClick={() => updateStatusGroup(ids, "played")}>✓ Played</button>
                  <button className="archive-btn" onClick={() => updateStatusGroup(ids, "archived")}>✕ Archive</button>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .dashboard {
          min-height: 100vh;
          padding: 1rem;
          background-color: #2c1a3b;
          color: #f0e6f5;
          position: relative;
        }
        h1 { text-align: center; font-size: 2rem; margin-bottom: 0.75rem; color: #6b7c3a; }
        .event-bar { display: flex; justify-content: center; margin-bottom: 1rem; }
        .event-active {
          display: flex; align-items: center; gap: 1rem;
          background: #3d2656; border: 1.5px solid #6b7c3a;
          border-radius: 12px; padding: 0.5rem 1rem;
        }
        .event-info { display: flex; align-items: center; gap: 0.5rem; }
        .event-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #7ecf8a; flex-shrink: 0;
          box-shadow: 0 0 6px #7ecf8a;
          animation: pulse-dot 2s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
        }
        .event-name { font-weight: 600; color: #f0e6f5; font-size: 0.95rem; }
        .event-venue { font-size: 0.85rem; color: #a07cc5; }
        .start-event-btn {
          padding: 0.4rem 1.1rem; border-radius: 20px;
          border: 2px solid #6b7c3a; background: transparent;
          color: #6b7c3a; font-size: 0.9rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .start-event-btn:hover { background: #6b7c3a; color: #f0e6f5; }
        .end-event-btn {
          padding: 0.3rem 0.8rem; border-radius: 20px;
          border: 2px solid #ff6b6b; background: transparent;
          color: #ff6b6b; font-size: 0.82rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .end-event-btn:hover:not(:disabled) { background: #ff6b6b; color: #fff; }
        .end-event-btn:disabled { opacity: 0.5; cursor: default; }
        .start-event-form {
          display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; justify-content: center;
        }
        .event-input {
          padding: 0.4rem 0.75rem; border-radius: 10px;
          border: 1.5px solid #a07cc5; background: #3d2656;
          color: #f0e6f5; font-size: 0.9rem; font-family: inherit;
          outline: none; transition: border-color 0.2s;
        }
        .event-input:focus { border-color: #d8b8ff; }
        .event-input::placeholder { color: #7a6a8a; }
        .event-form-actions { display: flex; gap: 0.5rem; }
        .confirm-event-btn {
          padding: 0.4rem 1rem; border-radius: 20px;
          border: 2px solid #6b7c3a; background: #6b7c3a;
          color: #f0e6f5; font-size: 0.9rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .confirm-event-btn:disabled { opacity: 0.5; cursor: default; }
        .cancel-event-btn {
          padding: 0.4rem 0.8rem; border-radius: 20px;
          border: 2px solid #6b586e; background: transparent;
          color: #c9b8e0; font-size: 0.9rem; cursor: pointer; transition: all 0.2s;
        }
        .cancel-event-btn:hover { border-color: #a07cc5; }
        .vibe-filters {
          display: flex; flex-wrap: wrap; gap: 0.5rem;
          justify-content: center; margin-bottom: 1rem;
        }
        .filter-btn {
          padding: 0.3rem 0.8rem; border-radius: 20px;
          border: 2px solid #a07cc5; background: transparent;
          color: #f0e6f5; font-size: 0.8rem; cursor: pointer; transition: all 0.2s;
        }
        .filter-btn.active { background: #a07cc5; color: white; }
        .table-wrapper {
          overflow-x: auto;
          overflow-y: visible;
          background: #3d2656;
          border-radius: 14px;
          border: 1px solid #4e3268;
          box-shadow: 0 4px 24px rgba(0,0,0,0.4);
        }
        table { width: 100%; border-collapse: collapse; min-width: 900px; }
        thead tr { background: #2c1a3b; }
        th {
          padding: 0.75rem 1rem; text-align: center;
          border-bottom: 2px solid #4e3268;
          font-size: 0.78rem; font-weight: 600; color: #a07cc5;
          text-transform: uppercase; letter-spacing: 0.07em;
          white-space: nowrap;
        }
        td {
          padding: 0.65rem 1rem; text-align: center;
          border-bottom: 1px solid #4e3268;
          font-size: 0.9rem; font-weight: 300; color: #c9b8e0;
          vertical-align: middle;
        }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr:hover { background: rgba(160, 124, 197, 0.07); }
        tr.played { background: rgba(136, 128, 95, 0.35); }
        tr.played:hover { background: rgba(136, 128, 95, 0.45); }
        .dupe-badge {
          display: inline-block;
          font-size: 0.78rem; font-weight: 600;
          border: 1.5px solid; border-radius: 20px;
          padding: 0.1rem 0.45rem; white-space: nowrap;
        }
        .count-1 { border-color: #6b586e; color: #6b586e; }
        .count-2 { border-color: #7eb8f7; color: #7eb8f7; }
        .count-3 { border-color: #ffd77d; color: #ffd77d; }
        .count-4 { border-color: #ff6b6b; color: #ff6b6b; }
        .boost-badge {
          display: inline-block;
          font-size: 0.78rem; font-weight: 600;
          border: 1.5px solid; border-radius: 20px;
          padding: 0.1rem 0.45rem; white-space: nowrap;
        }
        .boost-1 { border-color: #7eb8f7; color: #7eb8f7; }
        .boost-2 { border-color: #ffd77d; color: #ffd77d; }
        .boost-3 { border-color: #ff6b6b; color: #ff6b6b; }
        .no-boost { color: #4e3268; }
        .dj-search-input {
          padding: 0.3rem 0.5rem; border-radius: 8px;
          border: 1.5px solid #a07cc5; background: #2c1a3b;
          color: #f0e6f5; font-size: 0.82rem; font-family: inherit;
          outline: none; width: 100%; box-sizing: border-box;
        }
        .dj-search-input:focus { border-color: #d8b8ff; }
        .dj-itunes-dropdown {
          position: absolute; top: calc(100% + 3px); left: 0;
          min-width: 260px; background: #3d2656;
          border: 2px solid #a07cc5; border-radius: 10px;
          z-index: 300; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.6);
        }
        .dj-itunes-item {
          display: flex; align-items: center; gap: 0.5rem;
          width: 100%; padding: 0.4rem 0.6rem;
          background: transparent; border: none; border-bottom: 1px solid #4e3268;
          color: #f0e6f5; font-family: inherit;
          cursor: pointer; text-align: left; transition: background 0.15s;
        }
        .dj-itunes-item:last-child { border-bottom: none; }
        .dj-itunes-item:hover { background: #4e3268; }
        .dj-itunes-art { width: 32px; height: 32px; border-radius: 4px; flex-shrink: 0; }
        .dj-itunes-text { flex: 1; min-width: 0; }
        .dj-itunes-track {
          font-size: 0.82rem; font-weight: 600;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dj-itunes-artist {
          font-size: 0.72rem; color: #c9b8e0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .notes { font-size: 0.85rem; color: #c9b8e0; max-width: 160px; white-space: pre-wrap; }
        .selfie-cell { vertical-align: middle; }
        .selfie-controls { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; }
        .selfie-thumb {
          width: 48px; height: 48px; object-fit: cover;
          border-radius: 6px;
          border: 2px solid transparent; transition: border-color 0.2s;
        }
        .selfie-thumb:hover {
          border-color: #d8b8ff;
        }
        .selfie-controls { position: relative; }
        .selfie-controls:hover .selfie-preview {
          display: block;
        }
        .selfie-preview {
          display: none;
          position: fixed;
          width: 240px; height: 240px; object-fit: cover;
          border-radius: 12px;
          border: 2px solid #d8b8ff;
          box-shadow: 0 8px 24px rgba(0,0,0,0.6);
          z-index: 500;
          transform: translate(-50%, -110%);
          pointer-events: none;
        }
        .selfie-actions {
          display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
        }
        .selfie-badge {
          font-size: 0.68rem; font-weight: bold; padding: 0.15rem 0.4rem;
          border-radius: 4px; white-space: nowrap;
        }
        .selfie-badge.pending { background: #ffd77d; color: #333; }
        .selfie-badge.published { background: #9effa3; color: #000; }
        .selfie-badge.denied { background: #ff6b6b; color: #fff; }
        .mod-btn {
          font-size: 0.72rem; padding: 0.2rem 0.5rem;
          border-radius: 20px; border: 2px solid; cursor: pointer;
          font-weight: bold; white-space: nowrap; width: 100%;
          background: transparent; transition: all 0.2s;
        }
        .mod-btn.approve { border-color: #7ecf8a; color: #7ecf8a; }
        .mod-btn.approve:hover { background: #7ecf8a; color: #1a3b2c; }
        .mod-btn.deny { border-color: #ff6b6b; color: #ff6b6b; }
        .mod-btn.deny:hover { background: #ff6b6b; color: #fff; }
        .no-selfie { color: #6b586e; }
        .actions button {
          margin-right: 0.25rem; margin-bottom: 0.25rem;
          padding: 0.3rem 0.6rem; font-size: 0.85rem;
          border-radius: 20px; border: 2px solid; cursor: pointer;
          font-weight: bold; background: transparent; transition: all 0.2s;
        }
        .up-next-btn { border-color: #7eb8f7; color: #7eb8f7; }
        .up-next-btn:hover { background: #7eb8f7; color: #1a2c3b; }
        .played-btn { border-color: #7ecf8a; color: #7ecf8a; }
        .played-btn:hover { background: #7ecf8a; color: #1a3b2c; }
        .archive-btn { border-color: #ff6b6b; color: #ff6b6b; }
        .archive-btn:hover { background: #ff6b6b; color: #fff; }
        @media (max-width: 768px) {
          th, td { padding: 0.4rem 0.5rem; font-size: 0.9rem; }
          .actions button { font-size: 0.8rem; padding: 0.2rem 0.4rem; }
        }
        @media (max-width: 480px) {
          h1 { font-size: 1.5rem; }
          th, td { font-size: 0.85rem; }
          .actions button { font-size: 0.75rem; padding: 0.2rem 0.3rem; }
        }
      `}</style>
    </main>
  )
}
