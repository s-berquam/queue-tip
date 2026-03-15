import { NextRequest, NextResponse } from "next/server"
import { SquareClient, SquareEnvironment } from "square"
import { createClient } from "@supabase/supabase-js"

const square = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN!,
  environment: SquareEnvironment.Sandbox,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SELFIE_DURATIONS: Record<number, number> = { 1: 15, 3: 45, 5: 90 }

export async function POST(req: NextRequest) {
  const { tipType, tipAmount, requestId, sourceId, customerId: incomingCustomerId, cardId: incomingCardId } =
    await req.json()

  if (!tipType || !tipAmount || !requestId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const amountCents = Math.round(tipAmount * 100)
  let customerId: string | undefined = incomingCustomerId
  let cardId: string | undefined = incomingCardId
  let last4: string | undefined

  try {
    if (sourceId && !incomingCardId) {
      // New card — create customer if needed, then save card on file
      if (!customerId) {
        const { customer } = await square.customers.create({
          idempotencyKey: crypto.randomUUID(),
          referenceId: requestId,
          companyName: "Queue Tip",
        })
        customerId = customer?.id
      }

      const { card } = await square.cards.create({
        idempotencyKey: crypto.randomUUID(),
        sourceId,
        card: { customerId },
      })
      cardId = card?.id
      last4 = card?.last4 ?? undefined
    }

    // Charge — card on file uses cardId as sourceId
    const chargeSourceId = cardId ?? sourceId
    if (!chargeSourceId) {
      return NextResponse.json({ error: "No payment source" }, { status: 400 })
    }

    const { payment } = await square.payments.create({
      idempotencyKey: crypto.randomUUID(),
      sourceId: chargeSourceId,
      ...(customerId ? { customerId } : {}),
      amountMoney: {
        amount: BigInt(amountCents),
        currency: "USD",
      },
      locationId: process.env.SQUARE_LOCATION_ID!,
    })

    if (payment?.status !== "COMPLETED") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 500 })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Square charge error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }

  // Update Supabase
  try {
    const { data: row } = await supabase
      .from("requests")
      .select("price_paid, selfie_duration, votes, boost_amount")
      .eq("id", requestId)
      .single()

    const newPricePaid = (row?.price_paid ?? 0) + tipAmount

    if (tipType === "dj") {
      await supabase.from("requests").update({ price_paid: newPricePaid }).eq("id", requestId)
    } else if (tipType === "boost") {
      await supabase.from("requests").update({
        votes: (row?.votes ?? 0) + 1,
        boost_amount: (row?.boost_amount ?? 0) + tipAmount,
        price_paid: newPricePaid,
      }).eq("id", requestId)
    } else if (tipType === "selfie") {
      const bonus = SELFIE_DURATIONS[tipAmount] ?? 0
      await supabase.from("requests").update({
        selfie_duration: (row?.selfie_duration ?? 0) + bonus,
        price_paid: newPricePaid,
      }).eq("id", requestId)
    }
  } catch (err) {
    console.error("Supabase update error:", err)
    // Payment succeeded; DB update failure is non-fatal for the response
  }

  return NextResponse.json({ success: true, customerId, cardId, last4 })
}
