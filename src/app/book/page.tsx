"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "lib/supabase"
import { Pacifico, Poppins } from "next/font/google"

const pacifico = Pacifico({ weight: "400", subsets: ["latin"] })
const poppins = Poppins({ weight: ["300", "400", "600"], subsets: ["latin"] })

export default function BookPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [eventInfo, setEventInfo] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [submitted, setSubmitted] = useState(false)

  function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  function validatePhone(phone: string) {
    return /^\+?[\d\s\-]{7,15}$/.test(phone)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg("")

    if (!fullName.trim()) {
      setErrorMsg("Full name is required.")
      return
    }
    if (!email.trim() && !phone.trim()) {
      setErrorMsg("Please provide either an email or phone number.")
      return
    }
    if (email && !validateEmail(email)) {
      setErrorMsg("Invalid email format.")
      return
    }
    if (phone && !validatePhone(phone)) {
      setErrorMsg("Invalid phone format.")
      return
    }
    if (eventDate) {
      const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/
      if (!dateRegex.test(eventDate)) {
        setErrorMsg("Please enter the date as MM/DD/YYYY.")
        return
      }
      const [month, day, year] = eventDate.split("/").map(Number)
      const entered = new Date(year, month - 1, day)
      if (entered <= new Date()) {
        setErrorMsg("Event date must be in the future.")
        return
      }
    }

    setLoading(true)
    const { error } = await supabase.from("bookings").insert([{
      full_name: fullName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      event_date: eventDate ? `${eventDate.split("/")[2]}-${eventDate.split("/")[0]}-${eventDate.split("/")[1]}` : null,
      event_info: eventInfo.trim() || null,
    }])
    setLoading(false)

    if (error) {
      setErrorMsg(error.message)
    } else {
      setSubmitted(true)
      setTimeout(() => router.push("/home"), 5000)
    }
  }

  if (submitted) {
    return (
      <main className="book-page" style={{ fontFamily: poppins.style.fontFamily }}>
        <div className="modal-overlay">
          <div className="modal">
            <h2 className={pacifico.className}>Request Received!</h2>
            <p>Thanks for reaching out! I'll be in touch soon to discuss your event.</p>
          </div>
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
        <Styles pacifico={pacifico.style.fontFamily} poppins={poppins.style.fontFamily} />
      </main>
    )
  }

  return (
    <main className="book-page" style={{ fontFamily: poppins.style.fontFamily }}>
      <div className="container">
        <div className="top-nav">
          <button className="back-arrow" onClick={() => router.push("/home")}>⌂ Home</button>
        </div>
        <h1 className={pacifico.className}>Book All Love</h1>
        <p className="sub">Fill out the form below and I'll get back to you to discuss your event.</p>

        <form onSubmit={handleSubmit}>
          {errorMsg && <p className="error">{errorMsg}</p>}

          <input
            className="input-field"
            name="name"
            placeholder="Full Name *"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <input
            className="input-field"
            type="email"
            name="email"
            placeholder="Email (optional if phone provided)"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input-field"
            type="tel"
            name="tel"
            placeholder="Phone (optional if email provided)"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            className="input-field date-input"
            type="text"
            name="event-date"
            autoComplete="off"
            placeholder="Event Date e.g. 12/31/2025 (optional)"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
          <div className="info-section">
            <p className="section-label">Tell me about your event <span className="optional">(optional)</span></p>
            <textarea
              className="input-field"
              name="event-info"
              autoComplete="off"
              placeholder="Venue, vibe, expected attendance, anything helpful..."
              value={eventInfo}
              onChange={(e) => setEventInfo(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? "Sending..." : "Send Booking Request"}
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

      <Styles pacifico={pacifico.style.fontFamily} poppins={poppins.style.fontFamily} />
    </main>
  )
}

