export type RequestStatus = "pending" | "up_next" | "played" | "archived"

export type Request = {
  id: string
  first_name: string
  song_title: string
  artist: string
  vibe: string | null
  notes: string | null
  notes_category?: string | null
  notes_flag?: boolean | null
  notes_summary?: string | null
  status: RequestStatus
  boost_amount?: number
  price_paid?: number
  datetime_requested: string
  selfie_url: string | null
  selfie_status: string | null
  selfie_duration: number
}
