"use client"

import { Input } from "@party-mixer/ui/components/input"
import { SubmitButton } from "@party-mixer/ui/components/submit-button"
import { PlusCircleIcon } from "lucide-react"
import { useState } from "react"
import { ImageWithFallback } from "../image-with-fallback"

function youtubeVideoId(input: string) {
    try {
        const url = new URL(input.trim())
        const host = url.hostname.replace(/^www\./, "")
        let id = ""
        if (host === "youtu.be") {
            id = url.pathname.split("/").filter(Boolean)[0] ?? ""
        } else if (
            host === "youtube.com" ||
            host === "m.youtube.com" ||
            host === "music.youtube.com"
        ) {
            if (url.pathname === "/watch") {
                id = url.searchParams.get("v") ?? ""
            } else {
                const parts = url.pathname.split("/").filter(Boolean)
                if (
                    parts[0] === "embed" ||
                    parts[0] === "shorts" ||
                    parts[0] === "live"
                ) {
                    id = parts[1] ?? ""
                }
            }
        }
        return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
    } catch {
        return null
    }
}

export function SearchSong({
    onSelect,
}: {
    onSelect: (song: {
        videoId: string
        title: string
        artist: string
        duration: number
    }) => Promise<void>
}) {
    const [results, setResults] = useState<
        {
            videoId: string
            title: string
            artists: { name: string }[]
            duration_seconds: number
        }[]
    >([])
    const [error, setError] = useState<string | null>(null)

    async function handleLink(formData: FormData) {
        const videoId = youtubeVideoId(String(formData.get("url") ?? ""))
        if (!videoId) {
            setError("Paste a YouTube link.")
            return
        }
        try {
            setError(null)
            const response = await fetch(
                `/flask/song?videoId=${encodeURIComponent(videoId)}`,
            )
            const song = await response.json()
            if (!response.ok) {
                setError(song.error ?? "Couldn't find that video.")
                return
            }
            setResults([
                {
                    videoId: song.videoId,
                    title: song.title,
                    artists: [{ name: song.artist }],
                    duration_seconds: song.duration_seconds,
                },
            ])
        } catch (error) {
            setError("Couldn't find that video.")
            console.error(error)
        }
    }

    async function handleSearch(formData: FormData) {
        try {
            const query = formData.get("query") as string
            console.log("Query", query)
            setError(null)
            const results: [] = await fetch(
                `/flask/search?query=${encodeURIComponent(query)}`,
            ).then((res) => res.json())
            console.log("Results", results)
            setResults(results)
        } catch (error) {
            setError("Failed to search for songs. Please try again.")
            console.error(error)
        }
    }

    async function handleSelectSong(formData: FormData) {
        const song = {
            videoId: formData.get("videoId") as string,
            title: formData.get("title") as string,
            artist: formData.get("artist") as string,
            duration: Number(formData.get("duration")),
        }

        try {
            await onSelect(song)
        } catch (error) {
            setError("Failed to select song. Please try again.")
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <form action={handleSearch}>
                <div className="flex w-full gap-2">
                    <Input
                        name="query"
                        type="search"
                        placeholder="Search for a song"
                    />
                    <SubmitButton>Search</SubmitButton>
                </div>
            </form>
            <form action={handleLink}>
                <div className="flex w-full gap-2">
                    <Input
                        name="url"
                        type="url"
                        placeholder="Paste a YouTube link"
                    />
                    <SubmitButton>Add link</SubmitButton>
                </div>
            </form>
            {error && (
                <p className="text-center text-sm text-red-500">{error}</p>
            )}
            <ul className="flex flex-col gap-2">
                {results.map((song) => (
                    <li key={song.videoId}>
                        <form
                            action={handleSelectSong}
                            className="flex items-center justify-between rounded-lg border border-white/20 bg-white/10 p-2"
                        >
                            <div className="flex items-center space-x-2">
                                <ImageWithFallback
                                    src={`https://i.ytimg.com/vi_webp/${song.videoId}/mqdefault.webp`}
                                    alt={`${song.title}`}
                                    width={40}
                                    height={40}
                                    className="rounded-sm object-cover"
                                    unoptimized
                                />
                                <div className="text-left">
                                    <p className="text-sm font-semibold">
                                        {song.title}
                                    </p>
                                    <p className="text-xs text-white/70">
                                        {song.artists
                                            .map((artist) => artist.name)
                                            .join(", ")}
                                    </p>
                                </div>
                            </div>
                            <input
                                type="hidden"
                                name="videoId"
                                value={song.videoId}
                            />
                            <input
                                type="hidden"
                                name="title"
                                value={song.title}
                            />
                            <input
                                type="hidden"
                                name="artist"
                                value={song.artists
                                    .map((artist) => artist.name)
                                    .join(", ")}
                            />
                            <input
                                type="hidden"
                                name="duration"
                                value={song.duration_seconds}
                            />
                            <SubmitButton size="icon">
                                <PlusCircleIcon className="size-4" />
                            </SubmitButton>
                        </form>
                    </li>
                ))}
            </ul>
        </div>
    )
}
