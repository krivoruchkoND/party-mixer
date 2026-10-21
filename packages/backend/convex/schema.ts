import { authTables } from "@convex-dev/auth/server"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

// This is a shared object defining the fields for a song.
const song = {
    addedBy: v.optional(v.id("users")),
    videoId: v.string(),
    // These exact names of types are important
    // because the queue query will use them to sort the songs.
    // Calling user added songs "addedByUser" places them in front of fallback songs.
    type: v.union(v.literal("addedByUser"), v.literal("fallback")),

    title: v.string(),
    artist: v.string(),
    duration: v.number(),
    // Set when a song starts playing. Skip votes and likes match this play, not the video.
    playId: v.optional(v.string()),
}

export default defineSchema({
    ...authTables,
    users: defineTable({
        // Default fields
        name: v.optional(v.string()),
        image: v.optional(v.string()),
        email: v.optional(v.string()),
        emailVerificationTime: v.optional(v.number()),
        phone: v.optional(v.string()),
        phoneVerificationTime: v.optional(v.number()),
        isAnonymous: v.optional(v.boolean()),

        // Custom fields
        nickname: v.optional(v.string()),
    }).index("email", ["email"]),
    rooms: defineTable({
        host: v.id("users"),
        code: v.string(),
        expiresAt: v.number(),
        currentSong: v.optional(v.object(song)),
        settings: v.object({
            maxSongsPerUser: v.number(),
            fallbackPlaylists: v.optional(
                v.array(
                    v.object({
                        playlistId: v.string(),
                        title: v.string(),
                        author: v.optional(v.string()),
                        trackCount: v.number(),
                    }),
                ),
            ),
            // Guests needed to skip the current song. Missing means 3.
            skipVotesNeeded: v.optional(v.number()),
            // Floating reactions on the host. Missing means on, 3 to 5 emojis.
            reactionsOn: v.optional(v.boolean()),
            reactionMin: v.optional(v.number()),
            reactionMax: v.optional(v.number()),
        }),
        // Guest-track requesters, reactions their tracks received, and how many of their tracks have started.
        contributors: v.optional(
            v.array(
                v.object({
                    userId: v.id("users"),
                    likes: v.number(),
                    poop: v.optional(v.number()),
                    sparkle: v.optional(v.number()),
                    // Tracks that reached now-playing. Missing means 0.
                    played: v.optional(v.number()),
                }),
            ),
        ),
        skipVotes: v.optional(
            v.object({
                playId: v.string(),
                userIds: v.array(v.id("users")),
            }),
        ),
        likes: v.optional(
            v.object({
                playId: v.string(),
                userIds: v.array(v.id("users")),
            }),
        ),
        reactions: v.optional(
            v.object({
                playId: v.string(),
                votes: v.array(
                    v.object({
                        userId: v.id("users"),
                        kind: v.union(
                            v.literal("heart"),
                            v.literal("poop"),
                            v.literal("sparkle"),
                        ),
                        // Presses of this reaction. Missing means 1.
                        taps: v.optional(v.number()),
                        // Counts toward the requester's score. Missing means it counted. False is screen-only.
                        scored: v.optional(v.boolean()),
                    }),
                ),
            }),
        ),
    })
        .index("by_code", ["code"])
        .index("by_host", ["host"])
        .index("by_expires_at", ["expiresAt"]),
    queuedSongs: defineTable({
        room: v.id("rooms"),
        order: v.number(),
        // Set on fallback tracks so one playlist can be removed on its own.
        fallbackPlaylistId: v.optional(v.string()),
        ...song,
    })
        .index("by_room_order_type", ["room", "order", "type"])
        .index("by_added_by_room", ["addedBy", "room"]),
})
