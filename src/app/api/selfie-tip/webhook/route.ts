import { NextRequest, NextResponse } from "next/server"
import { SquareClient, SquareEnvironment, WebhooksHelper } from "square"
import { createClient } from "@supabase/supabase-js"

const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN!,
  environment: SquareEnvironment.Production,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get("x-square-hmacsha256-signature") ?? ""
  const notificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/selfie-tip/webhook`

  const isValid = await WebhooksHelper.verifySignature({
    requestBody: rawBody,
    signatureHeader: signature,
    signatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY!,
    notificationUrl,
  })

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const body = JSON.parse(rawBody)
  if (body.type !== "payment.completed") {
    return NextResponse.json({ ok: true }) // ignore other events
  }

  const payment = body.data?.object?.payment
  if (payment?.status !== "COMPLETED") return NextResponse.json({ ok: true })

  const orderId = payment.order_id
  if (!orderId) return NextResponse.json({ error: "No order ID" }, { status: 400 })

  // Fetch order to get metadata
  const result = await squareClient.orders.get(orderId)
  const metadata = result.order?.metadata
  const requestId = metadata?.request_id
  const durationBonus = parseInt(metadata?.duration_bonus ?? "0", 10)

  if (!requestId || !durationBonus) {
    return NextResponse.json({ error: "Missing metadata" }, { status: 400 })
  }

  // Increment selfie_duration
  const { data } = await supabase
    .from("requests")
    .select("selfie_duration")
    .eq("id", requestId)
    .single()

  const newDuration = (data?.selfie_duration ?? 15) + durationBonus

  const { error } = await supabase
    .from("requests")
    .update({ selfie_duration: newDuration })
    .eq("id", requestId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
