"use client"

import { LandingBackground } from "@/app/background"
import { CreateRoomForm } from "@/components/host/create-room"
import { RoomCardActions } from "@/components/host/room-card-actions"
import { RoomExpiry } from "@/components/host/room-expiry"
import { api } from "@party-mixer/backend/convex/_generated/api"
import { Button } from "@party-mixer/ui/components/button"
import { useConvexAuth, useQuery } from "convex/react"
import { PlusIcon } from "lucide-react"
import Link from "next/link"

export default function ManageRooms() {
    const { isAuthenticated, isLoading } = useConvexAuth()
    const rooms = useQuery(
        api.rooms.manage.listOwnRooms,
        isAuthenticated ? {} : "skip",
    )
    const roomList = rooms ?? []

    if (isLoading || (isAuthenticated && rooms === undefined)) {
        return (
            <div className="grid min-h-screen place-items-center bg-slate-950 text-white">
                <p>Loading...</p>
            </div>
        )
    }

    return (
        <div className="relative min-h-screen text-white">
            <LandingBackground muted />
            <header className="sticky top-0 z-10 border-b border-white/20 bg-black/40 backdrop-blur-lg">
                <div className="mx-auto flex h-16 max-w-3xl items-center px-4">
                    <Link href="/" className="text-xl font-semibold">
                        Rooms
                    </Link>
                </div>
            </header>
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
                <div>
                    <CreateRoomForm>
                        <Button>
                            <PlusIcon className="size-4" /> New room
                        </Button>
                    </CreateRoomForm>
                </div>
                {roomList.length === 0 ? (
                    <p className="text-white/70">No rooms yet.</p>
                ) : (
                    roomList.map((room) => (
                        <article
                            key={room.code}
                            className="flex flex-col gap-3 rounded-lg border border-white/20 bg-white/10 p-4 shadow-md backdrop-blur-lg"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <Link
                                        href={`/room/${room.code}`}
                                        className="text-4xl font-bold tracking-tight"
                                    >
                                        {room.code}
                                    </Link>
                                    <p className="text-sm text-white/70">
                                        Created by{" "}
                                        {room.hostNickname ?? "unknown"}
                                    </p>
                                    <p className="text-sm text-white/70">
                                        <RoomExpiry
                                            createdAt={room._creationTime}
                                            expiresAt={room.expiresAt}
                                        />
                                    </p>
                                </div>
                                <Link href={`/host/${room.code}`}>
                                    <Button>Screen</Button>
                                </Link>
                            </div>
                            <div>
                                <p className="text-sm text-white/70">
                                    Now playing
                                </p>
                                {room.currentSong ? (
                                    <p className="line-clamp-2 font-medium">
                                        {room.currentSong.artist} -{" "}
                                        {room.currentSong.title}
                                    </p>
                                ) : (
                                    <p>Nothing playing.</p>
                                )}
                            </div>
                            <p className="text-sm text-white/75">
                                {room.settings.maxSongsPerUser} songs per guest
                                {" · "}
                                Skip {room.settings.skipVotesNeeded ?? 3}
                                {" · "}
                                Reactions{" "}
                                {room.settings.reactionsOn === false
                                    ? "off"
                                    : "on"}
                            </p>
                            {(room.settings.fallbackPlaylists ?? []).length >
                                0 && (
                                <ul className="text-sm text-white/75">
                                    {room.settings.fallbackPlaylists?.map(
                                        (playlist) => (
                                            <li key={playlist.playlistId}>
                                                {playlist.title}
                                                {playlist.author
                                                    ? ` · ${playlist.author}`
                                                    : ""}{" "}
                                                · {playlist.trackCount} songs
                                            </li>
                                        ),
                                    )}
                                </ul>
                            )}
                            <div className="flex flex-wrap gap-2">
                                <RoomCardActions
                                    roomId={room._id}
                                    code={room.code}
                                    maxSongsPerUser={
                                        room.settings.maxSongsPerUser
                                    }
                                    skipVotesNeeded={
                                        room.settings.skipVotesNeeded ?? 3
                                    }
                                    reactionsOn={
                                        room.settings.reactionsOn !== false
                                    }
                                    reactionMin={
                                        room.settings.reactionMin ?? 3
                                    }
                                    reactionMax={
                                        room.settings.reactionMax ?? 5
                                    }
                                    fallbackPlaylists={
                                        room.settings.fallbackPlaylists ?? []
                                    }
                                />
                            </div>
                        </article>
                    ))
                )}
            </main>
        </div>
    )
}
