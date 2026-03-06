"use client"

import { useEffect, useState } from "react"
import { supabase } from "lib/supabase"

type Request = {
  id: string
  first_name: string
  song_title: string
  artist: string
  notes: string | null
  status: "pending" | "up_next" | "played" | "archived"
  requested_at: string
  price_paid?: number
  request_count?: number
}

export default function Dashboard() {
  const [requests, setRequests] = useState<Request[]>([])
  const [prevRequests, setPrevRequests] = useState<Request[]>([])
  const [toast, setToast] = useState<string | null>(null)

  // Enum-safe status values
  const STATUS_VALUES: Record<string, Request["status"]> = {
    Played: "played",
    "Up Next": "up_next",
    Archived: "archived",
  }

  // Notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission()
    }
  }, [])

  async function fetchRequests() {
    const { data, error } = await supabase
      .from<Request>("requests")
      .select("*")
      .order("requested_at", { ascending: false })

    if (data) {
      data.forEach(req => {
        const prev = prevRequests.find(p => p.id === req.id)
        if (prev && prev.status !== "up_next" && req.status === "up_next") {
          notifyUpNext(req)
        }
      })

      setRequests(data)
      setPrevRequests(data)
    }

    if (error) console.error("Fetch error:", error)
  }

  function formatStatus(status: string) {
    return status
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  function notifyUpNext(request: Request) {
    const formattedStatus = formatStatus(request.status)

    // Browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(`${formattedStatus}!`, {
        body: `${request.first_name}, "${request.song_title}" by ${request.artist}`,
        icon: "/favicon.ico",
      })
    }

    // In-page toast
    setToast(`🎵 ${request.first_name}, "${request.song_title}" is ${formattedStatus}!`)
    setTimeout(() => setToast(null), 4000)
  }

  async function updateStatus(id: string, status: Request["status"]) {
    console.log("Updating request", id, "to", status)

    const { data, error } = await supabase
      .from("requests")
      .update({ status })
      .eq("id", id)

    if (error) console.error("Update error:", error)
    else {
      setRequests(prev =>
        prev.map(req => {
          const updated = req.id === id ? { ...req, status } : req
          if (req.id === id && status === "up_next") notifyUpNext(updated)
          return updated
        })
      )
    }
  }

  useEffect(() => {
    fetchRequests()
    const interval = setInterval(fetchRequests, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <main className="dashboard">
      {toast && <div className="toast">{toast}</div>}

      <h1>🎶 Live Song Requests</h1>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Song</th>
              <th>Artist</th>
              <th>Requester</th>
              <th>Tip</th>
              <th>Status</th>
              <th>Requested At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(req => (
              <tr key={req.id} className={req.status === "played" ? "played" : ""}>
                <td>{req.song_title}</td>
                <td>{req.artist}</td>
                <td>{req.first_name}</td>
                <td>${req.price_paid || 0}</td>
                <td>{formatStatus(req.status)}</td>
                <td>{new Date(req.requested_at).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}</td>
                <td className="actions">
                  {Object.entries(STATUS_VALUES).map(([label, value]) => (
                    <button key={value} onClick={() => updateStatus(req.id, value)}>
                      {label}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
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
        h1 {
          text-align: center;
          font-size: 2rem;
          margin-bottom: 1rem;
        }
        .table-wrapper {
          overflow-x: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 600px;
        }
        th, td {
          padding: 0.5rem 0.75rem;
          text-align: left;
          border-bottom: 1px solid #6b586e;
        }
        tr.played {
          background-color: #88805f;
        }
        .actions button {
          margin-right: 0.25rem;
          margin-bottom: 0.25rem;
          padding: 0.25rem 0.5rem;
          font-size: 0.85rem;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-weight: bold;
        }
        .actions button:nth-child(1) { background-color: #9effa3; color: #000; }
        .actions button:nth-child(2) { background-color: #ffd77d; color: #000; }
        .actions button:nth-child(3) { background-color: #ff6b6b; color: #fff; }

        .toast {
          position: fixed;
          top: 1rem;
          left: 50%;
          transform: translateX(-50%);
          background-color: #ffd77d;
          color: #000;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: bold;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          z-index: 1000;
        }
        @media (max-width: 768px) {
          th, td { padding: 0.4rem 0.5rem; font-size: 0.9rem; }
          .actions button { font-size: 0.8rem; padding: 0.2rem 0.4rem; }
          .toast { font-size: 0.85rem; padding: 0.6rem 1rem; }
        }
        @media (max-width: 480px) {
          h1 { font-size: 1.5rem; }
          th, td { font-size: 0.85rem; }
          .actions button { font-size: 0.75rem; padding: 0.2rem 0.3rem; }
          .toast { font-size: 0.8rem; padding: 0.5rem 0.9rem; }
        }
      `}</style>
    </main>
  )
}