"use client"

import { ImageWithFallback } from "@/components/image-with-fallback"
import { api } from "@party-mixer/backend/convex/_generated/api"
import type { Id } from "@party-mixer/backend/convex/_generated/dataModel"
import { useQuery } from "convex/react"

export function Queue({ roomId }: { roomId: Id<"rooms"> }) {
    const queue = useQuery(api.rooms.getQueue, {
        roomId,
        numItems: 1,
    })
    const song = queue?.[0]

    if (queue === undefined) {
        return <p className="flex h-28 items-center text-sm text-white/70">Loading...</p>
    }
    if (!song) {
        return (
            <p className="flex h-28 items-center text-white/70">Nothing queued.</p>
        )
    }

    return (
        <div className="flex h-28 min-w-0 items-center gap-3">
            <ImageWithFallback
                src={`https://i.ytimg.com/vi_webp/${song.videoId}/mqdefault.webp`}
                width={160}
                height={90}
                alt={song.title}
                className="aspect-video h-full shrink-0 rounded-md border border-white/20 object-cover"
                unoptimized
            />
            <div className="min-w-0">
                <p className="text-sm text-white/60">Up next</p>
                <p className="truncate text-xl font-semibold">{song.title}</p>
                <p className="truncate text-base text-white/75">
                    {song.artist}
                    {song.addedByNickname ? ` · ${song.addedByNickname}` : ""}
                </p>
            </div>
        </div>
    )
}
