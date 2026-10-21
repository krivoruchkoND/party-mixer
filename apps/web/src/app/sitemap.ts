import { getURL } from "@party-mixer/ui/lib/utils"
import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date()

    return [
        {
            url: getURL(),
            lastModified: now,
            priority: 1,
        },
        {
            url: getURL("host"),
            lastModified: now,
            priority: 0.9,
        },
    ]
}
