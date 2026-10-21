import { getURL } from "@party-mixer/ui/lib/utils"
import QRCode from "react-qr-code"

export function RoomQRCode({ roomCode }: { roomCode: string }) {
    const url = getURL(`/room/${roomCode}?utm_source=qr-code`)

    return (
        <div className="size-28 shrink-0 rounded-lg bg-white p-1.5">
            <QRCode
                value={url}
                size={128}
                className="h-auto w-full"
                style={{
                    imageRendering: "pixelated",
                }}
                viewBox="0 0 128 128"
            />
        </div>
    )
}
