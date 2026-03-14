import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  other: {
    google: "notranslate",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" translate="no">
      <body style={{ margin: 0, overflowX: "hidden", overscrollBehavior: "none" }}>{children}</body>
    </html>
  )
}
