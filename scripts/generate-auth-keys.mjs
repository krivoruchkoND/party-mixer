import { generateKeyPairSync } from "node:crypto"
import { writeFileSync } from "node:fs"

const destination = process.argv[2]
if (!destination) {
    throw new Error("Usage: generate-auth-keys.mjs <output-file>")
}

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
})
const pkcs8 = privateKey
    .export({ type: "pkcs8", format: "pem" })
    .toString()
    .trim()
    .replaceAll("\n", " ")
const jwk = publicKey.export({ format: "jwk" })
const jwks = JSON.stringify({
    keys: [{ use: "sig", alg: "RS256", ...jwk }],
})

writeFileSync(
    destination,
    `JWT_PRIVATE_KEY=${shellQuote(pkcs8)}\nJWKS=${shellQuote(jwks)}\n`,
)

function shellQuote(value) {
    return `'${value.replaceAll("'", "'\\''")}'`
}
