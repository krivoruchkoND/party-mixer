import { getURL } from "@party-mixer/ui/lib/utils"
import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/host/", "/room/"],
        },
        sitemap: getURL("sitemap.xml"),
    }
}
