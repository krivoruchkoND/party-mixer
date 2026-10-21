import type { NextConfig } from "next"
import path from "node:path"

const nextConfig: NextConfig = {
    outputFileTracingRoot: path.join(__dirname, "../../"),
    transpilePackages: ["@party-mixer/ui", "@party-mixer/backend"],
    rewrites: async () => [
        {
            source: "/flask/:path*",
            destination: "http://127.0.0.1:5328/flask/:path*",
        },
    ],
}

export default nextConfig
