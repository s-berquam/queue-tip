import { NextRequest, NextResponse } from "next/server"
import { SquareClient, SquareEnvironment } from "square"

const TIP_TIERS: Record<string, { amountCents: number; durationBonus: number; label: string }> = {
  "1": { amountCents: 100, durationBonus: 15, label: "Selfie Boost (+15s on screen)" },
  "3": { amountCents: 300, durationBonus: 45, label: "Selfie Boost (+45s on screen)" },
  "5": { amountCents: 500, durationBonus: 90, label: "Selfie Boost (+90s on screen)" },
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

  const tier = TIP_TIERS[String(tipAmount)]
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
          duration_bonus: String(tier.durationBonus),
        },
      },
      checkoutOptions: {
        redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/queue?selfie_success=true`,
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
