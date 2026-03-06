"use client"

import Link from "next/link"

export default function Landing() {
  return (
    <main className="landing">
      <div className="container">
        <h1>🎶 All Love Requests</h1>
        <p>Welcome! Click below to request a song:</p>
        <Link href="/request-page">
          <button>Request a Song</button>
        </Link>
      </div>



      <style jsx>{`
        .landing {
          min-height: 100vh;
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

        h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
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
        }

        button:hover {
          background-color: #c3a0ff;
        }

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