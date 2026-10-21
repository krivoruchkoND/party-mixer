"use client"

import { isPartyAdminNickname } from "@/lib/party-admin"
import { useAutoAnimate } from "@formkit/auto-animate/react"
import { api } from "@party-mixer/backend/convex/_generated/api"
import type { Id } from "@party-mixer/backend/convex/_generated/dataModel"
import { Button } from "@party-mixer/ui/components/button"
import { ScrollArea } from "@party-mixer/ui/components/scroll-area"
import { useMutation, useQuery } from "convex/react"
import { ListStartIcon, Trash2Icon } from "lucide-react"
import { ImageWithFallback } from "../image-with-fallback"

export function Queue({ roomId }: { roomId: Id<"rooms"> }) {
    const room = useQuery(api.rooms.getRoom, {
        roomId,
    })

    const queue = useQuery(api.rooms.getQueue, {
        roomId,
    })

    const user = useQuery(api.auth.getCurrentUser)

    const canManageQueue =
        room?.host === user?._id || isPartyAdminNickname(user?.nickname)

    const playQueuedSongNext = useMutation(
        api.rooms.controls.playQueuedSongNext,
    )

    const deleteSong = useMutation(api.rooms.controls.deleteSong)

    const [animationParent] = useAutoAnimate()

    return (
        <ScrollArea className="h-full max-h-[40vh] grow overflow-y-auto rounded-lg border border-white/20 bg-white/10 p-3 shadow-md backdrop-blur-lg">
            <ul ref={animationParent} className="space-y-4">
                {queue === undefined ? (
                    <li className="text-center">Loading queue...</li>
                ) : queue.length > 0 ? (
                    queue.map((song, index) => (
                        <li key={song._id}>
                            <div className="group relative flex flex-col gap-2 rounded-lg border border-white/20 bg-white/10 p-3 shadow-md transition-all">
                                <div className="flex items-center gap-3">
                                    <ImageWithFallback
                                        src={`https://i.ytimg.com/vi_webp/${song.videoId}/mqdefault.webp`}
                                        width={128}
                                        height={128}
                                        alt={`${song.title}`}
                                        className="aspect-video h-12 shrink-0 rounded-lg border border-white/20 object-cover md:h-16"
                                        unoptimized
                                    />
                                    <div className="min-w-0 flex-1">
                                        <h4 className="line-clamp-2 text-base leading-snug font-semibold text-shadow-md">
                                            {song.title}
                                        </h4>
                                        <p className="line-clamp-1 text-sm text-gray-100 text-shadow-sm">
                                            {song.artist}
                                        </p>
                                    </div>
                                    {canManageQueue && index !== 0 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                playQueuedSongNext({
                                                    roomId,
                                                    songId: song._id,
                                                })
                                            }}
                                        >
                                            <ListStartIcon />
                                        </Button>
                                    )}
                                    {canManageQueue && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                deleteSong({
                                                    roomId,
                                                    songId: song._id,
                                                })
                                            }}
                                        >
                                            <Trash2Icon />
                                        </Button>
                                    )}
                                </div>
                                {song.addedByNickname && (
                                    <p className="text-xs text-white/70">
                                        Added by {song.addedByNickname}
                                    </p>
                                )}
                            </div>
                        </li>
                    ))
                ) : (
                    <li className="text-center">No songs in queue. Add some!</li>
                )}
            </ul>
        </ScrollArea>
    )
}
