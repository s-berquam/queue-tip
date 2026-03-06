import Stripe from "stripe"
import { NextRequest, NextResponse } from "next/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: 
"2022-11-15" })

export async function POST(req: NextRequest) {
  const { tipAmount, song, artist, email, phone, notes } = await 
req.json()

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Tip for ${song} by ${artist}` },
            unit_amount: Math.round(tipAmount * 100), // cents
          },
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url: 
`${process.env.NEXT_PUBLIC_BASE_URL}/?success=true&tip=${tipAmount}&song=${encodeURIComponent(song)}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?canceled=true`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Stripe checkout session failed" }, 
{ status: 500 })
  }
}
