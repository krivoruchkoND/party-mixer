import { getAuthUserId } from "@convex-dev/auth/server"
import { ConvexError, v } from "convex/values"
import { Id } from "../_generated/dataModel"
import { MutationCtx, query } from "../_generated/server"
import { mutation } from "../functions"
import { callerIsPartyAdmin } from "../nicknames"

const SKIP_VOTES_NEEDED = 3

/**
 * This mutation skips to the next song in the queue.
 * If there is no next song, it just stops playing the current song.
 *
 * Only the room host or party admin can use this.
 */
export const skipToNextSong = mutation({
    args: {
        roomId: v.id("rooms"),
    },
    handler: async (ctx, args) => {
        await assertRoomHost(ctx, args.roomId)
        await promoteNext(ctx, args.roomId)
    },
})

export const deleteSong = mutation({
    args: {
        roomId: v.id("rooms"),
        songId: v.id("queuedSongs"),
    },
    handler: async (ctx, args) => {
        await assertRoomHost(ctx, args.roomId)

        const song = await ctx.db.get("queuedSongs", args.songId)
        if (!song) {
            throw new Error("Song not found")
        }

        await ctx.db.delete("queuedSongs", args.songId)
    },
})

export const shuffleFallback = mutation({
    args: {
        roomId: v.id("rooms"),
    },
    handler: async (ctx, args) => {
        await assertRoomHost(ctx, args.roomId)

        const songs = await ctx.db
            .query("queuedSongs")
            .withIndex("by_room_order_type", (q) => q.eq("room", args.roomId))
            .collect()
        const fallbacks = songs.filter((song) => song.type === "fallback")
        if (fallbacks.length === 0) {
            throw new Error("No fallback songs to shuffle")
        }

        // Guest tracks stay ahead: their orders are never raised, and every
        // fallback order is placed strictly after the highest guest order.
        const userOrders = songs
            .filter((song) => song.type === "addedByUser")
            .map((song) => song.order)
        const start = userOrders.length > 0 ? Math.max(...userOrders) + 1 : 1

        for (let i = fallbacks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            const swap = fallbacks[i]
            fallbacks[i] = fallbacks[j]
            fallbacks[j] = swap
        }
        for (let i = 0; i < fallbacks.length; i++) {
            await ctx.db.patch("queuedSongs", fallbacks[i]._id, {
                order: start + i,
            })
        }
    },
})

export const playQueuedSongNext = mutation({
    args: {
        roomId: v.id("rooms"),
        songId: v.id("queuedSongs"),
    },
    handler: async (ctx, args) => {
        await assertRoomHost(ctx, args.roomId)

        // Get the order of the current first song in the queue
        const firstSong = await ctx.db
            .query("queuedSongs")
            .withIndex("by_room_order_type", (q) => q.eq("room", args.roomId))
            .order("asc")
            .first()
        if (!firstSong) {
            throw new Error("No first song found")
        }
        const order = firstSong.order

        // Update the order of the song to be the next one
        await ctx.db.patch("queuedSongs", args.songId, {
            order: order - 1,
        })
    },
})

async function assertRoomHost(ctx: MutationCtx, roomId: Id<"rooms">) {
    const room = await ctx.db.get("rooms", roomId)
    const userId = await getAuthUserId(ctx)
    if (!userId) {
        throw new Error("User not found")
    }
    if (
        room?.host !== (userId as Id<"users">) &&
        !(await callerIsPartyAdmin(ctx))
    ) {
        throw new Error("User is not the host of the room")
    }

    return room
}

type Contributor = {
    userId: Id<"users">
    likes: number
    poop?: number
    sparkle?: number
    played?: number
}

type ReactionKind = "heart" | "poop" | "sparkle"