function Styles({ pacifico, poppins }: { pacifico: string; poppins: string }) {
  return (
    <style jsx global>{`
      .book-page {
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding: 2rem 1rem;
        background-color: #2c1a3b;
        color: #f0e6f5;
        font-family: ${poppins};
        overflow-x: hidden;
        box-sizing: border-box;
      }
      .book-page .container {
        width: 100%;
        max-width: 420px;
        display: flex;
        flex-direction: column;
      }
      .book-page .top-nav { margin-bottom: 0.5rem; }
      .book-page .back-arrow {
        background: transparent; border: 2px solid #a07cc5;
        color: #c9b8e0; border-radius: 20px; padding: 0.35rem 0.9rem;
        font-size: 0.9rem; cursor: pointer; transition: all 0.2s;
      }
      .book-page .back-arrow:hover { background: #a07cc5; color: white; }
      .book-page h1 {
        text-align: center;
        font-size: 2.5rem;
        margin-bottom: 0.5rem;
        color: #6b7c3a;
      }
      .book-page .success-icon {
        text-align: center;
        font-size: 3rem;
        margin-bottom: 0.5rem;
      }
      .book-page .sub {
        text-align: center;
        font-size: 0.9rem;
        color: #c9b8e0;
        margin: 0 0 1.25rem;
        line-height: 1.4;
      }
      .book-page form {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
      }
      .book-page .input-field {
        padding: 0.75rem;
        border-radius: 12px;
        border: 2px solid #3d2656;
        font-size: 1rem;
        width: 100%;
        box-sizing: border-box;
        font-family: ${poppins};
        color: #f0e6f5;
        background-color: #3d2656;
        outline: none;
        transition: border-color 0.2s;
      }
      .book-page .input-field:focus { border-color: #a07cc5; }
      .book-page .input-field::placeholder { color: #7a6a8a; }
      .book-page .input-field:-webkit-autofill,
      .book-page .input-field:-webkit-autofill:hover,
      .book-page .input-field:-webkit-autofill:focus {
        -webkit-box-shadow: 0 0 0px 1000px #3d2656 inset;
        -webkit-text-fill-color: #f0e6f5;
        caret-color: #f0e6f5;
      }
      .book-page textarea.input-field {
        resize: vertical;
        min-height: 110px;
      }
      .book-page .date-input {
        width: 100%;
        box-sizing: border-box;
        -webkit-appearance: none;
        appearance: none;
        display: block;
        line-height: normal;
        color: #7a6a8a;
      }
      .book-page .date-input:valid {
        color: #f0e6f5;
      }
      .book-page .date-input::-webkit-calendar-picker-indicator {
        filter: invert(0.7);
        cursor: pointer;
      }
      .book-page .date-section,
      .book-page .info-section {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }
      .book-page .section-label {
        font-size: 0.88rem;
        color: #c9b8e0;
        margin: 0;
      }
      .book-page .optional {
        font-size: 0.8rem;
        color: #7a6a8a;
      }
      .book-page .submit-btn {
        background-color: #6b7c3a;
        color: #c9b8e0;
        font-weight: bold;
        cursor: pointer;
        border: none;
        border-radius: 12px;
        padding: 0.8rem;
        font-size: 1.2rem;
        font-family: ${pacifico};
        transition: background-color 0.2s;
      }
      .book-page .submit-btn:hover:not(:disabled) { background-color: #5a6830; }
      .book-page .submit-btn:disabled { opacity: 0.6; cursor: default; }
      .book-page .home-btn {
        background: transparent; border: 2px solid #a07cc5;
        color: #c9b8e0; border-radius: 20px; padding: 0.35rem 0.9rem;
        font-size: 0.9rem; cursor: pointer; transition: all 0.2s;
        align-self: center; margin-top: 0.5rem;
      }
      .book-page .home-btn:hover { background: #a07cc5; color: white; }
      .book-page .error {
        color: #6b7c3a;
        text-align: center;
        font-weight: bold;
      }
      .modal-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.6);
        display: flex; align-items: center; justify-content: center;
        z-index: 1000; padding: 1rem;
      }
      .modal {
        background: #3d2656; border: 2px solid #a07cc5;
        border-radius: 20px; padding: 2rem 1.5rem;
        max-width: 340px; width: 100%;
        display: flex; flex-direction: column;
        align-items: center; gap: 0.75rem; text-align: center;
      }
      .modal h2 {
        font-size: 1.8rem; color: #6b7c3a; margin: 0;
      }
      .modal p {
        font-size: 0.9rem; color: #c9b8e0; margin: 0;
      }
      @media (max-width: 430px) {
        .book-page {
          padding-bottom: 6rem;
        }
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
    `}</style>
  )
}
