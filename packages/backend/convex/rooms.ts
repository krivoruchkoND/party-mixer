import { getAuthUserId } from "@convex-dev/auth/server"
import { ConvexError, v } from "convex/values"
import { Id } from "./_generated/dataModel"
import { query } from "./_generated/server"
import { mutation } from "./functions"
import { callerIsPartyAdmin } from "./nicknames"
import {
    bumpPlayed,
    newPlayId,
    promoteNext,
    withContributor,
} from "./rooms/controls"

/**
 * This query returns the queue of songs for a room.
 *
 * It does not include the current song. That is stored in the room object.
 */
export const getQueue = query({
    args: {
        roomId: v.id("rooms"),
        cursor: v.optional(v.string()),
        numItems: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const queue = await ctx.db
            .query("queuedSongs")
            .withIndex("by_room_order_type", (q) => q.eq("room", args.roomId))
            .order("asc")
            .take(args.numItems ?? 5)

        return await Promise.all(
            queue.map(async (song) => {
                if (!song.addedBy) {
                    return {
                        ...song,
                        addedByNickname: undefined,
                    }
                }
                const user = await ctx.db.get("users", song.addedBy)
                return {
                    ...song,
                    addedByNickname: user?.nickname,
                }
            }),
        )
    },
})

export const getRoom = query({
    args: {
        roomId: v.id("rooms"),
    },
    handler: async (ctx, args) => {
        const room = await ctx.db.get("rooms", args.roomId)
        return room
    },
})

export const getRoomByCode = query({
    args: {
        code: v.string(),
    },
    handler: async (ctx, args) => {
        const room = await ctx.db
            .query("rooms")
            .withIndex("by_code", (q) => q.eq("code", args.code))
            .unique()

        if (!room) {
            return null
        }

        const currentSongUser = room?.currentSong?.addedBy
            ? await ctx.db.get("users", room.currentSong.addedBy)
            : null

        // Enrich the query result with the nickname of the user who added the current song
        return {
            ...room,
            currentSong: room.currentSong
                ? {
                      ...room.currentSong,
                      addedByNickname: currentSongUser?.nickname,
                  }
                : null,
        }
    },
})

export const isHost = query({
    args: {
        roomId: v.id("rooms"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) {
            return false
        }

        const room = await ctx.db.get("rooms", args.roomId)
        if (!room) {
            throw new Error("Room not found")
        }

        return room.host === (userId as Id<"users">)
    },
})

export const getSongsLeftToAdd = query({
    args: {
        roomId: v.id("rooms"),
    },
    handler: async (ctx, args) => {
        const room = await ctx.db.get("rooms", args.roomId)
        if (!room) {
            throw new Error("Room not found")
        }

        const userId = await getAuthUserId(ctx)
        if (!userId) {
            return null
        }

        const userSongs = await ctx.db
            .query("queuedSongs")
            .withIndex("by_added_by_room", (q) =>
                q.eq("addedBy", userId as Id<"users">).eq("room", args.roomId),
            )
            .collect()

        return room.settings.maxSongsPerUser - userSongs.length
    },
})

export const addSong = mutation({
    args: {
        roomId: v.id("rooms"),
        videoId: v.string(),
        title: v.string(),
        artist: v.string(),
        duration: v.number(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) {
            throw new Error("User not found")
        }

        const user = await ctx.db.get("users", userId as Id<"users">)
        if (!user?.nickname) {
            throw new ConvexError("NICKNAME_REQUIRED")
        }

        const room = await ctx.db.get("rooms", args.roomId)
        if (!room) {
            throw new Error("Room not found")
        }

        // check that user has still songs left to add
        const userSongs = await ctx.db
            .query("queuedSongs")
            .withIndex("by_added_by_room", (q) =>
                q.eq("addedBy", userId as Id<"users">).eq("room", args.roomId),
            )
            .collect()

        const isRoomHost =
            room.host === (userId as Id<"users">) ||
            (await callerIsPartyAdmin(ctx))
        if (userSongs.length >= room.settings.maxSongsPerUser && !isRoomHost) {
            throw new ConvexError("SONG_LIMIT_REACHED")
        }

        // Reject a song that is already playing or already in the queue.
        // A duplicate would be popped twice and look like it vanished.
        const queuedSongs = await ctx.db
            .query("queuedSongs")
            .withIndex("by_room_order_type", (q) => q.eq("room", args.roomId))
            .collect()
        if (
            room.currentSong?.videoId === args.videoId ||
            queuedSongs.some((song) => song.videoId === args.videoId)
        ) {
            throw new ConvexError("DUPLICATE_SONG")
        }

        // Decide whether this song should become the current song or to queue it
        const requester = userId as Id<"users">
        if (!room.currentSong) {
            // room currently has no song playing, so this song should become the current song
            await ctx.db.patch("rooms", args.roomId, {
                currentSong: {
                    addedBy: requester,
                    videoId: args.videoId,
                    title: args.title,
                    artist: args.artist,
                    duration: args.duration,
                    type: "addedByUser",
                    playId: newPlayId(),
                },
                contributors: bumpPlayed(room.contributors, requester),
            })
        } else {
            // room currently has a song playing, so this song should be queued
            await ctx.db.insert("queuedSongs", {
                room: args.roomId,
                videoId: args.videoId,
                type: "addedByUser",
                addedBy: requester,
                title: args.title,
                artist: args.artist,
                duration: args.duration,
                order: 0,
            })
            const contributors = withContributor(room.contributors, requester)
            if (contributors !== room.contributors) {
                await ctx.db.patch("rooms", args.roomId, { contributors })
            }
        }
    },
})

/**
 * This mutation pops the current song from the queue and makes the next song the current song.
 *
 * It should be called by the host when the current song finished playing.
 */
export const popSong = mutation({
    args: {
        roomId: v.id("rooms"),
    },
    handler: async (ctx, args) => {
        const room = await ctx.db.get("rooms", args.roomId)
        if (!room) {
            throw new Error("Room not found")
        }

        // Check if the user is the host of the room
        const userId = await getAuthUserId(ctx)
        if (!userId) {
            throw new Error("User not found")
        }
        if (room.host !== (userId as Id<"users">)) {
            throw new Error("User is not the host of the room")
        }

        await promoteNext(ctx, args.roomId)
    },
})
