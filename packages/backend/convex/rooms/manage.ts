import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { Doc, Id } from "../_generated/dataModel"
import { MutationCtx, query } from "../_generated/server"
import { internalMutation, mutation } from "../functions"
import { callerIsPartyAdmin } from "../nicknames"

const fallbackPlaylist = v.object({
    playlistId: v.string(),
    title: v.string(),
    author: v.optional(v.string()),
    songs: v.array(
        v.object({
            videoId: v.string(),
            title: v.string(),
            artist: v.string(),
            duration: v.number(),
        }),
    ),
})

const ROOM_LIFETIME_MS = 1000 * 60 * 60 * 24 * 7
const FALLBACK_SONG_LIMIT = 1000

/*
 * Create a room
 */
export const createRoom = mutation({
    args: {
        maxSongsPerUser: v.number(),
        fallbackPlaylist: v.optional(fallbackPlaylist),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) {
            throw new Error("User not found")
        }

        const user = await ctx.db.get("users", userId as Id<"users">)
        if (!user) {
            throw new Error("User not found")
        }
        let code: string
        // Generate a unique room code
        do {
            code = generateRoomCode(4)
        } while (
            await ctx.db
                .query("rooms")
                .withIndex("by_code", (q) => q.eq("code", code))
                .unique()
        )

        const roomId = await ctx.db.insert("rooms", {
            host: userId as Id<"users">,
            code,
            expiresAt: Date.now() + ROOM_LIFETIME_MS,
            settings: {
                maxSongsPerUser: args.maxSongsPerUser,
            },
        })

        if (args.fallbackPlaylist) {
            const room = await ctx.db.get("rooms", roomId)
            if (!room) {
                throw new Error("Room not found")
            }
            await insertFallbackPlaylist(ctx, room, args.fallbackPlaylist)
        }
        return { roomId, code }
    },
})

export const listOwnRooms = query({
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) {
            return null
        }

        const rooms = (await callerIsPartyAdmin(ctx))
            ? ctx.db.query("rooms")
            : ctx.db
                  .query("rooms")
                  .withIndex("by_host", (q) =>
                      q.eq("host", userId as Id<"users">),
                  )

        const list = await rooms.collect()

        return await Promise.all(
            list.map(async (room) => {
                const host = await ctx.db.get("users", room.host)
                return { ...room, hostNickname: host?.nickname ?? null }
            }),
        )
    },
})

export const deleteRoom = mutation({
    args: {
        roomId: v.id("rooms"),
    },
    handler: async (ctx, args) => {
        await assertCanManageRoom(ctx, args.roomId)
        // queuedSongs are removed by the rooms delete trigger.
        await ctx.db.delete("rooms", args.roomId)
    },
})

export const updateRoomSettings = mutation({
    args: {
        roomId: v.id("rooms"),
        maxSongsPerUser: v.optional(v.number()),
        skipVotesNeeded: v.optional(v.number()),
        reactionsOn: v.optional(v.boolean()),
        reactionMin: v.optional(v.number()),
        reactionMax: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const room = await assertCanManageRoom(ctx, args.roomId)
        const settings = { ...room.settings }

        if (args.maxSongsPerUser !== undefined) {
            const maxSongsPerUser = Math.floor(args.maxSongsPerUser)
            if (!Number.isFinite(maxSongsPerUser) || maxSongsPerUser < 1) {
                throw new Error("Max songs per user must be at least 1")
            }
            settings.maxSongsPerUser = maxSongsPerUser
        }

        if (args.skipVotesNeeded !== undefined) {
            const skipVotesNeeded = Math.floor(args.skipVotesNeeded)
            if (
                !Number.isFinite(skipVotesNeeded) ||
                skipVotesNeeded < 1 ||
                skipVotesNeeded > 20
            ) {
                throw new Error("Skip votes must be from 1 to 20")
            }
            settings.skipVotesNeeded = skipVotesNeeded
        }

        if (args.reactionMin !== undefined || args.reactionMax !== undefined) {
            const reactionMin = Math.floor(
                args.reactionMin ?? room.settings.reactionMin ?? 3,
            )
            const reactionMax = Math.floor(
                args.reactionMax ?? room.settings.reactionMax ?? 5,
            )
            if (
                !Number.isFinite(reactionMin) ||
                !Number.isFinite(reactionMax) ||
                reactionMin < 1 ||
                reactionMax > 30 ||
                reactionMin > reactionMax
            ) {
                throw new Error(
                    "Reaction emojis must be from 1 to 30, and the minimum cannot exceed the maximum",
                )
            }
            settings.reactionMin = reactionMin
            settings.reactionMax = reactionMax
        }

        if (args.reactionsOn !== undefined) {
            settings.reactionsOn = args.reactionsOn
        }

        await ctx.db.patch("rooms", args.roomId, { settings })
    },
})

