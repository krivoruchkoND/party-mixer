"use client"

import { APIPlaylist, PlaylistPicker } from "@/components/host/playlist-picker"
import { useAuthedMutation } from "@/lib/auth"
import { api } from "@party-mixer/backend/convex/_generated/api"
import { Id } from "@party-mixer/backend/convex/_generated/dataModel"
import { Button } from "@party-mixer/ui/components/button"
import { useRef, useState } from "react"
import { toast } from "sonner"

export function FallbackPlaylists({
    roomId,
    playlists,
}: {
    roomId: Id<"rooms">
    playlists: {
        playlistId: string
        title: string
        author?: string
        trackCount: number
    }[]
}) {
    const addFallbackPlaylist = useAuthedMutation(
        api.rooms.manage.addFallbackPlaylist,
    )
    const removeFallbackPlaylist = useAuthedMutation(
        api.rooms.manage.removeFallbackPlaylist,
    )
    const [playlist, setPlaylist] = useState<APIPlaylist | null>(null)
    const [loadingPlaylist, setLoadingPlaylist] = useState(false)
    const adding = useRef(false)

    async function handlePick(next: APIPlaylist | null) {
        setPlaylist(next)
        if (!next || adding.current) return
        adding.current = true
        try {
            const result = await addFallbackPlaylist({
                roomId,
                playlist: {
                    playlistId: next.id,
                    title: next.title,
                    author: next.author?.name,
                    songs: next.tracks.map((track) => ({
                        videoId: track.videoId,
                        title: track.title,
                        artist: track.artists?.[0]?.name ?? "",
                        duration: track.duration_seconds,
                    })),
                },
            })
            toast.success(`Added ${result.added} fallback songs`)
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Couldn't add playlist",
            )
        } finally {
            adding.current = false
            setPlaylist(null)
        }
    }

    async function handleRemove(playlistId: string) {
        try {
            await removeFallbackPlaylist({ roomId, playlistId })
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Couldn't remove playlist",
            )
            return
        }
        toast.success("Playlist removed")
    }

    return (
        <div className="flex flex-col gap-3">
            {playlists.length > 0 ? (
                <ul className="flex flex-col gap-2">
                    {playlists.map((item) => (
                        <li
                            key={item.playlistId}
                            className="flex items-center justify-between gap-2 text-left text-sm"
                        >
                            <span>
                                {item.title}
                                {item.author ? ` · ${item.author}` : ""} ·{" "}
                                {item.trackCount} songs
                            </span>
                            <Button
                                variant="destructive"
                                onClick={() => handleRemove(item.playlistId)}
                            >
                                Remove
                            </Button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-white/80">No fallback playlist.</p>
            )}
            <PlaylistPicker
                id={`room-playlist-${roomId}`}
                value={playlist}
                onChange={handlePick}
                onLoadingChange={setLoadingPlaylist}
            />
            {loadingPlaylist && (
                <p className="text-sm text-white/80">Loading playlist...</p>
            )}
        </div>
    )
}
