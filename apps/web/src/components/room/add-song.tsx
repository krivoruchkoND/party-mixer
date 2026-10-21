"use client"

import { api } from "@party-mixer/backend/convex/_generated/api"
import type { Id } from "@party-mixer/backend/convex/_generated/dataModel"
import { Button } from "@party-mixer/ui/components/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@party-mixer/ui/components/dialog"
import { useMutation } from "convex/react"
import { ConvexError } from "convex/values"
import { PlusIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { SearchSong } from "./search-song"

export function AddSong({
    disabled = false,
    roomId,
}: {
    disabled?: boolean
    roomId: Id<"rooms">
}) {
    const addSong = useMutation(api.rooms.addSong)
    const [open, setOpen] = useState(false)

    async function handleSelect(song: {
        videoId: string
        title: string
        artist: string
        duration: number
    }) {
        try {
            await addSong({
                roomId,
                videoId: song.videoId,
                title: song.title,
                artist: song.artist,
                duration: song.duration,
            })
        } catch (error) {
            const code = error instanceof ConvexError ? error.data : undefined
            toast.error("Couldn't add song", {
                description:
                    code === "DUPLICATE_SONG"
                        ? `${song.title} is already in the room.`
                        : code === "NICKNAME_REQUIRED"
                          ? "Set a nickname before adding a song."
                          : code === "SONG_LIMIT_REACHED"
                            ? "You have reached the maximum number of songs. Wait for one of your songs to play before adding another."
                            : "Something went wrong. Please try again.",
            })
            return
        }
        setOpen(false)
        toast.success("Song added", {
            description: `${song.title} by ${song.artist}`,
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button disabled={disabled}>
                    <PlusIcon /> Add Song
                </Button>
            </DialogTrigger>
            <DialogContent className="top-16 max-h-[calc(100dvh-8rem)] translate-y-0 overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Song</DialogTitle>
                </DialogHeader>
                <SearchSong onSelect={handleSelect} />
            </DialogContent>
        </Dialog>
    )
}