export const addFallbackPlaylist = mutation({
    args: {
        roomId: v.id("rooms"),
        playlist: fallbackPlaylist,
    },
    handler: async (ctx, args) => {
        const room = await assertCanManageRoom(ctx, args.roomId)
        return await insertFallbackPlaylist(ctx, room, args.playlist)
    },
})

export const removeFallbackPlaylist = mutation({
    args: {
        roomId: v.id("rooms"),
        playlistId: v.string(),
    },
    handler: async (ctx, args) => {
        const room = await assertCanManageRoom(ctx, args.roomId)
        const playlists = room.settings.fallbackPlaylists ?? []
        if (
            !playlists.some(
                (playlist) => playlist.playlistId === args.playlistId,
            )
        ) {
            throw new Error("Playlist not found")
        }

        const queued = await queuedSongsForRoom(ctx, args.roomId)
        for (const song of queued) {
            if (song.fallbackPlaylistId === args.playlistId) {
                await ctx.db.delete("queuedSongs", song._id)
            }
        }

        await ctx.db.patch("rooms", args.roomId, {
            settings: {
                ...room.settings,
                fallbackPlaylists: playlists.filter(
                    (playlist) => playlist.playlistId !== args.playlistId,
                ),
            },
        })
    },
})

async function assertCanManageRoom(ctx: MutationCtx, roomId: Id<"rooms">) {
    const room = await ctx.db.get("rooms", roomId)
    if (!room) {
        throw new Error("Room not found")
    }
    const userId = await getAuthUserId(ctx)
    if (!userId) {
        throw new Error("User not found")
    }
    if (
        room.host !== (userId as Id<"users">) &&
        !(await callerIsPartyAdmin(ctx))
    ) {
        throw new Error("User is not the host of the room")
    }
    return room
}

async function queuedSongsForRoom(ctx: MutationCtx, roomId: Id<"rooms">) {
    return await ctx.db
        .query("queuedSongs")
        .withIndex("by_room_order_type", (q) => q.eq("room", roomId))
        .collect()
}

async function insertFallbackPlaylist(
    ctx: MutationCtx,
    room: Doc<"rooms">,
    playlist: {
        playlistId: string
        title: string
        author?: string
        songs: {
            videoId: string
            title: string
            artist: string
            duration: number
        }[]
    },
) {
    if (
        room.settings.fallbackPlaylists?.some(
            (existing) => existing.playlistId === playlist.playlistId,
        )
    ) {
        throw new Error("Playlist already added")
    }

    const queued = await queuedSongsForRoom(ctx, room._id)
    const taken = new Set(queued.map((song) => song.videoId))
    if (room.currentSong) taken.add(room.currentSong.videoId)

    const unique: typeof playlist.songs = []
    for (const song of playlist.songs) {
        if (!song.videoId || taken.has(song.videoId)) continue
        taken.add(song.videoId)
        unique.push(song)
    }

    const roomLeft =
        FALLBACK_SONG_LIMIT -
        queued.filter((song) => song.type === "fallback").length
    if (roomLeft <= 0) {
        throw new Error("Fallback queue is full")
    }
    const toInsert = unique.slice(0, roomLeft)
    if (toInsert.length === 0) {
        throw new Error("These songs are already in the room")
    }

    // order 0 keeps new fallback tracks behind guest tracks, which use the same
    // order and sort first by type. They are not written into currentSong.
    for (const song of toInsert) {
        await ctx.db.insert("queuedSongs", {
            room: room._id,
            type: "fallback",
            fallbackPlaylistId: playlist.playlistId,
            videoId: song.videoId,
            title: song.title,
            artist: song.artist,
            duration: song.duration,
            order: 0,
        })
    }

    await ctx.db.patch("rooms", room._id, {
        settings: {
            ...room.settings,
            fallbackPlaylists: [
                ...(room.settings.fallbackPlaylists ?? []),
                {
                    playlistId: playlist.playlistId,
                    title: playlist.title,
                    ...(playlist.author ? { author: playlist.author } : {}),
                    trackCount: toInsert.length,
                },
            ],
        },
    })
    return { added: toInsert.length }
}

export const cleanExpiredRooms = internalMutation({
    handler: async (ctx) => {
        const expiredRooms = await ctx.db
            .query("rooms")
            .withIndex("by_expires_at", (q) => q.lt("expiresAt", Date.now()))
            .collect()

        for (const room of expiredRooms) {
            await ctx.db.delete("rooms", room._id)
        }
    },
})

function generateRoomCode(length: number) {
    let result = ""
    const characters = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789" // Uppercase characters and numbers (minus O and 0 to avoid confusion)
    const charactersLength = characters.length
    for (let i = 0; i < length; i++) {
        result += characters.charAt(
            Math.floor(Math.random() * charactersLength),
        )
    }
    return result
}