export function newPlayId() {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export function withContributor(
    list: Contributor[] | undefined,
    userId: Id<"users"> | undefined,
) {
    if (!userId) return list
    const contributors = list ?? []
    if (contributors.some((contributor) => contributor.userId === userId)) {
        return contributors
    }
    return [...contributors, { userId, likes: 0 }]
}

export function bumpPlayed(
    list: Contributor[] | undefined,
    userId: Id<"users"> | undefined,
) {
    if (!userId) return list
    return withContributor(list, userId)?.map((contributor) =>
        contributor.userId === userId
            ? { ...contributor, played: (contributor.played ?? 0) + 1 }
            : contributor,
    )
}

export async function promoteNext(ctx: MutationCtx, roomId: Id<"rooms">) {
    const room = await ctx.db.get("rooms", roomId)
    if (!room) {
        throw new Error("Room not found")
    }

    const leaving =
        room.currentSong?.type === "addedByUser"
            ? room.currentSong.addedBy
            : undefined
    const nextSong = await ctx.db
        .query("queuedSongs")
        .withIndex("by_room_order_type", (q) => q.eq("room", roomId))
        .order("asc")
        .first()
    const arriving =
        nextSong?.type === "addedByUser" ? nextSong.addedBy : undefined
    const contributors = arriving
        ? bumpPlayed(withContributor(room.contributors, leaving), arriving)
        : withContributor(room.contributors, leaving)
    const contributorPatch =
        contributors !== room.contributors ? { contributors } : {}

    if (!nextSong) {
        await ctx.db.patch("rooms", roomId, {
            currentSong: undefined,
            skipVotes: undefined,
            reactions: undefined,
            ...contributorPatch,
        })
        return
    }

    const { addedBy, type, videoId, title, artist, duration } = nextSong
    await ctx.db.patch("rooms", roomId, {
        currentSong: {
            addedBy,
            type,
            videoId,
            title,
            artist,
            duration,
            playId: newPlayId(),
        },
        skipVotes: undefined,
        reactions: undefined,
        ...contributorPatch,
    })
    await ctx.db.delete("queuedSongs", nextSong._id)
}

async function requireNickname(ctx: MutationCtx) {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
        throw new Error("User not found")
    }
    const user = await ctx.db.get("users", userId as Id<"users">)
    if (!user?.nickname) {
        throw new ConvexError("NICKNAME_REQUIRED")
    }
    return userId as Id<"users">
}

export const voteSkip = mutation({
    args: {
        roomId: v.id("rooms"),
    },
    handler: async (ctx, args) => {
        const userId = await requireNickname(ctx)
        const room = await ctx.db.get("rooms", args.roomId)
        if (!room?.currentSong) {
            throw new Error("No song playing")
        }

        const playId = room.currentSong.playId ?? newPlayId()
        const votes =
            room.skipVotes?.playId === playId ? [...room.skipVotes.userIds] : []
        if (votes.includes(userId)) return
        votes.push(userId)

        const needed = room.settings.skipVotesNeeded ?? SKIP_VOTES_NEEDED
        if (votes.length >= needed) {
            await promoteNext(ctx, args.roomId)
            return
        }

        await ctx.db.patch("rooms", args.roomId, {
            currentSong: { ...room.currentSong, playId },
            skipVotes: { playId, userIds: votes },
        })
    },
})

export const reactToSong = mutation({
    args: {
        roomId: v.id("rooms"),
        kind: v.union(
            v.literal("heart"),
            v.literal("poop"),
            v.literal("sparkle"),
        ),
    },
    handler: async (ctx, args) => {
        const userId = await requireNickname(ctx)
        const room = await ctx.db.get("rooms", args.roomId)
        const song = room?.currentSong
        if (!room || !song) {
            throw new Error("No song playing")
        }
        if (song.type === "addedByUser" && song.addedBy === userId) {
            throw new Error("You can't react to your own song")
        }

        const playId = song.playId ?? newPlayId()
        const votes =
            room.reactions?.playId === playId ? [...room.reactions.votes] : []
        const mine = votes.filter((vote) => vote.userId === userId)
        const same = mine.find((vote) => vote.kind === args.kind)
        const alreadyScored = mine.some((vote) => vote.scored !== false)
        const scoreable =
            song.type === "addedByUser" &&
            !!song.addedBy &&
            song.addedBy !== userId
        const willScore = scoreable && !alreadyScored
        // Extra taps only exist to float on the host screen.
        if (!willScore && room.settings.reactionsOn === false) return

        const contributors = willScore
            ? withContributor(room.contributors, song.addedBy)?.map(
                  (contributor) =>
                      contributor.userId === song.addedBy
                          ? bumpReaction(contributor, args.kind)
                          : contributor,
              )
            : undefined

        if (same) {
            await ctx.db.patch("rooms", args.roomId, {
                currentSong: { ...song, playId },
                reactions: {
                    playId,
                    votes: votes.map((vote) =>
                        vote.userId === userId && vote.kind === args.kind
                            ? {
                                  ...vote,
                                  taps: (vote.taps ?? 1) + 1,
                                  scored: vote.scored !== false || willScore,
                              }
                            : vote,
                    ),
                },
                ...(contributors ? { contributors } : {}),
            })
            return
        }

        votes.push({
            userId,
            kind: args.kind,
            taps: 1,
            scored: willScore,
        })
        await ctx.db.patch("rooms", args.roomId, {
            currentSong: { ...song, playId },
            reactions: { playId, votes },
            ...(contributors ? { contributors } : {}),
        })
    },
})

