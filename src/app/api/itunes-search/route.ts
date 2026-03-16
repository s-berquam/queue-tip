import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const term = req.nextUrl.searchParams.get("term") ?? ""
  if (term.trim().length < 2) return NextResponse.json({ results: [] })

  const entity = req.nextUrl.searchParams.get("entity") ?? "song"

  const url = new URL("https://itunes.apple.com/search")
  url.searchParams.set("term", term)
  url.searchParams.set("entity", entity)
  url.searchParams.set("media", "music")
  url.searchParams.set("limit", "8")

  try {
    const res = await fetch(url.toString())
    const json = await res.json()
    const results = json.results ?? []

    if (entity === "musicArtist") {
      const deduped = [
        ...new Map(
          results.map((a: { artistName?: string }) => [a.artistName, a])
        ).values()
      ]
      return NextResponse.json({ results: deduped })
    }

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
