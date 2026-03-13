<h1 align="center">
  <em>QueueTip</em> — Song Request App
</h1>

<p align="center">
  A real-time song request app for DJs and music lovers. Guests request songs, set the vibe and capture the moment — the DJ stays in control.
</p>

---

## Features

- **Song Requests** — Guests submit song requests with name, contact info, and optional notes
- **Song Suggestions** — Select an artist and a vibe to let the DJ choose a song
- **Selfie/Social Media Integration** — Upload pictures for real time video display and social media posts to the Queen of Clubs socials 
- **DJ Dashboard** — Real-time admin view at `/dashboard` with vibe filtering, manual queue control (Pending → Up Next → Played → Archived)
- **Real-time Updates** — Powered by Supabase Realtime; new requests update instantly across all clients
- **Tip Integration** — Square-based tip/payment flow for priority requests; tip amount determines queue priority weight
- **Queue Boost** — Tips of $1/$3/$5/$10+ map to priority weights 1–4; higher tips float to the top of the queue

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + styled-jsx |
| Database | Supabase (PostgreSQL) |
| Realtime | Supabase Realtime |
| Payments | Square |
| SMS | Twilio |
| Hosting | Vercel |

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/request-page` | Song request form and vibe suggestions |
| `/queue` | Song queue — browse requests, boost your song |
| `/dashboard` | DJ admin console — live requests, status controls, vibe filter |

---

## Database Schema

**`requests` table** (Supabase)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `first_name` | text | Requester's name |
| `song_title` | text | |
| `artist` | text | |
| `vibe` | text | Hype, Sing-Along, Feel-Good, Slow Jam, Throwback |
| `votes` | integer | Default 0 |
| `status` | text | pending, up_next, played, archived |
| `email` | text | Optional |
| `phone` | text | Optional |
| `notes` | text | Optional |
| `price_paid` | numeric | Tip amount |
| `requested_at` | timestamp | |

**Supabase Functions**
- `increment_votes(request_id uuid)` — atomic vote increment
- `get_song_suggestions(p_vibe text, p_event_id uuid)` — top 5 most-requested songs for a vibe

---

## Scripts

| Script | Description |
|--------|-------------|
| `scripts/sendpromo.ts` | Send a test SMS via Twilio (requires `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`) |
| `square-webhook-dev.js` | Local Express server for testing Square payment webhooks on port 3000; maps tip amounts to priority weights ($1→1, $3→2, $5→3, $10+→4) |

---

## Local Development

**1. Clone the repo**
```bash
git clone https://github.com/s-berquam/queue-tip.git
cd queue-tip
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up environment variables**
```bash
cp env.example .env.local
```

Fill in your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

**4. Run the dev server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment

Deployed on [Vercel](https://vercel.com). Every push to `main` triggers an automatic deployment.

To deploy your own instance:
1. Import the repo into Vercel
2. Add the environment variables listed above
3. Deploy

---

## Contact

- Email: sarah.berquam@gmail.com
- Instagram: [@all_love_jams](https://instagram.com/all_love_jams)
- LinkedIn: [sarahberquam](https://www.linkedin.com/in/sarahberquam/)
