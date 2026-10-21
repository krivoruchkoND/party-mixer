"use client"

import { useAuthedMutation } from "@/lib/auth"
import { api } from "@party-mixer/backend/convex/_generated/api"
import { Input } from "@party-mixer/ui/components/input"
import { SubmitButton } from "@party-mixer/ui/components/submit-button"
import { toast } from "sonner"

export function NicknameForm({
    defaultNickname = "",
}: {
    defaultNickname?: string
}) {
    const setNickname = useAuthedMutation(api.nicknames.setNickname)

    return (
        <form
            action={async (formData) => {
                try {
                    await setNickname({
                        nickname: String(formData.get("nickname") ?? ""),
                    })
                } catch (error) {
                    toast.error(
                        error instanceof Error
                            ? error.message
                            : "Couldn't save nickname",
                    )
                    return
                }
                toast.success("Nickname saved")
            }}
        >
            <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                    type="text"
                    name="nickname"
                    minLength={3}
                    maxLength={16}
                    required
                    defaultValue={defaultNickname}
                    placeholder="Enter nickname..."
                    className="bg-background text-foreground sm:max-w-3xs"
                />
                <SubmitButton className="border border-white/20">
                    {defaultNickname ? "Change nickname" : "Set nickname"}
                </SubmitButton>
            </div>
        </form>
    )
}
