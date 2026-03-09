import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const vibe = searchParams.get("vibe")
  if (!vibe) return NextResponse.json({ error: "Missing vibe" }, { status: 400 })

  const { data, error } = await supabase.rpc("get_song_suggestions", {
    p_vibe: vibe,
    p_event_id: null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ suggestions: data ?? [] })
}
