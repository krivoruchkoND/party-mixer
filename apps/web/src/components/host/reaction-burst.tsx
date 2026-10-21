"use client"

import { useEffect, useRef, useState } from "react"

const EMOJI = {
    heart: "❤️",
    poop: "💩",
    sparkle: "✨",
} as const

type Kind = keyof typeof EMOJI

type Particle = {
    id: number
    emoji: string
    left: number
    drift: number
    duration: number
    spin: number
}

type Burst = {
    on: boolean
    min: number
    max: number
}

let nextParticleId = 0

function burstSize(min: number, max: number) {
    const lo = Math.max(1, Math.floor(Math.min(min, max)))
    const hi = Math.max(lo, Math.floor(Math.max(min, max)))
    return lo + Math.floor(Math.random() * (hi - lo + 1))
}

export function ReactionBurst({
    playId,
    reactions,
    burst,
}: {
    playId: string | null
    reactions: { userId: string; kind: Kind; taps: number }[] | undefined
    burst: Burst | undefined
}) {
    const [particles, setParticles] = useState<Particle[]>([])
    const seenPlay = useRef<string | null>(null)
    const seenTaps = useRef<Map<string, number>>(new Map())

    useEffect(() => {
        if (!reactions || !burst) return
        const next = new Map(
            reactions.map((vote) => [
                `${vote.userId}:${vote.kind}`,
                vote.taps,
            ]),
        )
        if (seenPlay.current !== playId || !burst.on) {
            seenPlay.current = playId
            seenTaps.current = next
            return
        }
        const spawned = reactions.flatMap((vote) => {
            const key = `${vote.userId}:${vote.kind}`
            const delta = vote.taps - (seenTaps.current.get(key) ?? 0)
            return Array.from({ length: Math.max(0, delta) }, () =>
                Array.from({ length: burstSize(burst.min, burst.max) }, () => ({
                    id: nextParticleId++,
                    emoji: EMOJI[vote.kind],
                    left: 6 + Math.random() * 88,
                    drift: (Math.random() - 0.5) * 220,
                    duration: 1.7 + Math.random() * 1.8,
                    spin: (8 + Math.random() * 26) * (Math.random() < 0.5 ? -1 : 1),
                })),
            ).flat()
        })
        seenTaps.current = next
        if (spawned.length === 0) return
        setParticles((current) => [...current, ...spawned])
        const ids = new Set(spawned.map((particle) => particle.id))
        window.setTimeout(() => {
            setParticles((current) =>
                current.filter((particle) => !ids.has(particle.id)),
            )
        }, 4000)
    }, [playId, reactions, burst])

    if (particles.length === 0) return null

    return (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
            <style>{`
                @keyframes party-mixer-rise {
                    0% { transform: translate3d(0, 0, 0) scale(0.7) rotate(0deg); opacity: 0; }
                    12% { opacity: 1; }
                    100% { transform: translate3d(var(--drift), -110vh, 0) scale(1.15) rotate(var(--spin)); opacity: 0; }
                }
            `}</style>
            {particles.map((particle) => (
                <span
                    key={particle.id}
                    className="absolute bottom-0 text-4xl"
                    style={{
                        left: `${particle.left}%`,
                        ["--drift" as string]: `${particle.drift}px`,
                        ["--spin" as string]: `${particle.spin}deg`,
                        animation: `party-mixer-rise ${particle.duration}s ease-out forwards`,
                    }}
                >
                    {particle.emoji}
                </span>
            ))}
        </div>
    )
}
