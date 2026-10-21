import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { Id } from "./_generated/dataModel"
import { MutationCtx, QueryCtx, query } from "./_generated/server"
import { mutation } from "./functions"
import { isPartyAdminNickname } from "./partyAdmin"

export async function callerIsPartyAdmin(ctx: QueryCtx | MutationCtx) {
    const userId = await getAuthUserId(ctx)
    if (!userId) return false
    const user = await ctx.db.get("users", userId as Id<"users">)
    return isPartyAdminNickname(user?.nickname)
}

export const setNickname = mutation({
    args: {
        nickname: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) {
            throw new Error("User not found")
        }

        const nickname = args.nickname.trim()
        if (nickname.length === 0) {
            await ctx.db.patch("users", userId, { nickname: undefined })
            return
        }
        if (nickname.length < 3 || nickname.length > 16) {
            throw new Error("Nickname must be between 3 and 16 characters long")
        }

        await ctx.db.patch("users", userId, { nickname })
    },
})

export const getNickname = query({
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) return null
        const user = await ctx.db.get("users", userId)
        return user?.nickname ?? null
    },
})

export const getNicknameByUserId = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get("users", args.userId)
        return user?.nickname
    },
})
