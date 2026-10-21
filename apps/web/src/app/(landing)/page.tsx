import { JoinRoomForm } from "@/components/join-room"
import { LandingNickname } from "@/components/landing/nickname"
import { Button } from "@party-mixer/ui/components/button"
import { Metadata, Viewport } from "next"
import Link from "next/link"
import { LandingBackground } from "../background"

export const metadata: Metadata = {
    title: "Party Mixer",
}

export const viewport: Viewport = {
    themeColor: "#000000",
    colorScheme: "dark",
}

export default function Home() {
    return (
        <>
            <LandingBackground />
            <div className="flex min-h-screen flex-col items-center text-white">
                <main className="flex w-full flex-1 items-center">
                    <section className="w-full py-12">
                        <div className="container px-4 md:px-6">
                            <div className="mx-auto flex max-w-xl flex-col gap-4 rounded-lg border border-white/20 bg-white/10 p-4 shadow-md backdrop-blur-lg">
                                <h1 className="text-4xl font-bold tracking-tighter">
                                    Party Mixer
                                </h1>
                                <Link href="/host">
                                    <Button
                                        size="lg"
                                        className="border border-white/20 text-lg"
                                    >
                                        Create a room
                                    </Button>
                                </Link>
                                <JoinRoomForm />
                                <LandingNickname />
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </>
    )
}
