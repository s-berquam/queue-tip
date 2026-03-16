"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Pacifico } from "next/font/google"
import { supabase } from "lib/supabase"
import TipModal from "../../components/TipModal"

const pacifico = Pacifico({ weight: "400", subsets: ["latin"] })

const SELFIE_TIERS = [
  { amount: 1, label: "$1 — +5s" },
  { amount: 3, label: "$3 — +10s" },
  { amount: 5, label: "$5 — +15s" },
]

export default function Landing() {
  const [selfieApproved, setSelfieApproved] = useState(false)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [selfieModalOpen, setSelfieModalOpen] = useState(false)
  const [activeTip, setActiveTip] = useState<{ tipAmount: number; requestId: string } | null>(null)

  useEffect(() => {
    const id = localStorage.getItem("my_request_id")
    if (!id) return
    setRequestId(id)
    supabase
      .from("requests")
      .select("selfie_status")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data?.selfie_status === "approved") setSelfieApproved(true)
      })
  }, [])

  function handleSelfieTip(amount: number) {
    if (!requestId) return
    setSelfieModalOpen(false)
    setActiveTip({ tipAmount: amount, requestId })
  }

  return (
    <main className="landing">
      <div className="container">

        <div className="logo">

          <div className="wordmark">
            <span className={pacifico.className}>
              <span className="q-wrap">
                <span className="queue">Q</span>
                <svg className="crown" viewBox="0 0 52 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Crown points */}
                  <path d="M2 24 L2 10 L13 18 L26 2 L39 18 L50 10 L50 24 Z" fill="#6b7c3a" stroke="#a0b85a" strokeWidth="1.5" strokeLinejoin="round"/>
                  {/* Base band */}
                  <rect x="2" y="22" width="48" height="6" rx="2" fill="#5a6830" stroke="#a0b85a" strokeWidth="1.2"/>
                  {/* Gems */}
                  <circle cx="26" cy="5" r="3" fill="#6b7c3a"/>
                  <circle cx="13" cy="19" r="2.2" fill="#f0e6f5" className="gem gem-1"/>
                  <circle cx="39" cy="19" r="2.2" fill="#f0e6f5" className="gem gem-2"/>
                  <circle cx="2" cy="11" r="1.8" fill="#6b7c3a"/>
                  <circle cx="50" cy="11" r="1.8" fill="#6b7c3a"/>
                </svg>
              </span><span className="queue">ueue</span><span className="tip">Tip</span>
            </span>
            <span className="tagline">request · boost · vibe</span>
          </div>
        </div>

        <Link href="/request-page">
          <button>Request a Song</button>
        </Link>
        <Link href="/queue">
          <button className="secondary">View Queue</button>
        </Link>
        <Link href="/book">
          <button className="book-btn">Book With Us</button>
        </Link>
      </div>

      {activeTip && (
        <TipModal
          title="Keep your selfie on screen"
          tipAmount={activeTip.tipAmount}
          tipType="selfie"
          requestId={activeTip.requestId}
          onSuccess={() => setActiveTip(null)}
          onClose={() => setActiveTip(null)}
        />
      )}

      {selfieModalOpen && (
        <div className="modal-overlay" onClick={() => setSelfieModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className={pacifico.className}>Keep your selfie on screen! 🔥</h2>
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

      {selfieApproved && (
        <div className="selfie-banner">
          <span>Your selfie is on the big screen!</span>
          <button className="selfie-btn" onClick={() => setSelfieModalOpen(true)}>Keep it on longer 🔥</button>
        </div>
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
        .landing {
          min-height: 100vh;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 1.5rem;
          background-color: #2c1a3b; /* warm dark purple */
          color: #f0e6f5;
          box-sizing: border-box;
        }

        .container {
          text-align: center;
          max-width: 400px;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .logo {
          position: absolute;
          top: 3rem;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          width: 100%;
          max-width: 400px;
        }
        .wordmark {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .wordmark > span:first-child {
          font-size: 2.8rem;
          line-height: 1.1;
          padding-bottom: 0.4rem;
        }
        .q-wrap {
          position: relative;
          display: inline-block;
        }
        .crown {
          position: absolute;
          width: 36px;
          top: -8px;
          left: 50%;
          transform: translateX(-60%) rotate(-14deg);
        }
        .queue { color: #d8b8ff; }
        .tip { color: #6b7c3a; }
        .tagline {
          font-size: 0.75rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          background: linear-gradient(
            90deg,
            #7a6a8a 0%,
            #7a6a8a 20%,
            #d8b8ff 40%,
            #f0e6f5 50%,
            #d8b8ff 60%,
            #7a6a8a 80%,
            #7a6a8a 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 6s linear infinite;
        }

        @keyframes shimmer {
          from { background-position: 200% center; }
          to { background-position: -200% center; }
        }

        :global(.gem) {
          transform-box: fill-box;
          transform-origin: center;
          animation: sparkle 2.4s ease-in-out infinite;
        }
        :global(.gem-2) {
          animation-delay: 1.2s;
        }
        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1); filter: none; }
          40% { opacity: 0.15; transform: scale(0.6); filter: none; }
          50% { opacity: 1; transform: scale(1.5); filter: drop-shadow(0 0 3px #fff); }
          60% { opacity: 0.15; transform: scale(0.6); filter: none; }
        }

        p {
          font-size: 1.1rem;
        }

        button {
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          border-radius: 8px;
          border: none;
          background-color: #d8b8ff; /* light lavender */
          color: #2c1a3b;
          font-weight: bold;
          cursor: pointer;
          transition: background-color 0.2s;
          min-width: 220px;
        }

        button:hover {
          background-color: #c3a0ff;
        }
        button.book-btn {
          background-color: #6b7c3a;
          color: #2c1a3b;
          border: none;
        }
        button.book-btn:hover {
          background-color: #5a6830;
        }
        button.secondary {
          background-color: transparent;
          border: 2px solid #d8b8ff;
          color: #d8b8ff;
        }
        button.secondary:hover {
          background-color: #d8b8ff;
          color: #2c1a3b;
        }

        .socials {
          position: fixed;
          bottom: 1.5rem;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 1.5rem;
        }
        .socials a {
          color: #a07cc5;
          transition: color 0.2s;
        }
        .socials a:hover {
          color: #d8b8ff;
        }

        .selfie-banner {
          position: fixed;
          top: 1.25rem;
          left: 50%;
          transform: translateX(-50%);
          background: #3d2656;
          border: 2px solid #ffd77d;
          border-radius: 12px;
          padding: 0.65rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          white-space: nowrap;
          z-index: 100;
        }
        .selfie-banner span { font-size: 0.9rem; color: #ffd77d; }
        .selfie-btn {
          background: #ffd77d; color: #2c1a3b; border: none;
          border-radius: 20px; padding: 0.35rem 0.9rem;
          font-size: 0.85rem; font-weight: bold; cursor: pointer;
          white-space: nowrap; transition: background 0.2s;
        }
        .selfie-btn:hover { background: #ffc94d; }

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
        .modal h2 { font-size: 1.4rem; color: #ffd77d; margin: 0; text-align: center; }
        .modal-sub { font-size: 0.9rem; color: #c9b8e0; margin: 0; text-align: center; }
        .tip-tiers { display: flex; flex-direction: column; gap: 0.5rem; }
        .tip-tier-btn {
          padding: 0.75rem; border-radius: 10px; border: 2px solid #a07cc5;
          background: #a07cc5; color: #f0e6f5; font-size: 1rem;
          cursor: pointer; transition: all 0.2s;
        }
        .tip-tier-btn:hover { background: #8a63b0; border-color: #8a63b0; }
        .modal-cancel {
          padding: 0.5rem; border-radius: 10px; border: 2px solid #6b586e;
          background: transparent; color: #c9b8e0; font-size: 0.9rem;
          cursor: pointer; transition: all 0.2s;
        }
        .modal-cancel:hover { border-color: #a07cc5; color: #f0e6f5; }

        /* Mobile adjustments */
        @media (max-width: 480px) {
          h1 {
            font-size: 2rem;
          }

          p {
            font-size: 1rem;
          }

          button {
            width: 100%; /* stretch button full width */
            font-size: 1rem;
            padding: 0.7rem;
          }

          .container {
            gap: 0.75rem; /* reduce spacing for small screens */
          }
        }

        /* Tablet adjustments */
        @media (max-width: 768px) {
          h1 {
            font-size: 2.2rem;
          }

          p {
            font-size: 1.05rem;
          }

          button {
            font-size: 1rem;
            padding: 0.75rem 1.25rem;
          }
        }
      `}</style>
    </main>
  )
}