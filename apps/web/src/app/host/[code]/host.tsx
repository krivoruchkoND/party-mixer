"use client"

import { HostBackground } from "@/components/host/background"
import { ReactionBurst } from "@/components/host/reaction-burst"
import { RoomQRCode } from "@/components/host/qr-code"
import { Queue } from "@/components/host/queue"
import { isPartyAdminNickname } from "@/lib/party-admin"
import { api } from "@party-mixer/backend/convex/_generated/api"
import { Fullscreen } from "@party-mixer/ui/components/fullscreen"
import { Progress } from "@party-mixer/ui/components/progress"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { useEffect, useRef, useState } from "react"
import YouTube, { YouTubeProps } from "react-youtube"
import { toast } from "sonner"

export default function Host({ code }: { code: string }) {
    /*
     * QUERIES
     */

    const room = useQuery(api.rooms.getRoomByCode, { code })
    const party = useQuery(
        api.rooms.controls.getParty,
        room?._id ? { roomId: room._id } : "skip",
    )
    const { isAuthenticated, isLoading } = useConvexAuth()
    const isHost = useQuery(
        api.rooms.isHost,
        room && isAuthenticated ? { roomId: room._id } : "skip",
    )
    const nickname = useQuery(
        api.nicknames.getNickname,
        isAuthenticated ? {} : "skip",
    )
    const isPartyAdmin = isPartyAdminNickname(nickname)

    const currentSong = room?.currentSong

    /*
     * MUTATIONS
     */

    const popSong = useMutation(api.rooms.popSong).withOptimisticUpdate(
        (localStore, args) => {
            const queue = localStore.getQuery(api.rooms.getQueue, {
                roomId: args.roomId,
            })
            const nextSong = queue?.[0]
            if (nextSong && room) {
                // Set the next song as the current song
                localStore.setQuery(
                    api.rooms.getRoomByCode,
                    {
                        code: room.code,
                    },
                    {
                        ...room,
                        currentSong: nextSong,
                    },
                )

                // Remove the next song from the queue
                localStore.setQuery(
                    api.rooms.getQueue,
                    { roomId: args.roomId },
                    queue.slice(1),
                )
            }
        },
    )

    /*
     * OTHER STATE
     */

    const playerRef = useRef<YouTube>(null)

    const [progress, setProgress] = useState(0)

    // YouTube often emits the same error twice. A second event used to skip
    // the song immediately, and the next track did the same until the queue was gone.
    // 150/101 means this video refuses embedding. Later videos can still play.
    const retriedVideoId = useRef<string | null>(null)
    const skippingSong = useRef(false)
    const playedVideoId = useRef<string | null>(null)
    const consecutiveFailures = useRef(0)
    const embedSkips = useRef(0)
    const autoSkipped = useRef(false)
    const decideTimer = useRef<number | null>(null)

    useEffect(() => {
        retriedVideoId.current = null
        skippingSong.current = false
        if (!autoSkipped.current) embedSkips.current = 0
        autoSkipped.current = false
        return () => {
            if (decideTimer.current) {
                window.clearTimeout(decideTimer.current)
                decideTimer.current = null
            }
        }
    }, [currentSong?.videoId])

    /*
     * EFFECTS
     */

    // track the current song progress
    useEffect(() => {
        const intervalId = setInterval(async () => {
            if (!currentSong) setProgress(0)
            if (playerRef.current) {
                const duration = await playerRef.current
                    .getInternalPlayer()
                    ?.getDuration()
                const currentTime = await playerRef.current
                    .getInternalPlayer()
                    ?.getCurrentTime()
                if (duration && currentTime) {
                    setProgress(currentTime / duration)
                }
            }
        }, 1000)

        // Cleanup function to clear the interval when component unmounts
        return () => clearInterval(intervalId)
    }, [currentSong])

    /*
     * OPTIONS
     */

    const opts: YouTubeProps["opts"] = {
        width: "100%",
        height: "100%",
        playerVars: {
            autoplay: 1,
            disablekb: 1,
            fs: 0,
            rel: 0,
            modestbranding: 1,
            controls: 1,
        },
    }

    const onPlayerStateChange: YouTubeProps["onStateChange"] = (event) => {
        if (event.data === 1 && currentSong?.videoId) {
            playedVideoId.current = currentSong.videoId
            consecutiveFailures.current = 0
        }
        if (event.data === -1) {
            event.target.playVideo()
        }
    }

    const onPlayerEnd: YouTubeProps["onEnd"] = () => {
        if (!room) return
        popSong({ roomId: room._id })
    }

    const onPlayerError: YouTubeProps["onError"] = (event) => {
        if (!room || !currentSong?.videoId || skippingSong.current) return
        if (decideTimer.current) return

        const videoId = currentSong.videoId
        const label = `${currentSong.artist} - ${currentSong.title}`
        const roomId = room._id
        const code = event.data
        const isGuestSong = currentSong.type === "addedByUser"

        // A guest request stays on screen. Only fallback tracks are skipped.
        if (isGuestSong && (code === 101 || code === 150)) {
            toast.error("This guest song can't be embedded", {
                id: `guest-embed-${videoId}`,
                description: `${label} stays until you skip.`,
            })
            return
        }

        // These videos cannot be embedded. Keep moving until one actually starts.
        // shortcut: stop after 20 so a blocked playlist is not deleted in one pass.
        if (code === 101 || code === 150) {
            if (embedSkips.current >= 20) {
                toast.error("YouTube blocked these videos", {
                    id: "embed-blocked",
                    description:
                        "20 videos in a row cannot be embedded. Press Skip to keep looking.",
                })
                return
            }
            embedSkips.current += 1
            skippingSong.current = true
            autoSkipped.current = true
            if (embedSkips.current === 1) {
                toast.error("Skipping videos YouTube won't embed", {
                    id: "embed-skip",
                })
            }
            void popSong({ roomId }).catch(() => {
                skippingSong.current = false
                autoSkipped.current = false
                toast.error("Couldn't skip song", {
                    description: "Please try again.",
                })
            })
            return
        }

        // Wait briefly so a duplicate error, or a video that recovers, is not a skip.
        decideTimer.current = window.setTimeout(() => {
            decideTimer.current = null
            if (playedVideoId.current === videoId || skippingSong.current)
                return

            if (retriedVideoId.current !== videoId) {
                retriedVideoId.current = videoId
                playerRef.current?.getInternalPlayer()?.loadVideoById(videoId)
                return
            }

            // Two songs in a row never started. The player is blocked, not the tracks.
            if (consecutiveFailures.current >= 1) {
                toast.error("YouTube blocked playback", {
                    description: `Error ${code}. Songs stay in the queue.`,
                })
                return
            }

            consecutiveFailures.current += 1
            if (isGuestSong) {
                toast.error("This guest song can't be played here", {
                    id: `guest-embed-${videoId}`,
                    description: `${label} stays until you skip. (${code})`,
                })
                return
            }
            skippingSong.current = true
            toast.error("Skipped a song", {
                description: `${label} can't be played here. (${code})`,
            })
            void popSong({ roomId }).catch(() => {
                skippingSong.current = false
                toast.error("Couldn't skip song", {
                    description: "Please try again.",
                })
            })
        }, 1000)
    }

    if (
        room === undefined ||
        isLoading ||
        (room &&
            isAuthenticated &&
            (isHost === undefined || nickname === undefined))
    ) {
        return (
            <div className="grid min-h-screen place-items-center bg-slate-950 text-white">
                <p>Loading...</p>
            </div>
        )
    }

    if (room === null) {
        return (
            <div className="grid min-h-screen place-items-center bg-slate-950 text-white">
                <p>Room not found.</p>
            </div>
        )
    }

    if (!isHost && !isPartyAdmin) {
        return (
            <div className="grid min-h-screen place-items-center bg-slate-950 px-6 text-center text-white">
                <p>Only the screen that created the room can open this.</p>
            </div>
        )
    }

    const roomId = room._id

    return (
        <div className="relative flex h-dvh w-full flex-col overflow-hidden px-4 pt-4 pb-2 text-white">
            <HostBackground videoId={currentSong?.videoId} />
            <main className="flex min-h-0 w-full flex-1 flex-col">
                <div className="flex min-h-0 w-full flex-1 items-center justify-center [container-type:size]">
                    <div className="relative aspect-video w-[min(100cqw,calc(100cqh*16/9))] overflow-hidden rounded-lg bg-black/50 shadow-2xl outline outline-white/20 backdrop-blur-lg">
                        {isHost && currentSong && (
                            <YouTube
                                ref={playerRef}
                                className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full"
                                videoId={currentSong.videoId ?? ""}
                                opts={opts}
                                onStateChange={onPlayerStateChange}
                                onEnd={onPlayerEnd}
                                onError={onPlayerError}
                            />
                        )}
                    </div>
                </div>
                <div className="flex w-full flex-col items-center gap-1 py-2">
                    <Progress
                        value={progress * 100}
                        max={100}
                        className="dark w-2/3"
                        indicatorClassName="duration-1000 ease-linear"
                    />
                    <h2 className="w-full truncate text-center text-2xl font-semibold text-shadow-md">
                        {currentSong
                            ? currentSong.artist + " - " + currentSong.title
                            : "Nothing playing"}
                    </h2>
                    {(currentSong?.addedByNickname ||
                        (party && party.skip.count > 0)) && (
                        <p className="max-w-full truncate text-center text-base text-white/75 text-shadow-sm">
                            {currentSong?.addedByNickname &&
                                `by ${currentSong.addedByNickname}`}
                            {currentSong?.addedByNickname &&
                                party &&
                                party.skip.count > 0 &&
                                " · "}
                            {party && party.skip.count > 0 && (
                                <span className="font-medium text-white/80">
                                    Skip {party.skip.count}/{party.skip.needed}
                                </span>
                            )}
                        </p>
                    )}
                    {!isHost && (
                        <p className="text-center text-base text-white/80">
                            Sound plays on the screen that created the room.
                        </p>
                    )}
                </div>
                <div className="flex items-end gap-4">
                    <div className="min-w-0 flex-1">
                        <Queue roomId={roomId} />
                    </div>
                    <RoomQRCode roomCode={room?.code ?? ""} />
                </div>
            </main>
            <ReactionBurst
                playId={party?.playId ?? null}
                reactions={party?.reactions}
                burst={party?.burst}
            />
            <Fullscreen />
        </div>
    )
}
