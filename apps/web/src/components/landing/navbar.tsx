import { Button } from "@party-mixer/ui/components/button"
import Link from "next/link"

export function LandingNavbar() {
    return (
        <nav className="dark sticky top-0 z-10 h-16 w-full border-b border-white/20 bg-white/10 px-4 text-white backdrop-blur-lg md:px-6">
            <div className="flex h-full items-center justify-between">
                <Link href="/" className="text-2xl font-bold">
                    Party Mixer
                </Link>
                <Link href="/host">
                    <Button variant="ghost">Rooms</Button>
                </Link>
            </div>
        </nav>
    )
}
