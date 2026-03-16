# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server on localhost:3000
npm run build    # Build for production
npm start        # Start production server
npx eslint .     # Lint (no lint script in package.json)
```

No test suite is configured.

## Architecture

**QueueTip** is a real-time song request app for DJs. Guests submit song requests, tip to boost priority, and upload selfies. DJs manage the queue from a dashboard.

### Stack
- **Next.js 16** (App Router, all pages are client components with `"use client"`)
- **Supabase** — PostgreSQL database + Realtime WebSocket subscriptions
- **Square** — Payment processing for tips and boosts
- **iTunes Search API** — Song search/autocomplete
- **Tailwind CSS 4** + styled-jsx inline styles

### Key Data Flow

```
Guest pages (/request-page, /queue, /selfie)
    ↓ Supabase Realtime subscriptions (live queue updates)
DJ Dashboard (/dashboard)
    ↓ API routes (/api/*)
Supabase DB ← Square Payments ← iTunes Search
```

### Pages & Their Roles
- `/home` — Landing page
- `/request-page` — Song request form (name, artist, vibe, optional tip)
- `/queue` — Live queue display; guests can boost requests with tips ($2 = up 2 spots, $5 = jump to top); ordered by `boost_amount` descending
- `/dashboard` — DJ admin: manage event lifecycle, move request statuses, assign songs for DJ's Choice requests
- `/selfie` — Selfie upload + display
- `/monitor` — Read-only realtime queue display

### Request Lifecycle
Statuses: `pending` → `up_next` → `played` → `archived`

The DJ drives status transitions from the dashboard. When an event ends, all remaining requests are archived. Requests with `archived` or `played` status are hidden from guest views.

### Realtime Pattern
Pages subscribe to Supabase Realtime channels scoped to the active `event_id`. When the event changes, the channel is reset and requests are refetched. The active event is the single row in `events` where `is_active = true`.

### Queue Ordering
Queue is ordered by `boost_amount` descending (then `up_next` status pins to top). When a guest pays to boost, `square-charge` queries the live queue ordered by `boost_amount`, calculates the target position, and sets the request's `boost_amount` to `target.boost_amount + 1` to slot it in correctly.

### Payment Flow
`TipModal.tsx` (`src/components/`) handles Square card tokenization. API routes under `/api/` (`boost-tip`, `dj-tip`, `selfie-tip`, `square-charge`) process payments server-side. Idempotency keys (UUID) prevent duplicate charges.

### DJ's Choice
When a guest submits an artist name without a song title, it's a "DJ's Choice" request. The DJ uses iTunes search on the dashboard to assign a song to it before playing.

### Supabase Client
Single singleton in `src/lib/supabase.ts`. Uses the anon key for client-side and service role key in API routes.

### Path Alias
`@/*` maps to the project root (configured in `tsconfig.json`).

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SQUARE_ACCESS_TOKEN
SQUARE_LOCATION_ID
SQUARE_WEBHOOK_SIGNATURE_KEY
NEXT_PUBLIC_SQUARE_APP_ID
NEXT_PUBLIC_SQUARE_LOCATION_ID
NEXT_PUBLIC_BASE_URL
```

Optional: `TWILIO_*` (SMS), `META_*` / `DISCORD_WEBHOOK_URL` / `EVENTBRITE_TOKEN` (marketing).
