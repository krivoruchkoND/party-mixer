"use client"

import { GrainGradient } from "@paper-design/shaders-react"

export function LandingBackground({
    speed = 0.75,
    muted = false,
}: {
    speed?: number
    muted?: boolean
}) {
    return (
        // The -inset-8 is to make the background slightly larger than the screen to avoid any bleeding
        <div className="fixed -inset-8 -z-10 overflow-hidden bg-black">
            <GrainGradient
                style={{ height: "100%" }}
                colorBack={muted ? "hsl(250, 25%, 5%)" : "hsl(0, 0%, 0%)"}
                softness={muted ? 0.7 : 0.5}
                intensity={muted ? 0.28 : 0.5}
                noise={0.25}
                frame={1000 * 8}
                shape="corners"
                offsetX={0}
                offsetY={0}
                scale={1}
                rotation={0}
                speed={speed}
                colors={
                    muted
                        ? [
                              "hsl(267, 42%, 22%)",
                              "hsl(286, 32%, 16%)",
                              "hsl(200, 35%, 14%)",
                              "hsl(250, 38%, 12%)",
                          ]
                        : [
                              "hsl(267, 100%, 50%)",
                              "hsl(286, 100%, 60%)",
                              "hsl(195, 100%, 50%)",
                              "hsl(250, 100%, 50%)",
                          ]
                }
            />
        </div>
    )
}
