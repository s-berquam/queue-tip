"use client"

import { useEffect, useRef, useState } from "react"
import { Pacifico, Poppins } from "next/font/google"

const pacifico = Pacifico({ weight: "400", subsets: ["latin"] })
const poppins = Poppins({ weight: ["300", "400", "600"], subsets: ["latin"] })

type Props = {
  title: string
  tipAmount: number
  tipType: "dj" | "boost" | "selfie"
  requestId: string
  onSuccess: () => void
  onClose: () => void
}

declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => Promise<SquarePayments>
    }
  }
}

interface SquarePayments {
  card: (options?: Record<string, unknown>) => Promise<SquareCard>
}

interface SquareCard {
  attach: (el: HTMLElement) => Promise<void>
  tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }>
  destroy: () => Promise<void>
}

export default function TipModal({ title, tipAmount, tipType, requestId, onSuccess, onClose }: Props) {
  const [savedCard, setSavedCard] = useState<{ customerId: string; cardId: string; last4: string } | null>(null)
  const [showNewCard, setShowNewCard] = useState(false)
  const [cardReady, setCardReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const cardContainerRef = useRef<HTMLDivElement>(null)
  const cardInstanceRef = useRef<SquareCard | null>(null)

  useEffect(() => {
    const customerId = localStorage.getItem("sq_customer_id")
    const cardId = localStorage.getItem("sq_card_id")
    const last4 = localStorage.getItem("sq_card_last4")
    if (customerId && cardId && last4) {
      setSavedCard({ customerId, cardId, last4 })
    } else {
      setShowNewCard(true)
    }
  }, [])

  useEffect(() => {
    if (!showNewCard) return
    let card: SquareCard | null = null

    async function init() {
      const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID
      const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID
      if (!appId || !locationId) {
        setError("Payment config missing. Contact support.")
        return
      }
      if (!window.Square) {
        await loadScript()
      }
      if (!window.Square) {
        setError("Payment form failed to load. Please refresh and try again.")
        return
      }
      try {
        const payments = await window.Square.payments(appId, locationId)
        card = await payments.card({
          style: {
            ".input-container": {
              borderColor: "#4e3268",
              borderRadius: "8px",
            },
            ".input-container.is-focus": {
              borderColor: "#a07cc5",
            },
            ".input-container.is-error": {
              borderColor: "#ff6b6b",
            },
            ".message-text": {
              color: "#c9b8e0",
            },
            ".message-icon": {
              color: "#c9b8e0",
            },
            input: {
              backgroundColor: "#3d2656",
              color: "#f0e6f5",
            },
            "input::placeholder": {
              color: "#7a6a8a",
            },
          },
        })
        if (cardContainerRef.current) {
          await card.attach(cardContainerRef.current)
          cardInstanceRef.current = card
          setCardReady(true)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error("Square init error:", msg)
        setError(`Payment form error: ${msg}`)
      }
    }

    init()

    return () => {
      card?.destroy().catch(() => {})
      cardInstanceRef.current = null
      setCardReady(false)
    }
  }, [showNewCard])

  function loadScript(): Promise<void> {
    return new Promise((resolve) => {
      if (window.Square) { resolve(); return }
      const existing = document.querySelector('script[src*="squarecdn.com"]') as HTMLScriptElement | null
      if (existing) {
        // Script tag exists but may still be loading — wait for it
        existing.addEventListener("load", () => resolve())
        existing.addEventListener("error", () => resolve())
        return
      }
      const script = document.createElement("script")
      script.src = "https://sandbox.web.squarecdn.com/v1/square.js"
      script.onload = () => resolve()
      script.onerror = () => resolve()
      document.head.appendChild(script)
    })
  }

  async function handleSavedCard() {
    if (!savedCard || submitting) return
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/square-charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipType,
          tipAmount,
          requestId,
          customerId: savedCard.customerId,
          cardId: savedCard.cardId,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? "Payment failed.")
        setSubmitting(false)
        return
      }
      onSuccess()
    } catch {
      setError("Something went wrong.")
      setSubmitting(false)
    }
  }

  async function handleNewCard() {
    if (!cardInstanceRef.current || submitting) return
    setSubmitting(true)
    setError("")
    try {
      const result = await cardInstanceRef.current.tokenize()
      if (result.status !== "OK" || !result.token) {
        setError(result.errors?.[0]?.message ?? "Card error. Please try again.")
        setSubmitting(false)
        return
      }
      const res = await fetch("/api/square-charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipType, tipAmount, requestId, sourceId: result.token }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? "Payment failed.")
        setSubmitting(false)
        return
      }
      // Save card for future tips
      if (json.customerId && json.cardId && json.last4) {
        localStorage.setItem("sq_customer_id", json.customerId)
        localStorage.setItem("sq_card_id", json.cardId)
        localStorage.setItem("sq_card_last4", json.last4)
      }
      onSuccess()
    } catch {
      setError("Something went wrong.")
      setSubmitting(false)
    }
  }

  function switchToNewCard() {
    setSavedCard(null)
    setShowNewCard(true)
  }

  return (
    <div className="tip-modal-overlay" onClick={() => !submitting && onClose()}>
      <div className="tip-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className={pacifico.className}>{title}</h2>
        <p className="amount-label">${tipAmount}</p>

        {savedCard && !showNewCard ? (
          <>
            <p className="saved-label">Card ending in <strong>{savedCard.last4}</strong></p>
            {error && <p className="tip-error">{error}</p>}
            <button className="pay-btn" onClick={handleSavedCard} disabled={submitting}>
              {submitting ? "Processing..." : `Pay $${tipAmount}`}
            </button>
            <button className="change-card-link" onClick={switchToNewCard} disabled={submitting}>
              Use a different card
            </button>
          </>
        ) : (
          <>
            <div ref={cardContainerRef} className="sq-card-container" />
            {!cardReady && <p className="loading-label">Loading payment form...</p>}
            {error && <p className="tip-error">{error}</p>}
            {cardReady && (
              <button className="pay-btn" onClick={handleNewCard} disabled={submitting}>
                {submitting ? "Processing..." : `Pay $${tipAmount}`}
              </button>
            )}
          </>
        )}

        <button className="cancel-btn" onClick={onClose} disabled={submitting}>Cancel</button>
      </div>

      <style jsx>{`
        .tip-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.75);
          display: flex; align-items: center; justify-content: center;
          z-index: 2000; padding: 1rem;
        }
        .tip-modal {
          background: #3d2656; border: 2px solid #a07cc5;
          border-radius: 20px; padding: 2rem 1.5rem;
          max-width: 340px; width: 100%;
          display: flex; flex-direction: column; gap: 0.85rem;
          align-items: center; font-family: ${poppins.style.fontFamily};
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
        h2 { font-size: 1.5rem; color: #6b7c3a; margin: 0; }
        .amount-label { font-size: 1.8rem; font-weight: 600; color: #d8b8ff; margin: 0; }
        .saved-label { font-size: 0.95rem; color: #c9b8e0; margin: 0; }
        .saved-label strong { color: #f0e6f5; }
        .sq-card-container { width: 100%; min-height: 90px; }
        .loading-label { font-size: 0.85rem; color: #a07cc5; margin: 0; }
        .tip-error { font-size: 0.85rem; color: #ff6b6b; margin: 0; text-align: center; }
        .pay-btn {
          width: 100%; padding: 0.85rem; border-radius: 12px; border: none;
          background: #a07cc5; color: #f0e6f5; font-size: 1.1rem; font-weight: 600;
          font-family: ${poppins.style.fontFamily}; cursor: pointer; transition: background 0.2s;
        }
        .pay-btn:hover:not(:disabled) { background: #8a63b0; }
        .pay-btn:disabled { opacity: 0.6; cursor: default; }
        .change-card-link {
          background: none; border: none; color: #7a6a8a; font-size: 0.85rem;
          cursor: pointer; text-decoration: underline; padding: 0;
          font-family: ${poppins.style.fontFamily};
        }
        .change-card-link:hover:not(:disabled) { color: #c9b8e0; }
        .cancel-btn {
          width: 100%; padding: 0.5rem; border-radius: 10px;
          border: 2px solid #6b586e; background: transparent;
          color: #c9b8e0; font-size: 0.9rem; cursor: pointer; transition: all 0.2s;
          font-family: ${poppins.style.fontFamily};
        }
        .cancel-btn:hover:not(:disabled) { border-color: #a07cc5; color: #f0e6f5; }
      `}</style>
    </div>
  )
}
