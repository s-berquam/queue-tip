"use client"

import { useState } from "react"
import { supabase } from "lib/supabase"
import { v4 as uuidv4 } from "uuid"
import Link from "next/link"

export default function RequestPage() {
  const [firstName, setFirstName] = useState("")
  const [song, setSong] = useState("")
  const [artist, setArtist] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  function validatePhone(phone: string) {
    return /^\+?[\d\s\-]{7,15}$/.test(phone)
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
        notes: notes.trim() || null
      }
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
      setSuccess(true)
    }
  }

  return (
    <main className="request-page">
      <div className="container">
        <h1>All Love Song Requests 🎶</h1>

        <form onSubmit={handleSubmit}>
          {errorMsg && <p className="error">{errorMsg}</p>}
          {success && <p className="success">Request sent successfully!</p>}

          <input placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} />
          <input placeholder="Song Title" value={song} onChange={e => setSong(e.target.value)} />
          <input placeholder="Artist" value={artist} onChange={e => setArtist(e.target.value)} />
          <input type="email" placeholder="Email (optional if phone provided)" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="tel" placeholder="Phone (optional if email provided)" value={phone} onChange={e => setPhone(e.target.value)} />
          <textarea placeholder="Optional notes" value={notes} onChange={e => setNotes(e.target.value)} />
          <button disabled={loading}>{loading ? "Submitting..." : "Send Request"}</button>
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
    background-color: #2c1a3b; /* dark warm background */
    color: #f0e6f5;
  }

  .container {
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
  }

  h1 {
    text-align: center;
    font-size: 2rem;
    margin-bottom: 1rem;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  input,
  textarea,
  button {
    padding: 0.75rem;
    border-radius: 8px;
    border: none;
    font-size: 1rem;
    width: 100%;
    box-sizing: border-box;
  }

  input,
  textarea {
    color: #2c1a3b;
  }

  textarea {
    resize: vertical;
    min-height: 80px;
  }

  button {
    background-color: #d8b8ff; /* light lavender */
    color: #2c1a3b;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  button:hover {
    background-color: #c3a0ff;
  }

  .back-btn {
    margin-top: 1rem;
    background-color: #888;
    color: #fff;
    width: 100%;
  }

  .error {
    color: #ff6b6b;
    text-align: center;
  }

  .success {
    color: #9effa3;
    text-align: center;
  }

  /* Responsive adjustments */
  @media (max-width: 480px) {
    h1 {
      font-size: 1.5rem;
    }

    input,
    textarea,
    button,
    .back-btn {
      font-size: 1rem;
      padding: 0.7rem;
    }
  }
`}</style>
    </main>
  )
}