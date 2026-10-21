import { Providers } from "@/components/providers"
import { Toaster } from "@party-mixer/ui/components/sonner"
import { getURL } from "@party-mixer/ui/lib/utils"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
})

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
    metadataBase: new URL(getURL()),
    title: { default: "Party Mixer", template: "%s | Party Mixer" },
    description:
        "Party Mixer makes collaborative party music queueing easy. Open source, no login required.",
    keywords: ["party-mixer", "party", "music", "queue", "open source"],
}

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" className="dark" suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <Providers>{children}</Providers>
                <Toaster richColors theme="dark" />
            </body>
        </html>
    )
}
