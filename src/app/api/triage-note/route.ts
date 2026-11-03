import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { triageNote } from "@/lib/noteTriage"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_AGE_MS = 10 * 60 * 1000 // only triage notes from the last 10 minutes

function skip(reason: string, detail?: unknown) {
  console.log("triage-note: skipped:", reason, detail ?? "")
  return NextResponse.json({ skipped: reason })
}

/**
 * Classifies the guest note on a request with an LLM and stores the result.
 * The note text is read from the database, not from the client, so this
 * endpoint cannot be used to send arbitrary text to the model.
 * Triage is best-effort: any failure leaves the request untouched.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const requestId = typeof body?.requestId === "string" ? body.requestId : null
  if (!requestId) return NextResponse.json({ error: "Missing requestId" }, { status: 400 })

  const { data: row, error } = await supabase
    .from("requests")
    .select("id, notes, datetime_requested, notes_triaged_at")
    .eq("id", requestId)
    .single()

  if (error) {
    // Most common cause: scripts/note_triage.sql has not been run in Supabase yet.
    console.error("triage-note: could not load request:", error.message)
    return skip("load_failed", error.message)
  }
  if (!row) return skip("not_found")
  if (!row.notes || !row.notes.trim()) return skip("no_notes")
  if (row.notes_triaged_at) return skip("already_triaged", row.notes_triaged_at)
  // The age limit only applies when the row has a usable timestamp; each request
  // is triaged at most once either way (see notes_triaged_at above).
  const requestedAt = row.datetime_requested ? new Date(row.datetime_requested).getTime() : NaN
  if (!Number.isNaN(requestedAt)) {
    const ageMs = Date.now() - requestedAt
    if (ageMs > MAX_AGE_MS) {
      return skip("too_old", { datetime_requested: row.datetime_requested, ageMinutes: Math.round(ageMs / 60000) })
    }
  }
  console.log("triage-note: classifying request", requestId)

  try {
    const result = await triageNote(row.notes)
    const triagedAt = new Date().toISOString()
    const update = result
      ? {
          notes_category: result.category,
          notes_flag: result.needs_review,
          notes_summary: result.summary,
          notes_triaged_at: triagedAt,
        }
      : { notes_category: "other", notes_flag: false, notes_summary: null, notes_triaged_at: triagedAt }

    const { error: updateError } = await supabase.from("requests").update(update).eq("id", requestId)
    if (updateError) {
      console.error("triage-note: update failed", updateError.message)
      return NextResponse.json({ skipped: "update_failed" })
    }
    return NextResponse.json({ ok: true, triaged: !!result })
  } catch (e) {
    console.error("triage-note: model call failed", e instanceof Error ? e.message : e)
    return NextResponse.json({ skipped: "model_error" })
  }
}