function bumpReaction(
    contributor: Contributor,
    kind: ReactionKind,
): Contributor {
    if (kind === "heart") {
        return { ...contributor, likes: contributor.likes + 1 }
    }
    if (kind === "poop") {
        return { ...contributor, poop: (contributor.poop ?? 0) + 1 }
    }
    return { ...contributor, sparkle: (contributor.sparkle ?? 0) + 1 }
}

export const getParty = query({
    args: {
        roomId: v.id("rooms"),
    },
    handler: async (ctx, args) => {
        const room = await ctx.db.get("rooms", args.roomId)
        if (!room) return null

        const me = (await getAuthUserId(ctx)) as Id<"users"> | null
        const playId = room.currentSong?.playId
        const skipUserIds =
            playId && room.skipVotes?.playId === playId
                ? room.skipVotes.userIds
                : []
        const song = room.currentSong
        const reactionVotes =
            playId && room.reactions?.playId === playId
                ? room.reactions.votes
                : []
        const legacyHearts =
            playId && room.likes?.playId === playId
                ? room.likes.userIds.filter(
                      (userId) =>
                          !reactionVotes.some((vote) => vote.userId === userId),
                  )
                : []
        const reactionList = [
            ...reactionVotes.map((vote) => ({
                userId: vote.userId,
                kind: vote.kind,
                taps: vote.taps ?? 1,
                scored: vote.scored !== false,
            })),
            ...legacyHearts.map((userId) => ({
                userId,
                kind: "heart" as const,
                taps: 1,
                scored: true,
            })),
        ]
        const mine = me
            ? (reactionList.find(
                  (vote) => vote.userId === me && vote.scored !== false,
              )?.kind ?? null)
            : null
        const scores = new Map<
            Id<"users">,
            { heart: number; poop: number; sparkle: number; played: number }
        >()
        for (const contributor of room.contributors ?? []) {
            scores.set(contributor.userId, {
                heart: contributor.likes,
                poop: contributor.poop ?? 0,
                sparkle: contributor.sparkle ?? 0,
                played: contributor.played ?? 0,
            })
        }
        const mention = (userId: Id<"users"> | undefined) => {
            if (userId && !scores.has(userId)) {
                scores.set(userId, { heart: 0, poop: 0, sparkle: 0, played: 0 })
            }
        }
        if (song?.type === "addedByUser") mention(song.addedBy)
        // shortcut: reads the whole queue to find requesters; split this if a room holds hundreds of fallback tracks
        const queued = await ctx.db
            .query("queuedSongs")
            .withIndex("by_room_order_type", (q) => q.eq("room", args.roomId))
            .collect()
        const waiting = new Map<Id<"users">, number>()
        for (const queuedSong of queued) {
            if (queuedSong.type !== "addedByUser" || !queuedSong.addedBy)
                continue
            mention(queuedSong.addedBy)
            waiting.set(
                queuedSong.addedBy,
                (waiting.get(queuedSong.addedBy) ?? 0) + 1,
            )
        }

        const people = await Promise.all(
            [...scores].map(async ([userId, score]) => {
                const user = await ctx.db.get("users", userId)
                return {
                    userId,
                    nickname: user?.nickname ?? "unknown",
                    ...score,
                    ordered: (waiting.get(userId) ?? 0) + score.played,
                }
            }),
        )
        people.sort(
            (a, b) =>
                b.heart - a.heart ||
                b.sparkle - a.sparkle ||
                a.nickname.localeCompare(b.nickname),
        )

        return {
            playId: playId ?? null,
            skip: {
                count: skipUserIds.length,
                needed: room.settings.skipVotesNeeded ?? SKIP_VOTES_NEEDED,
                voted: Boolean(me && skipUserIds.includes(me)),
            },
            reaction: {
                canReact: Boolean(
                    me &&
                    song &&
                    !(
                        song.type === "addedByUser" &&
                        song.addedBy &&
                        song.addedBy === me
                    ),
                ),
                mine,
            },
            reactions: reactionList,
            burst: {
                on: room.settings.reactionsOn !== false,
                min: room.settings.reactionMin ?? 3,
                max: room.settings.reactionMax ?? 5,
            },
            people,
        }
    },
})
