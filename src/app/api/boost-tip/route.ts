import { NextRequest, NextResponse } from "next/server"
import { SquareClient, SquareEnvironment } from "square"

const BOOST_TIERS: Record<string, { amountCents: number; label: string }> = {
  "2": { amountCents: 200, label: "Song Boost — Small" },
  "5": { amountCents: 500, label: "Song Boost — Medium" },
  "10": { amountCents: 1000, label: "Song Boost — Jump to the Top" },
}

const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN!,
  environment: SquareEnvironment.Production,
})

export async function POST(req: NextRequest) {
  const { requestId, tipAmount } = await req.json()

  if (!requestId || !tipAmount) {
    return NextResponse.json({ error: "Missing requestId or tipAmount" }, { status: 400 })
  }

  const tier = BOOST_TIERS[String(tipAmount)]
  if (!tier) {
    return NextResponse.json({ error: "Invalid tip amount" }, { status: 400 })
  }

  let result
  try {
    const response = await client.checkout.paymentLinks.create({
      idempotencyKey: crypto.randomUUID(),
      order: {
        locationId: process.env.SQUARE_LOCATION_ID!,
        lineItems: [
          {
            name: tier.label,
            quantity: "1",
            basePriceMoney: {
              amount: BigInt(tier.amountCents),
              currency: "USD",
            },
          },
        ],
        metadata: {
          request_id: requestId,
          boost_amount: String(tipAmount),
        },
      },
      checkoutOptions: {
        redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/queue?boost_success=true`,
      },
    })
    result = response
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Square error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const url = result.paymentLink?.url
  if (!url) return NextResponse.json({ error: "Failed to create payment link" }, { status: 500 })

  return NextResponse.json({ url })
}
