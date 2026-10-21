"use client"

import { MaximizeIcon } from "lucide-react"
import { useCallback, useEffect, useSyncExternalStore } from "react"

type FullscreenDocument = Document & {
    webkitFullscreenElement?: Element | null
    webkitExitFullscreen?: () => void
}

type FullscreenRoot = HTMLElement & {
    webkitRequestFullscreen?: () => void
}

function fullscreenElement() {
    const doc = document as FullscreenDocument
    return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null
}

function subscribeFullscreen(onStoreChange: () => void) {
    document.addEventListener("fullscreenchange", onStoreChange)
    document.addEventListener("webkitfullscreenchange", onStoreChange)
    return () => {
        document.removeEventListener("fullscreenchange", onStoreChange)
        document.removeEventListener("webkitfullscreenchange", onStoreChange)
    }
}

function fullscreenSnapshot() {
    return fullscreenElement() !== null
}

function serverSnapshot() {
    return false
}

function subscribeSupported() {
    return () => {}
}

function supportedSnapshot() {
    const root = document.documentElement as FullscreenRoot
    return (
        typeof root.requestFullscreen === "function" ||
        typeof root.webkitRequestFullscreen === "function"
    )
}

export function Fullscreen() {
    const isFullscreen = useSyncExternalStore(
        subscribeFullscreen,
        fullscreenSnapshot,
        serverSnapshot,
    )
    const supported = useSyncExternalStore(
        subscribeSupported,
        supportedSnapshot,
        serverSnapshot,
    )

    const toggleFullscreen = useCallback(async () => {
        const doc = document as FullscreenDocument
        const root = document.documentElement as FullscreenRoot
        try {
            if (!fullscreenElement()) {
                if (root.requestFullscreen) {
                    await root.requestFullscreen({ navigationUI: "hide" })
                } else {
                    root.webkitRequestFullscreen?.()
                }
            } else if (doc.exitFullscreen) {
                await doc.exitFullscreen()
            } else {
                doc.webkitExitFullscreen?.()
            }
        } catch (error) {
            console.error("Error toggling fullscreen:", error)
        }
    }, [])

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (
                event.key.toLowerCase() !== "f" ||
                event.ctrlKey ||
                event.metaKey ||
                event.altKey
            ) {
                return
            }
            const target = event.target as HTMLElement
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
            ) {
                return
            }
            event.preventDefault()
            void toggleFullscreen()
        }

        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [toggleFullscreen])

    if (!supported || isFullscreen) return null

    return (
        <button
            type="button"
            aria-label="Full screen"
            onClick={() => {
                void toggleFullscreen()
            }}
            className="fixed top-3 right-3 z-40 flex size-11 items-center justify-center rounded-lg border border-white/25 bg-black/50 text-white"
        >
            <MaximizeIcon className="size-5" />
        </button>
    )
}
