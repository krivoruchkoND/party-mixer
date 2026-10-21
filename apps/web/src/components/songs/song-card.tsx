"use client"

import { Doc } from "@party-mixer/backend/convex/_generated/dataModel"
import { cn } from "@party-mixer/ui/lib/utils"
import { ImageWithFallback } from "../image-with-fallback"

export function SongCard({
    song,
}: {
    song: Doc<"queuedSongs"> & { addedByNickname?: string }
}) {
    return (
        <div
            className={cn(
                "group relative flex flex-col gap-2 rounded-lg border border-white/20 bg-white/10 p-3 shadow-md transition-all",
            )}
        >
            <div className="flex items-center gap-3">
                <ImageWithFallback
                    src={`https://i.ytimg.com/vi_webp/${song.videoId}/mqdefault.webp`}
                    width={128}
                    height={128}
                    alt={`${song.title}`}
                    className="aspect-video h-16 shrink-0 rounded-lg border border-white/20 object-cover"
                    unoptimized
                />
                <div className="min-w-0 flex-1">
                    <h4 className="line-clamp-2 text-base leading-snug font-semibold text-shadow-md">
                        {song.title}
                    </h4>
                    <p className="line-clamp-1 text-sm text-gray-100 text-shadow-sm">
                        {song.artist}
                    </p>
                </div>
            </div>
            {song.addedByNickname && (
                <p className="text-sm text-white/70">
                    Added by {song.addedByNickname}
                </p>
            )}
            {/* {onDelete && (
                <div className="absolute top-0 right-0 z-10 hidden group-hover:block">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation()
                            onDelete()
                        }}
                    >
                        <Trash2Icon className="size-4" />
                    </Button>
                </div>
            )} */}
        </div>
    )
}
