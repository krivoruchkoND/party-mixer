"use client"

import { LandingBackground } from "@/app/background"
import { NicknameForm } from "@/components/auth/nickname-form"
import { ImageWithFallback } from "@/components/image-with-fallback"
import { AddSong } from "@/components/room/add-song"
import { FallbackPlaylists } from "@/components/room/fallback-playlists"
import { Queue } from "@/components/room/queue"
import { isPartyAdminNickname } from "@/lib/party-admin"
import { useAutoAnimate } from "@formkit/auto-animate/react"
import { api } from "@party-mixer/backend/convex/_generated/api"
import { Button } from "@party-mixer/ui/components/button"
import { Input } from "@party-mixer/ui/components/input"
import { cn } from "@party-mixer/ui/lib/utils"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { ArrowLeft, PlayIcon, ShuffleIcon, SkipForwardIcon } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function Room({ code }: { code: string }) {
    /*
     * QUERIES
     */

    const room = useQuery(api.rooms.getRoomByCode, { code })
    const roomId = room?._id
    const { isLoading } = useConvexAuth()

    const user = useQuery(api.auth.getCurrentUser)

    const currentSong = room?.currentSong

    const songsLeftToAdd = useQuery(
        api.rooms.getSongsLeftToAdd,
        roomId ? { roomId } : "skip",
    )

    const skipToNextSong = useMutation(api.rooms.controls.skipToNextSong)
    const shuffleFallback = useMutation(api.rooms.controls.shuffleFallback)
    const voteSkip = useMutation(api.rooms.controls.voteSkip)
    const reactToSong = useMutation(api.rooms.controls.reactToSong)
    const updateRoomSettings = useMutation(api.rooms.manage.updateRoomSettings)
    const party = useQuery(
        api.rooms.controls.getParty,
        roomId ? { roomId } : "skip",
    )

    const nickname = useQuery(api.nicknames.getNickname)

    const isHost =
        room?.host === user?._id || isPartyAdminNickname(user?.nickname)

    /*
     * OTHER STATE
     */

    const [animationParent] = useAutoAnimate()

    if (room === undefined || nickname === undefined || isLoading) {
        return (
            <div className="grid min-h-screen place-items-center bg-slate-900 text-white">
                <p>Loading...</p>
            </div>
        )
    }

    if (room === null || !roomId) {
        return (
            <div className="grid min-h-screen place-items-center bg-slate-900 text-white">
                <p>Room not found.</p>
            </div>
        )
    }

    if (!nickname) {
        return (
            <div className="grid min-h-screen place-items-center bg-slate-900 px-4 text-white">
                <div className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-white/20 bg-white/10 p-4">
                    <p>Pick a nickname to join this room.</p>
                    <NicknameForm />
                </div>
            </div>
        )
    }

    return (
        <div className="relative min-h-screen text-white">
            <LandingBackground muted />
            <div className="mx-auto h-full max-w-5xl p-4">
                <header className="mb-6 flex w-full items-center justify-between">
                    <Link href="/">
                        <div className="flex items-center gap-2">
                            <ArrowLeft className="size-6" />
                            <h1 className="text-xl font-bold">Party Mixer</h1>
                        </div>
                    </Link>
                    <h2 className="text-xl">
                        <span className="font-bold">{room?.code}</span>
                    </h2>
                </header>
                <main className="flex flex-col gap-4" ref={animationParent}>
                    <section className="flex flex-col gap-2">
                        <h2 className="text-xl font-bold">Add songs</h2>
                        <div className="rounded-lg border border-white/20 bg-white/10 p-3 shadow-md">
                            <div className="flex flex-col gap-2">
                                <p>
                                    Logged in as <b>{nickname}</b>
                                </p>
                                {isHost ? (
                                    <p>You can add unlimited songs.</p>
                                ) : songsLeftToAdd ? (
                                    <p>
                                        You can add up to{" "}
                                        <span className="font-bold">
                                            {songsLeftToAdd}
                                        </span>{" "}
                                        more songs.
                                    </p>
                                ) : (
                                    <p>
                                        Wait for one of your songs to finish.
                                    </p>
                                )}
                                <AddSong
                                    roomId={roomId}
                                    disabled={
                                        !isHost && (songsLeftToAdd ?? 0) <= 0
                                    }
                                />
                            </div>
                        </div>
                    </section>
                    <section className="flex flex-col gap-2">
                        <h2 className="text-xl font-bold">Now playing</h2>
                        {currentSong ? (
                            <div className="flex flex-col gap-3 rounded-lg border border-white/20 bg-white/10 p-3 shadow-md">
                                <div className="flex items-center space-x-4">
                                    <ImageWithFallback
                                        src={`https://i.ytimg.com/vi_webp/${currentSong.videoId}/mqdefault.webp`}
                                        width={128}
                                        height={128}
                                        alt={`${currentSong.title}`}
                                        className="aspect-video h-20 shrink-0 rounded-lg border border-white/20 object-cover"
                                        unoptimized
                                    />
                                    <div className="min-w-0">
                                        <h4 className="line-clamp-2 text-lg font-semibold text-shadow-md">
                                            {currentSong.title}
                                        </h4>
                                        <p className="line-clamp-1 text-sm text-gray-100 text-shadow-sm">
                                            {currentSong.artist}
                                        </p>
                                        {currentSong.addedByNickname && (
                                            <p className="text-sm text-white/70">
                                                Added by{" "}
                                                {currentSong.addedByNickname}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {party?.reaction.canReact &&
                                        (party.reaction.mine ||
                                            currentSong.type ===
                                                "addedByUser" ||
                                            party.burst.on) && (
                                            <div className="flex items-center gap-2">
                                                {(
                                                    [
                                                        ["heart", "❤️"],
                                                        ["poop", "💩"],
                                                        ["sparkle", "✨"],
                                                    ] as const
                                                ).map(([kind, emoji]) => (
                                                    <Button
                                                        key={kind}
                                                        variant="ghost"
                                                        disabled={
                                                            !(
                                                                (currentSong.type ===
                                                                    "addedByUser" &&
                                                                    !party
                                                                        .reaction
                                                                        .mine) ||
                                                                party.burst.on
                                                            )
                                                        }
                                                        className={cn(
                                                            "h-14 w-14 text-3xl",
                                                            party.reaction
                                                                .mine ===
                                                                kind &&
                                                                "bg-white/20",
                                                        )}
                                                        onClick={() => {
                                                            reactToSong({
                                                                roomId,
                                                                kind,
                                                            }).catch(
                                                                (error) => {
                                                                    toast.error(
                                                                        error instanceof
                                                                            Error
                                                                            ? error.message
                                                                            : "Couldn't react",
                                                                    )
                                                                },
                                                            )
                                                        }}
                                                    >
                                                        {emoji}
                                                    </Button>
                                                ))}
                                            </div>
                                        )}
                                    <Button
                                        variant="ghost"
                                        disabled={party?.skip.voted}
                                        onClick={() => {
                                            voteSkip({ roomId }).catch(
                                                (error) => {
                                                    toast.error(
                                                        error instanceof Error
                                                            ? error.message
                                                            : "Couldn't vote to skip",
                                                    )
                                                },
                                            )
                                        }}
                                    >
                                        <SkipForwardIcon /> Vote{" "}
                                        {party?.skip.count ?? 0}/
                                        {party?.skip.needed ?? 3}
                                    </Button>
                                    {isHost && (
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                skipToNextSong({ roomId })
                                            }}
                                        >
                                            <SkipForwardIcon /> Skip now
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3 rounded-lg border border-white/20 bg-white/10 p-3 shadow-md">
                                <p>Nothing playing.</p>
                                {isHost && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            skipToNextSong({ roomId })
                                        }}
                                    >
                                        <PlayIcon /> Play
                                    </Button>
                                )}
                            </div>
                        )}
                    </section>
                    <section className="flex flex-col gap-2">
                        <h2 className="text-xl font-bold">Up next</h2>
                        <Queue roomId={roomId} />
                    </section>
                    <section className="flex flex-col gap-2">
                        <h2 className="text-xl font-bold">People</h2>
                        {party && party.people.length > 0 ? (
                            <ul className="flex flex-col gap-2">
                                {party.people.map((person) => (
                                    <li
                                        key={person.userId}
                                        className="flex items-center justify-between rounded-lg border border-white/20 bg-white/10 px-3 py-2"
                                    >
                                        <span className="min-w-0">
                                            <span className="block truncate">
                                                {person.nickname}
                                            </span>
                                            <span className="block text-sm text-white/70">
                                                {person.ordered} added ·{" "}
                                                {person.played} played
                                            </span>
                                        </span>
                                        <span className="flex shrink-0 items-center gap-2 text-white/80">
                                            <span>❤️ {person.heart}</span>
                                            <span>💩 {person.poop}</span>
                                            <span>✨ {person.sparkle}</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-white/70">
                                No one has added a song yet.
                            </p>
                        )}
                    </section>
                    {isHost && (
                        <section className="flex flex-col gap-2">
                            <h2 className="text-xl font-bold">Room settings</h2>
                            <div className="flex flex-col gap-4 rounded-lg border border-white/20 bg-white/10 p-4 shadow-md">
                                <form
                                    key={`${party?.skip.needed ?? 3}-${party?.burst.on ?? true}-${party?.burst.min ?? 3}-${party?.burst.max ?? 5}`}
                                    className="flex flex-col gap-4"
                                    action={async (formData) => {
                                        try {
                                            await updateRoomSettings({
                                                roomId,
                                                skipVotesNeeded: Number(
                                                    formData.get(
                                                        "skipVotesNeeded",
                                                    ),
                                                ),
                                                reactionsOn:
                                                    formData.get(
                                                        "reactionsOn",
                                                    ) === "on",
                                                reactionMin: Number(
                                                    formData.get("reactionMin"),
                                                ),
                                                reactionMax: Number(
                                                    formData.get("reactionMax"),
                                                ),
                                            })
                                        } catch (error) {
                                            toast.error(
                                                error instanceof Error
                                                    ? error.message
                                                    : "Couldn't update room settings",
                                            )
                                            return
                                        }
                                        toast.success("Room settings updated")
                                    }}
                                >
                                    <label className="flex max-w-xs flex-col gap-2">
                                        <span className="text-sm font-medium text-white/80">
                                            Votes to skip
                                        </span>
                                        <Input
                                            name="skipVotesNeeded"
                                            type="number"
                                            min={1}
                                            max={20}
                                            required
                                            defaultValue={
                                                party?.skip.needed ?? 3
                                            }
                                            className="w-24"
                                        />
                                    </label>
                                    <fieldset className="flex flex-col gap-3">
                                        <legend className="text-sm font-medium text-white/80">
                                            Reactions
                                        </legend>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                name="reactionsOn"
                                                value="on"
                                                defaultChecked={
                                                    party?.burst.on ?? true
                                                }
                                                className="size-4"
                                            />
                                            On the screen
                                        </label>
                                        <p className="text-sm text-white/70">
                                            Emojis per tap
                                        </p>
                                        <div className="flex flex-wrap gap-4">
                                            <label className="flex flex-col gap-2">
                                                <span className="text-sm text-white/80">
                                                    Min
                                                </span>
                                                <Input
                                                    name="reactionMin"
                                                    type="number"
                                                    min={1}
                                                    max={30}
                                                    required
                                                    defaultValue={
                                                        party?.burst.min ?? 3
                                                    }
                                                    className="w-24"
                                                />
                                            </label>
                                            <label className="flex flex-col gap-2">
                                                <span className="text-sm text-white/80">
                                                    Max
                                                </span>
                                                <Input
                                                    name="reactionMax"
                                                    type="number"
                                                    min={1}
                                                    max={30}
                                                    required
                                                    defaultValue={
                                                        party?.burst.max ?? 5
                                                    }
                                                    className="w-24"
                                                />
                                            </label>
                                        </div>
                                    </fieldset>
                                    <Button
                                        type="submit"
                                        variant="secondary"
                                        className="self-start"
                                    >
                                        Save
                                    </Button>
                                </form>
                            </div>
                        </section>
                    )}
                    {isHost && (
                        <section className="flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="text-xl font-bold">
                                    Fallback playlists
                                </h2>
                                <Button
                                    variant="ghost"
                                    onClick={async () => {
                                        try {
                                            await shuffleFallback({ roomId })
                                        } catch (error) {
                                            toast.error(
                                                error instanceof Error
                                                    ? error.message
                                                    : "Couldn't shuffle fallback",
                                            )
                                            return
                                        }
                                        toast.success("Shuffled fallback")
                                    }}
                                >
                                    <ShuffleIcon /> Shuffle
                                </Button>
                            </div>
                            <div className="rounded-lg border border-white/20 bg-white/10 p-3 shadow-md">
                                <FallbackPlaylists
                                    roomId={roomId}
                                    playlists={
                                        room.settings.fallbackPlaylists ?? []
                                    }
                                />
                            </div>
                        </section>
                    )}
                </main>
            </div>
        </div>
    )
}
