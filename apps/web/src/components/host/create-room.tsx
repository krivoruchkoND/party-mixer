"use client"

import { useAuthedMutation } from "@/lib/auth"
import { api } from "@party-mixer/backend/convex/_generated/api"
import { Button } from "@party-mixer/ui/components/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@party-mixer/ui/components/dialog"
import { Input } from "@party-mixer/ui/components/input"
import { Label } from "@party-mixer/ui/components/label"
import { SubmitButton } from "@party-mixer/ui/components/submit-button"
import { PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { APIPlaylist, PlaylistPicker } from "./playlist-picker"

export function CreateRoomForm({ children }: { children?: React.ReactNode }) {
    const [playlist, setPlaylist] = useState<APIPlaylist | null>(null)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const createRoom = useAuthedMutation(api.rooms.manage.createRoom)

    async function handleCreateRoom(formData: FormData) {
        const data = await createRoom({
            maxSongsPerUser: Number(formData.get("maxSongsPerUser")),
            fallbackPlaylist: playlist
                ? {
                      playlistId: playlist.id,
                      title: playlist.title,
                      author: playlist.author?.name,
                      songs: playlist.tracks.map((track) => ({
                          videoId: track.videoId,
                          title: track.title,
                          artist: track.artists?.[0]?.name ?? "",
                          duration: track.duration_seconds,
                      })),
                  }
                : undefined,
        })
        toast.success("Room created")
        router.push(`/host/${data.code}`)
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children || (
                    <Button>
                        <PlusIcon className="size-4" /> New room
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New room</DialogTitle>
                </DialogHeader>
                <form
                    action={handleCreateRoom}
                    className="flex w-full flex-col gap-4"
                >
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="maxSongsPerUser">
                            Songs per guest
                        </Label>
                        <Input
                            id="maxSongsPerUser"
                            name="maxSongsPerUser"
                            defaultValue="2"
                            min="1"
                            required
                            type="number"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="fallbackPlaylist">
                            Fallback playlist
                        </Label>
                        <PlaylistPicker
                            id="fallbackPlaylist"
                            value={playlist}
                            onLoadingChange={setLoading}
                            onChange={setPlaylist}
                        />
                    </div>
                    <SubmitButton size="lg" disabled={loading}>
                        Create
                    </SubmitButton>
                </form>
            </DialogContent>
        </Dialog>
    )
}
