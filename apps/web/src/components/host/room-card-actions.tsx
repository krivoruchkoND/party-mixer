"use client"

import { useAuthedMutation } from "@/lib/auth"
import { api } from "@party-mixer/backend/convex/_generated/api"
import { Id } from "@party-mixer/backend/convex/_generated/dataModel"
import { Button } from "@party-mixer/ui/components/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@party-mixer/ui/components/dialog"
import { Input } from "@party-mixer/ui/components/input"
import { Label } from "@party-mixer/ui/components/label"
import { SubmitButton } from "@party-mixer/ui/components/submit-button"
import { useState } from "react"
import { toast } from "sonner"
import { APIPlaylist, PlaylistPicker } from "./playlist-picker"

export function RoomCardActions({
    roomId,
    code,
    maxSongsPerUser,
    skipVotesNeeded,
    reactionsOn,
    reactionMin,
    reactionMax,
    fallbackPlaylists,
}: {
    roomId: Id<"rooms">
    code: string
    maxSongsPerUser: number
    skipVotesNeeded: number
    reactionsOn: boolean
    reactionMin: number
    reactionMax: number
    fallbackPlaylists: {
        playlistId: string
        title: string
        author?: string
        trackCount: number
    }[]
}) {
    const deleteRoom = useAuthedMutation(api.rooms.manage.deleteRoom)
    const updateRoomSettings = useAuthedMutation(
        api.rooms.manage.updateRoomSettings,
    )
    const addFallbackPlaylist = useAuthedMutation(
        api.rooms.manage.addFallbackPlaylist,
    )
    const removeFallbackPlaylist = useAuthedMutation(
        api.rooms.manage.removeFallbackPlaylist,
    )
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [playlist, setPlaylist] = useState<APIPlaylist | null>(null)
    const [loadingPlaylist, setLoadingPlaylist] = useState(false)

    async function handleDelete() {
        setDeleting(true)
        try {
            await deleteRoom({ roomId })
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Couldn't delete room",
            )
            setDeleting(false)
            return
        }
        toast.success("Room deleted")
        setConfirmOpen(false)
    }

    async function handleRemovePlaylist(playlistId: string) {
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

    async function handleSave(formData: FormData) {
        try {
            await updateRoomSettings({
                roomId,
                maxSongsPerUser: Number(formData.get("maxSongsPerUser")),
                skipVotesNeeded: Number(formData.get("skipVotesNeeded")),
                reactionsOn: formData.get("reactionsOn") === "on",
                reactionMin: Number(formData.get("reactionMin")),
                reactionMax: Number(formData.get("reactionMax")),
            })
            if (playlist) {
                const result = await addFallbackPlaylist({
                    roomId,
                    playlist: {
                        playlistId: playlist.id,
                        title: playlist.title,
                        author: playlist.author?.name,
                        songs: playlist.tracks.map((track) => ({
                            videoId: track.videoId,
                            title: track.title,
                            artist: track.artists?.[0]?.name ?? "",
                            duration: track.duration_seconds,
                        })),
                    },
                })
                toast.success(`Added ${result.added} fallback songs`)
            } else {
                toast.success("Room updated")
            }
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Couldn't update room",
            )
            return
        }
        setPlaylist(null)
        setSettingsOpen(false)
    }

    return (
        <>
            <Button variant="outline" onClick={() => setSettingsOpen(true)}>
                Edit
            </Button>
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                Delete
            </Button>
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete room {code}?</DialogTitle>
                        <DialogDescription>
                            The queue is removed. Guests and the TV player lose
                            this room.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline" disabled={deleting}>
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            disabled={deleting}
                            onClick={handleDelete}
                        >
                            Delete room
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog
                open={settingsOpen}
                onOpenChange={(open) => {
                    setSettingsOpen(open)
                    if (!open) setPlaylist(null)
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Room {code}</DialogTitle>
                        <DialogDescription>
                            A playlist you pick is added. Guest songs stay ahead
                            of fallback tracks.
                        </DialogDescription>
                    </DialogHeader>
                    <form action={handleSave} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor={`max-${code}`}>Songs per guest</Label>
                            <Input
                                id={`max-${code}`}
                                name="maxSongsPerUser"
                                type="number"
                                min={1}
                                required
                                defaultValue={maxSongsPerUser}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor={`skip-${code}`}>Votes to skip</Label>
                            <Input
                                id={`skip-${code}`}
                                name="skipVotesNeeded"
                                type="number"
                                min={1}
                                max={20}
                                required
                                defaultValue={skipVotesNeeded}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor={`reactions-${code}`}>Reactions</Label>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    id={`reactions-${code}`}
                                    type="checkbox"
                                    name="reactionsOn"
                                    value="on"
                                    defaultChecked={reactionsOn}
                                    className="size-4"
                                />
                                On the screen
                            </label>
                            <p className="text-sm text-muted-foreground">
                                Emojis per tap
                            </p>
                            <div className="flex gap-3">
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor={`reaction-min-${code}`}>
                                        Min
                                    </Label>
                                    <Input
                                        id={`reaction-min-${code}`}
                                        name="reactionMin"
                                        type="number"
                                        min={1}
                                        max={30}
                                        required
                                        defaultValue={reactionMin}
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor={`reaction-max-${code}`}>
                                        Max
                                    </Label>
                                    <Input
                                        id={`reaction-max-${code}`}
                                        name="reactionMax"
                                        type="number"
                                        min={1}
                                        max={30}
                                        required
                                        defaultValue={reactionMax}
                                    />
                                </div>
                            </div>
                        </div>
                        {fallbackPlaylists.length > 0 && (
                            <ul className="flex flex-col gap-2">
                                {fallbackPlaylists.map((item) => (
                                    <li
                                        key={item.playlistId}
                                        className="flex items-center justify-between gap-2"
                                    >
                                        <p className="text-sm">
                                            {item.title}
                                            {item.author
                                                ? ` · ${item.author}`
                                                : ""}{" "}
                                            · {item.trackCount} songs
                                        </p>
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            onClick={() =>
                                                handleRemovePlaylist(
                                                    item.playlistId,
                                                )
                                            }
                                        >
                                            Remove
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor={`playlist-${code}`}>
                                Add fallback playlist
                            </Label>
                            <PlaylistPicker
                                id={`playlist-${code}`}
                                value={playlist}
                                onChange={setPlaylist}
                                onLoadingChange={setLoadingPlaylist}
                            />
                        </div>
                        <SubmitButton size="lg" disabled={loadingPlaylist}>
                            Save
                        </SubmitButton>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}
