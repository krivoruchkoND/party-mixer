"use client"

import { NicknameForm } from "@/components/auth/nickname-form"
import { useAuthedMutation } from "@/lib/auth"
import { api } from "@party-mixer/backend/convex/_generated/api"
import { Button } from "@party-mixer/ui/components/button"
import { useQuery } from "convex/react"
import { useState } from "react"
import { toast } from "sonner"

export function LandingNickname() {
    const nickname = useQuery(api.nicknames.getNickname)
    const clearNickname = useAuthedMutation(api.nicknames.setNickname)
    const [clearing, setClearing] = useState(false)
    if (nickname === undefined) return null

    return (
        <div className="flex flex-col gap-2 border-t border-white/15 pt-4">
            <p className="text-sm text-white/80">
                {nickname ? (
                    <>
                        Nickname: <b>{nickname}</b>
                    </>
                ) : (
                    "Pick a nickname"
                )}
            </p>
            <NicknameForm
                key={nickname ?? ""}
                defaultNickname={nickname ?? ""}
            />
            {nickname && (
                <Button
                    type="button"
                    variant="outline"
                    className="border-white/20"
                    disabled={clearing}
                    onClick={async () => {
                        setClearing(true)
                        try {
                            await clearNickname({ nickname: "" })
                        } catch (error) {
                            toast.error(
                                error instanceof Error
                                    ? error.message
                                    : "Couldn't clear nickname",
                            )
                            setClearing(false)
                            return
                        }
                        toast.success("Nickname cleared")
                        setClearing(false)
                    }}
                >
                    Clear nickname
                </Button>
            )}
        </div>
    )
}
